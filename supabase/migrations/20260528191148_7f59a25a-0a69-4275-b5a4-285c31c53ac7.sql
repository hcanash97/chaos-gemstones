ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

-- Allow admins to update reports (mark reviewed/dismissed)
DROP POLICY IF EXISTS "admins update reports" ON public.reports;
CREATE POLICY "admins update reports"
ON public.reports
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));