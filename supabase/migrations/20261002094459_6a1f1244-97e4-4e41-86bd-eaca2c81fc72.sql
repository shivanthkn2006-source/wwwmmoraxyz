CREATE TABLE public.face_liveness_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nonce text NOT NULL UNIQUE,
  steps text[] NOT NULL,
  purpose text NOT NULL,
  ip_address text,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.face_liveness_challenges TO service_role;
ALTER TABLE public.face_liveness_challenges ENABLE ROW LEVEL SECURITY;
CREATE INDEX face_liveness_challenges_ip_idx ON public.face_liveness_challenges (ip_address, created_at DESC);