create extension if not exists vector;

create table if not exists public.dhf_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  birth_date date,
  birth_time time,
  birth_lat double precision,
  birth_lng double precision,
  birth_timezone text not null default 'Asia/Kolkata',
  natal_chart jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dhf_profiles TO authenticated;
GRANT ALL ON public.dhf_profiles TO service_role;
ALTER TABLE public.dhf_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dhf_profiles_own" ON public.dhf_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

create table if not exists public.dhf_consciousness_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null,
  raw_query text not null,
  extracted_concepts text[] not null default '{}',
  archetype_influence text,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, DELETE ON public.dhf_consciousness_memory TO authenticated;
GRANT ALL ON public.dhf_consciousness_memory TO service_role;
ALTER TABLE public.dhf_consciousness_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dhf_memory_own" ON public.dhf_consciousness_memory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "dhf_memory_insert_own" ON public.dhf_consciousness_memory FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dhf_memory_delete_own" ON public.dhf_consciousness_memory FOR DELETE TO authenticated USING (auth.uid() = user_id);
create index if not exists dhf_memory_user_idx on public.dhf_consciousness_memory (user_id, created_at desc);
create index if not exists dhf_memory_embedding_idx on public.dhf_consciousness_memory using hnsw (embedding vector_cosine_ops);

create table if not exists public.mmora_feed_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  video_id text not null,
  title text not null,
  channel_title text not null default '',
  thumbnail_url text not null default '',
  triggered_by_query text,
  astrological_tag text,
  relevance_score double precision not null default 1.0,
  is_viewed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, video_id)
);
GRANT SELECT, UPDATE, DELETE ON public.mmora_feed_items TO authenticated;
GRANT ALL ON public.mmora_feed_items TO service_role;
ALTER TABLE public.mmora_feed_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mmora_feed_own" ON public.mmora_feed_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mmora_feed_update_own" ON public.mmora_feed_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mmora_feed_delete_own" ON public.mmora_feed_items FOR DELETE TO authenticated USING (auth.uid() = user_id);
create index if not exists idx_mmora_feed_user on public.mmora_feed_items (user_id, is_viewed, created_at desc);