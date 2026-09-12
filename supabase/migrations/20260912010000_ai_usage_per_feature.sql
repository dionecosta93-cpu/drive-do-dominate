-- ai_usage passa a contar por feature também (chat do assistente tem cota própria,
-- separada de voz/busca de livro) -- antes era um contador único por usuário/dia.
ALTER TABLE public.ai_usage ADD COLUMN IF NOT EXISTS feature TEXT NOT NULL DEFAULT 'ai_assistant';

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_pkey;
ALTER TABLE public.ai_usage ADD PRIMARY KEY (user_id, usage_date, feature);
