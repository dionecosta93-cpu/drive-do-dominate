-- ===========================================================================
-- Forja — schema para um projeto Supabase novo (Caminho C).
-- Junta as 3 migrations de supabase/migrations/ na ordem correta.
-- Seguro rodar mais de uma vez (usa IF EXISTS / IF NOT EXISTS / OR REPLACE).
--
-- Como usar:
--   Painel do projeto -> SQL Editor -> New query -> cole TUDO -> Run.
--   Deve terminar com "Success. No rows returned".
--
-- Observação: se o projeto já tiver um template com a função public.handle_new_user,
-- este script a substitui (Forja usa a tabela `profiles`, não `user_profiles`).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1) profiles + user_data + triggers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS public.user_data (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_data TO authenticated;
GRANT ALL ON public.user_data TO service_role;
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own data" ON public.user_data;
CREATE POLICY "Users manage own data" ON public.user_data FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
DROP TRIGGER IF EXISTS user_data_updated_at ON public.user_data;
CREATE TRIGGER user_data_updated_at BEFORE UPDATE ON public.user_data
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2) tranca as funções internas
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) task_occurrences
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_occurrences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_local_id text NOT NULL,
  task_name text NOT NULL,
  occurrence_date date NOT NULL,
  scheduled_time time without time zone,
  completed_time time without time zone,
  timing_delta_minutes integer,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em-andamento', 'concluida', 'adiada', 'cancelada')),
  spent_seconds integer NOT NULL DEFAULT 0 CHECK (spent_seconds >= 0),
  pauses integer NOT NULL DEFAULT 0 CHECK (pauses >= 0),
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_local_id, occurrence_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_occurrences TO authenticated;
GRANT ALL ON public.task_occurrences TO service_role;
ALTER TABLE public.task_occurrences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own task occurrences" ON public.task_occurrences;
CREATE POLICY "Users can manage their own task occurrences"
ON public.task_occurrences
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS task_occurrences_user_date_idx
ON public.task_occurrences (user_id, occurrence_date DESC);
DROP TRIGGER IF EXISTS task_occurrences_set_updated_at ON public.task_occurrences;
CREATE TRIGGER task_occurrences_set_updated_at
BEFORE UPDATE ON public.task_occurrences
FOR EACH ROW
EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- 4) Planos reais (fim do modo demo) + limite diário de uso de IA
-- ---------------------------------------------------------------------------
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

CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT current_date,
  feature TEXT NOT NULL DEFAULT 'ai_assistant',
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date, feature)
);
ALTER TABLE public.ai_usage ADD COLUMN IF NOT EXISTS feature TEXT NOT NULL DEFAULT 'ai_assistant';
ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_pkey;
ALTER TABLE public.ai_usage ADD PRIMARY KEY (user_id, usage_date, feature);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
DROP POLICY IF EXISTS "Users read own ai usage" ON public.ai_usage;
CREATE POLICY "Users read own ai usage" ON public.ai_usage FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, plan, source) VALUES (NEW.id, 'free', 'manual')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created_plan ON auth.users;
CREATE TRIGGER on_auth_user_created_plan AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_plan();
REVOKE EXECUTE ON FUNCTION public.handle_new_user_plan() FROM PUBLIC, anon, authenticated;

-- Recarrega o cache de schema do PostgREST (senão a API pode continuar dando 404).
NOTIFY pgrst, 'reload schema';
