CREATE TABLE IF NOT EXISTS public.stone_request_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.stone_requests(id) ON DELETE CASCADE,
  dealer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, dealer_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stone_request_responses TO authenticated;
GRANT ALL ON public.stone_request_responses TO service_role;

ALTER TABLE public.stone_request_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dealers insert own responses"
  ON public.stone_request_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = dealer_id);

CREATE POLICY "dealers read own responses"
  ON public.stone_request_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = dealer_id);

CREATE POLICY "jeweller reads responses on own requests"
  ON public.stone_request_responses FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stone_requests r
    WHERE r.id = stone_request_responses.request_id
      AND r.jeweller_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS stone_request_responses_request_idx
  ON public.stone_request_responses (request_id);