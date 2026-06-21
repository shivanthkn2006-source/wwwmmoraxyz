-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 1: FORCING AGENCY - THE INFINITE LOOP PATCH
-- Enable extensions required for autonomous heartbeat
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests from cron
CREATE EXTENSION IF NOT EXISTS pg_net;