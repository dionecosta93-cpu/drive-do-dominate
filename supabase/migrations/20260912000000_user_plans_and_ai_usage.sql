-- Planos reais (fim do modo demo) + limite diário de uso de IA.
--
-- Deliberadamente em tabelas separadas de `profiles`/`user_data`: o usuário
-- autenticado tem UPDATE na própria linha dessas duas, e o plano NÃO pode ser
-- algo que o próprio cliente consiga escrever (senão qualquer um se promove
-- a Premium client-side). Aqui só existe policy de SELECT para o dono da
-- linha — toda escrita é feita pelo service role (bypassa RLS).

CREATE TABLE IF NOT EXISTS public.user_plans (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'premium')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'trial', 'pagamento')),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_plans TO authenticated;
GRANT ALL ON public.user_plans TO service_role;

DROP POLICY IF EXISTS "Users read own plan" ON public.user_plans;
CREATE POLICY "Users read own plan" ON public.user_plans FOR SELECT USING (auth.uid() = user_id);
-- Sem policy de INSERT/UPDATE/DELETE para authenticated: só service_role escreve.

-- Contador de uso diário de IA (assistente, transcrição, voz, busca de livro).
-- Reseta sozinho porque a chave inclui a data (current_date do dia da chamada).
CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT current_date,
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;

DROP POLICY IF EXISTS "Users read own ai usage" ON public.ai_usage;
CREATE POLICY "Users read own ai usage" ON public.ai_usage FOR SELECT USING (auth.uid() = user_id);
-- Sem policy de escrita para authenticated: só o servidor (service role) incrementa,
-- depois de já ter processado a chamada de IA — o cliente nunca reporta o próprio uso.

-- Plano padrão para conta nova: junta com o handle_new_user existente (profiles/user_data).
CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, plan, source)
  VALUES (NEW.id, 'free', 'manual')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_plan ON auth.users;
CREATE TRIGGER on_auth_user_created_plan AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_plan();

REVOKE EXECUTE ON FUNCTION public.handle_new_user_plan() FROM PUBLIC, anon, authenticated;
