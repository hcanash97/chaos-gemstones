do $$
begin
  if not exists (select 1 from pg_type where typname = 'whatsapp_processing_status') then
    create type public.whatsapp_processing_status as enum (
      'pending_review',
      'converted_to_draft',
      'low_confidence_review',
      'archived'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'confidence_tier') then
    create type public.confidence_tier as enum ('high', 'medium', 'low');
  end if;
end $$;

create table if not exists public.whatsapp_intake_messages (
  id uuid primary key default gen_random_uuid(),
  sender_phone text,
  dealer_id uuid references public.profiles(id) on delete set null,
  raw_message_text text not null,
  received_at timestamptz not null default now(),
  processing_status public.whatsapp_processing_status not null default 'pending_review',
  created_at timestamptz not null default now()
);

create table if not exists public.whatsapp_intake_drafts (
  id uuid primary key default gen_random_uuid(),
  intake_message_id uuid not null references public.whatsapp_intake_messages(id) on delete cascade,
  stone_type text,
  shape text,
  carat numeric(8,3),
  color text,
  clarity text,
  cert_lab text,
  cert_number text,
  stock_number text,
  price numeric(12,2),
  currency text not null default 'USD',
  treatment text,
  origin text,
  dimensions text,
  uploaded_media_urls text[] not null default '{}',
  confidence_score public.confidence_tier not null default 'medium',
  missing_fields text[] not null default '{}',
  parsing_diagnostics jsonb not null default '{}'::jsonb,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_intake_messages_status_idx
  on public.whatsapp_intake_messages (processing_status, created_at desc);

create index if not exists whatsapp_intake_messages_dealer_idx
  on public.whatsapp_intake_messages (dealer_id, created_at desc);

create index if not exists whatsapp_intake_drafts_message_idx
  on public.whatsapp_intake_drafts (intake_message_id);

create index if not exists whatsapp_intake_drafts_confidence_idx
  on public.whatsapp_intake_drafts (confidence_score, created_at desc);

alter table public.whatsapp_intake_messages enable row level security;
alter table public.whatsapp_intake_drafts enable row level security;

grant select, insert, update, delete on public.whatsapp_intake_messages to authenticated;
grant select, insert, update, delete on public.whatsapp_intake_drafts to authenticated;
grant all on public.whatsapp_intake_messages to service_role;
grant all on public.whatsapp_intake_drafts to service_role;

drop policy if exists "Admins manage whatsapp intake messages" on public.whatsapp_intake_messages;
create policy "Admins manage whatsapp intake messages"
  on public.whatsapp_intake_messages
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins manage whatsapp intake drafts" on public.whatsapp_intake_drafts;
create policy "Admins manage whatsapp intake drafts"
  on public.whatsapp_intake_drafts
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

notify pgrst, 'reload schema';
