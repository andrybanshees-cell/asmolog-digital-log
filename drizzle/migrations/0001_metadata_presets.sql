CREATE TABLE public.metadata_presets (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  lenses jsonb NOT NULL DEFAULT '[]'::jsonb,
  filters jsonb NOT NULL DEFAULT '[]'::jsonb,
  characters jsonb NOT NULL DEFAULT '[]'::jsonb,
  luts jsonb NOT NULL DEFAULT '[]'::jsonb,
  aspect_ratios jsonb NOT NULL DEFAULT '[]'::jsonb,
  formats jsonb NOT NULL DEFAULT '[]'::jsonb,
  resolutions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metadata_presets TO authenticated;
GRANT ALL ON public.metadata_presets TO service_role;
ALTER TABLE public.metadata_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own presets" ON public.metadata_presets FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);