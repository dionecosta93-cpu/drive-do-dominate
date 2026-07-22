CREATE TABLE public.task_occurrences (
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

CREATE POLICY "Users can manage their own task occurrences"
ON public.task_occurrences
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX task_occurrences_user_date_idx
ON public.task_occurrences (user_id, occurrence_date DESC);

CREATE TRIGGER task_occurrences_set_updated_at
BEFORE UPDATE ON public.task_occurrences
FOR EACH ROW
EXECUTE FUNCTION public.tg_set_updated_at();