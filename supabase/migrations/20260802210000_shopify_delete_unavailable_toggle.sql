alter table public.shopify_connections
  add column if not exists delete_unavailable_products boolean not null default false;

comment on column public.shopify_connections.delete_unavailable_products is
  'When true, Shopify sync deletes products whose stones are no longer in the jeweller feed. When false, sync archives them as drafts.';

notify pgrst, 'reload schema';
