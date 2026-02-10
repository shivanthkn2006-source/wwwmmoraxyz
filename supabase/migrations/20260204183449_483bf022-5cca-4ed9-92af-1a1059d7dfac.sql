-- Enable vector extension for AI memory (Legal RAG)
create extension if not exists vector;

-- Create the table for Legal Precedents (The "Gold Standards")
create table if not exists public.legal_knowledge_base (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  category text not null,
  embedding vector(1536),
  metadata jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.legal_knowledge_base enable row level security;

-- Policy: Anyone can read legal knowledge (it's reference data)
create policy "Legal knowledge is publicly readable"
  on public.legal_knowledge_base for select
  using (true);

-- Policy: Only admins can insert/update
create policy "Admins can manage legal knowledge"
  on public.legal_knowledge_base for all
  using (public.is_root_admin(auth.uid()));

-- Create the function to search for similar clauses using vector similarity
create or replace function public.match_legal_clauses (
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (
  id uuid,
  content text,
  category text,
  similarity float
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    legal_knowledge_base.id,
    legal_knowledge_base.content,
    legal_knowledge_base.category,
    1 - (legal_knowledge_base.embedding <=> query_embedding) as similarity
  from legal_knowledge_base
  where 1 - (legal_knowledge_base.embedding <=> query_embedding) > match_threshold
  order by legal_knowledge_base.embedding <=> query_embedding
  limit match_count;
end;
$$;