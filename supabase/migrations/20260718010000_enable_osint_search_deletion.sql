-- Ensure existing deployments grant the same deletion capability as new ones.
-- This is intentionally a separate migration because the original schema may
-- already have been applied before the OSINT delete control was introduced.
ALTER TABLE public.osint_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_delete_osint_searches" ON public.osint_searches;
CREATE POLICY "anon_delete_osint_searches"
  ON public.osint_searches
  FOR DELETE
  TO anon, authenticated
  USING (true);
