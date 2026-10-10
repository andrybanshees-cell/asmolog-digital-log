ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS shoot_date text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS production_company text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS director text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dp text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS first_ac text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS second_ac text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS base_isos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS eis jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.takes
  ADD COLUMN IF NOT EXISTS clip text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS slate text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS card text NOT NULL DEFAULT '';
COMMENT ON COLUMN public.takes.sound_roll IS 'DEPRECATED: removed from log sheet';

ALTER TABLE public.metadata_presets
  ADD COLUMN IF NOT EXISTS base_isos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS eis jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email text NOT NULL,
  user_id uuid,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','editor','viewer')),
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.project_role_for(_project uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.projects WHERE id = _project AND owner_id = auth.uid()) THEN 'admin'
    ELSE (SELECT m.role FROM public.project_members m
          WHERE m.project_id = _project
            AND (m.user_id = auth.uid() OR lower(m.email) = lower(coalesce(auth.jwt()->>'email','')))
          ORDER BY CASE m.role WHEN 'admin' THEN 1 WHEN 'editor' THEN 2 ELSE 3 END
          LIMIT 1)
  END
$$;

CREATE POLICY "members read" ON public.project_members FOR SELECT TO authenticated
  USING (public.project_role_for(project_id) IS NOT NULL);
CREATE POLICY "admins insert members" ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (public.project_role_for(project_id) = 'admin');
CREATE POLICY "admins update members" ON public.project_members FOR UPDATE TO authenticated
  USING (public.project_role_for(project_id) = 'admin');
CREATE POLICY "admins delete members" ON public.project_members FOR DELETE TO authenticated
  USING (public.project_role_for(project_id) = 'admin');

DROP POLICY IF EXISTS "own projects" ON public.projects;
CREATE POLICY "projects read" ON public.projects FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.project_role_for(id) IS NOT NULL);
CREATE POLICY "projects insert" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "projects update" ON public.projects FOR UPDATE TO authenticated
  USING (public.project_role_for(id) = 'admin');
CREATE POLICY "projects delete" ON public.projects FOR DELETE TO authenticated
  USING (public.project_role_for(id) = 'admin');

DROP POLICY IF EXISTS "own takes" ON public.takes;
CREATE POLICY "takes read" ON public.takes FOR SELECT TO authenticated
  USING (public.project_role_for(project_id) IS NOT NULL);
CREATE POLICY "takes insert" ON public.takes FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.project_role_for(project_id) IN ('admin','editor'));
CREATE POLICY "takes update" ON public.takes FOR UPDATE TO authenticated
  USING (public.project_role_for(project_id) IN ('admin','editor'));
CREATE POLICY "takes delete" ON public.takes FOR DELETE TO authenticated
  USING (public.project_role_for(project_id) IN ('admin','editor'));

ALTER TABLE public.takes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.takes;