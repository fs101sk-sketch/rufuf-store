-- Majlis digital game: protected question bank, buyer entitlements, and order claims.
-- The public GitHub Pages frontend never receives admin or service credentials.

create extension if not exists pgcrypto with schema extensions;

insert into private.store_admin_emails (email, role, active)
values ('fs101sk@gmail.com', 'owner', true)
on conflict (email) do update
set role = excluded.role,
    active = excluded.active;

create table if not exists public.majlis_categories (
  id text primary key,
  name text not null,
  icon text not null default '🎯',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.majlis_questions (
  id text primary key,
  category_id text not null references public.majlis_categories(id) on delete cascade,
  tier smallint not null check (tier between 0 and 2),
  question_text text not null,
  answer_text text not null,
  audio_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.majlis_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  order_id text not null unique references public.orders(id) on delete restrict,
  username text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.majlis_purchase_claims (
  order_id text primary key references public.orders(id) on delete cascade,
  token_hash bytea not null unique,
  user_id uuid references auth.users(id) on delete set null,
  username text unique,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists majlis_questions_category_tier_idx
  on public.majlis_questions (category_id, tier)
  where active;
create index if not exists majlis_entitlements_active_idx
  on public.majlis_entitlements (user_id)
  where active;

alter table public.majlis_categories enable row level security;
alter table public.majlis_questions enable row level security;
alter table public.majlis_entitlements enable row level security;
alter table public.majlis_purchase_claims enable row level security;

create or replace function private.has_majlis_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_store_admin())
    or exists (
      select 1
      from public.majlis_entitlements as e
      where e.user_id = (select auth.uid())
        and e.active
    );
$$;

revoke all on function private.has_majlis_access() from public, anon, authenticated;
grant execute on function private.has_majlis_access() to authenticated;

drop policy if exists majlis_categories_read on public.majlis_categories;
create policy majlis_categories_read on public.majlis_categories
  for select to authenticated
  using (active and (select private.has_majlis_access()));

drop policy if exists majlis_categories_admin on public.majlis_categories;
create policy majlis_categories_admin on public.majlis_categories
  for all to authenticated
  using ((select private.is_store_admin()))
  with check ((select private.is_store_admin()));

drop policy if exists majlis_questions_read on public.majlis_questions;
create policy majlis_questions_read on public.majlis_questions
  for select to authenticated
  using (active and (select private.has_majlis_access()));

drop policy if exists majlis_questions_admin on public.majlis_questions;
create policy majlis_questions_admin on public.majlis_questions
  for all to authenticated
  using ((select private.is_store_admin()))
  with check ((select private.is_store_admin()));

drop policy if exists majlis_entitlements_own_read on public.majlis_entitlements;
create policy majlis_entitlements_own_read on public.majlis_entitlements
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_store_admin()));

drop policy if exists majlis_entitlements_admin on public.majlis_entitlements;
create policy majlis_entitlements_admin on public.majlis_entitlements
  for all to authenticated
  using ((select private.is_store_admin()))
  with check ((select private.is_store_admin()));

-- Intentionally no client policy for purchase claims. Only the Edge Function's
-- server credential may read them.

revoke all on
  public.majlis_categories,
  public.majlis_questions,
  public.majlis_entitlements,
  public.majlis_purchase_claims
from public, anon, authenticated;

grant select on
  public.majlis_categories,
  public.majlis_questions,
  public.majlis_entitlements
to authenticated;

grant insert, update, delete on
  public.majlis_categories,
  public.majlis_questions,
  public.majlis_entitlements
to authenticated;

create or replace function public.place_majlis_order(
  p_order jsonb,
  p_customer jsonb,
  p_claim_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id text;
  order_number text;
  customer_id text;
  customer_name text;
  customer_phone text;
  customer_email text;
  product_row record;
  payment_row record;
  shipping_row record;
  unit_price numeric;
  vat_rate numeric := 15;
  vat_amount numeric := 0;
  customer_data jsonb;
  order_data jsonb;
  existing_order jsonb;
  expected_hash bytea;
begin
  if p_order is null
     or jsonb_typeof(p_order) <> 'object'
     or jsonb_typeof(p_order->'items') <> 'array'
     or jsonb_array_length(p_order->'items') <> 1
     or p_order#>>'{items,0,pid}' <> 'p_majlis'
     or coalesce((p_order#>>'{items,0,qty}')::integer, 0) <> 1 then
    raise exception 'طلب لعبة المجلس غير صالح' using errcode = '22023';
  end if;

  if p_claim_token is null or p_claim_token !~ '^[0-9a-f]{64}$' then
    raise exception 'رمز استلام اللعبة غير صالح' using errcode = '22023';
  end if;
  expected_hash := extensions.digest(p_claim_token, 'sha256');

  v_order_id := left(coalesce(p_order->>'id', ''), 80);
  if v_order_id !~ '^[A-Za-z0-9_-]{6,80}$' then
    v_order_id := 'o_' || replace(gen_random_uuid()::text, '-', '');
  end if;

  perform pg_advisory_xact_lock(hashtext('rufuf-majlis-order:' || v_order_id));
  select data into existing_order
  from public.orders
  where id = v_order_id;
  if found then
    if not exists (
      select 1
      from public.majlis_purchase_claims as c
      where c.order_id = v_order_id
        and c.token_hash = expected_hash
    ) then
      raise exception 'رمز الطلب لا يطابق الطلب المحفوظ' using errcode = '42501';
    end if;
    return jsonb_build_object(
      'ok', true,
      'order_id', v_order_id,
      'number', existing_order->>'number',
      'total', (existing_order->>'total')::numeric,
      'claim_token', p_claim_token
    );
  end if;

  customer_name := trim(left(coalesce(p_customer->>'name', ''), 100));
  customer_phone := regexp_replace(coalesce(p_customer->>'phone', ''), '[^0-9]', '', 'g');
  if customer_phone ~ '^009665[0-9]{8}$' then
    customer_phone := '0' || substring(customer_phone from 6);
  elsif customer_phone ~ '^9665[0-9]{8}$' then
    customer_phone := '0' || substring(customer_phone from 4);
  elsif customer_phone ~ '^5[0-9]{8}$' then
    customer_phone := '0' || customer_phone;
  end if;
  customer_email := lower(trim(left(coalesce(p_customer->>'email', ''), 160)));

  if char_length(customer_name) < 2
     or customer_phone !~ '^05[0-9]{8}$'
     or customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'أكمل الاسم والجوال والبريد الإلكتروني بشكل صحيح' using errcode = '22023';
  end if;

  select id, data
  into product_row
  from public.products
  where id = 'p_majlis'
    and status = 'active'
  for update;
  if not found then
    raise exception 'لعبة المجلس غير متاحة حاليًا' using errcode = '22023';
  end if;

  unit_price := coalesce(
    nullif(product_row.data->>'salePrice', '')::numeric,
    (product_row.data->>'price')::numeric
  );
  if unit_price <= 0 then
    raise exception 'سعر لعبة المجلس غير صالح' using errcode = '22023';
  end if;

  select data
  into payment_row
  from public.payment_methods
  where data->>'name' = p_order->>'payment'
    and coalesce((data->>'enabled')::boolean, false)
  limit 1;
  if not found then
    raise exception 'طريقة الدفع غير متاحة' using errcode = '22023';
  end if;

  select data
  into shipping_row
  from public.shipping_methods
  where id = 'digital'
    and coalesce((data->>'active')::boolean, false)
  limit 1;
  if not found then
    raise exception 'التسليم الرقمي غير مفعّل' using errcode = '22023';
  end if;

  select coalesce((data->>'vat')::numeric, 15)
  into vat_rate
  from public.settings
  where id = 'main';
  vat_rate := coalesce(vat_rate, 15);
  vat_amount := round(unit_price * vat_rate / (100 + vat_rate), 2);

  select id
  into customer_id
  from public.customers
  where phone = customer_phone
  limit 1;
  if not found then
    customer_id := left(coalesce(p_customer->>'id', ''), 80);
    if customer_id !~ '^[A-Za-z0-9_-]{6,80}$' then
      customer_id := 'u_' || replace(gen_random_uuid()::text, '-', '');
    end if;
  end if;

  customer_data := jsonb_build_object(
    'id', customer_id,
    'name', customer_name,
    'phone', customer_phone,
    'email', customer_email,
    'city', 'رقمي',
    'createdAt', coalesce(p_customer->>'createdAt', now()::text),
    'notes', ''
  );
  insert into public.customers (id, data)
  values (customer_id, customer_data)
  on conflict (id) do update
  set data = excluded.data,
      updated_at = now();

  order_number := '#' || nextval('public.order_number_seq')::text;
  order_data := jsonb_build_object(
    'id', v_order_id,
    'number', order_number,
    'customerId', customer_id,
    'customer', jsonb_build_object(
      'name', customer_name,
      'phone', customer_phone,
      'email', customer_email
    ),
    'city', 'رقمي',
    'address', 'تسليم إلكتروني',
    'items', jsonb_build_array(jsonb_build_object(
      'pid', 'p_majlis',
      'name', product_row.data->>'name',
      'sku', product_row.data->>'sku',
      'price', unit_price,
      'qty', 1,
      'opt', 'ترخيص مستخدم واحد'
    )),
    'subtotal', unit_price,
    'shipping', 0,
    'discount', 0,
    'vat', vat_amount,
    'vatIncluded', true,
    'total', unit_price,
    'shippingMethod', shipping_row.data->>'name',
    'shippingMethodId', 'digital',
    'affiliateCode', '',
    'commission', 0,
    'commissionPaid', false,
    'payment', payment_row.data->>'name',
    'status', 'new',
    'createdAt', now(),
    'timeline', jsonb_build_array(jsonb_build_object(
      't', now(),
      's', 'تم إنشاء الطلب الرقمي — بانتظار تأكيد الدفع'
    )),
    'note', trim(left(coalesce(p_order->>'note', ''), 500))
  );

  insert into public.orders (id, data)
  values (v_order_id, order_data);

  insert into public.majlis_purchase_claims (order_id, token_hash)
  values (v_order_id, expected_hash);

  update public.products
  set data = jsonb_set(
        data,
        '{sold}',
        to_jsonb(coalesce((data->>'sold')::integer, 0) + 1)
      ),
      updated_at = now()
  where id = 'p_majlis';

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'number', order_number,
    'total', unit_price,
    'claim_token', p_claim_token
  );
end
$$;

revoke all on function public.place_majlis_order(jsonb, jsonb, text)
from public, anon, authenticated;
grant execute on function public.place_majlis_order(jsonb, jsonb, text)
to anon, authenticated;

-- Replace only the public product catalog. Keep historical configuration rows
-- for recoverability, but disable them so they cannot appear at checkout.
delete from public.products
where id <> 'p_majlis';

update public.categories
set data = jsonb_set(data, '{active}', 'false'::jsonb),
    updated_at = now()
where id <> 'c_digital';

update public.shipping_methods
set data = jsonb_set(data, '{active}', 'false'::jsonb),
    updated_at = now()
where id <> 'digital';

update public.payment_methods
set data = jsonb_set(data, '{enabled}', 'false'::jsonb),
    updated_at = now()
where id <> 'bank_transfer';

insert into public.categories (id, data)
values (
  'c_digital',
  '{"id":"c_digital","name":"الألعاب الرقمية","slug":"digital-games","icon":"🎮","active":true}'::jsonb
)
on conflict (id) do update
set data = excluded.data,
    updated_at = now();

insert into public.products (id, data)
values (
  'p_majlis',
  jsonb_build_object(
    'id', 'p_majlis',
    'name', 'لعبة المجلس',
    'sku', 'RUF-MAJLIS-001',
    'categoryId', 'c_digital',
    'price', 17,
    'salePrice', 13,
    'cost', 0,
    'stock', 999999,
    'lowStock', 0,
    'desc', 'لعبة أسئلة وتحديات رقمية بروح المجلس، تضم 8 تصنيفات و928 سؤالًا بثلاث درجات صعوبة. تحصل على بيانات دخول خاصة بعد تأكيد الدفع.',
    'images', '[]'::jsonb,
    'options', '[]'::jsonb,
    'status', 'active',
    'featured', true,
    'digital', true,
    'gameUrl', 'https://fs101sk-sketch.github.io/rufuf-store/majlis/',
    'weight', 0,
    'sold', 0,
    'rating', 5,
    'seoTitle', 'لعبة المجلس الرقمية',
    'seoDesc', 'لعبة جماعية رقمية بأسئلة سعودية متنوعة، لفريقين وبثلاث درجات صعوبة.',
    'createdAt', now()
  )
)
on conflict (id) do update
set data = excluded.data,
    updated_at = now();

insert into public.shipping_methods (id, data)
values (
  'digital',
  '{"id":"digital","name":"تسليم رقمي بعد تأكيد الدفع","price":0,"freeOver":0,"eta":"فوري بعد تأكيد الدفع","active":true,"cities":"عبر الإنترنت"}'::jsonb
)
on conflict (id) do update
set data = excluded.data,
    updated_at = now();

insert into public.payment_methods (id, data)
values (
  'bank_transfer',
  '{"id":"bank_transfer","name":"تحويل بنكي — التفعيل بعد تأكيد الدفع","enabled":true,"fee":0}'::jsonb
)
on conflict (id) do update
set data = excluded.data,
    updated_at = now();

insert into public.settings (id, data)
values (
  'main',
  '{
    "storeName":"متجر رفوف",
    "tagline":"منتجات وألعاب رقمية من إنتاجنا",
    "currency":"ر.س",
    "vat":15,
    "vatIncluded":true,
    "phone":"920001234",
    "email":"care@rufuf.sa",
    "address":"المملكة العربية السعودية",
    "cr":"1010XXXXXX",
    "vatNo":"3000000000003",
    "whatsapp":"966500000000",
    "instagram":"rufuf.sa",
    "twitter":"rufuf_sa",
    "tiktok":"rufuf",
    "freeShipOver":0,
    "lowStockAlert":0,
    "ordersPrefix":"#",
    "maintenance":false,
    "affiliateDefaultRate":0,
    "affiliateCookieDays":0,
    "affiliateMinPayout":0,
    "affiliateAutoApprove":false
  }'::jsonb
)
on conflict (id) do update
set data = excluded.data,
    updated_at = now();

update public.affiliates
set data = jsonb_set(data, '{status}', '"paused"'::jsonb),
    updated_at = now();

update public.coupons
set data = jsonb_set(data, '{active}', 'false'::jsonb),
    updated_at = now();

update public.banners
set data = jsonb_set(data, '{active}', 'false'::jsonb),
    updated_at = now()
where id <> 'b_majlis';

insert into public.banners (id, data)
values (
  'b_majlis',
  '{"id":"b_majlis","title":"لعبة المجلس — الآن بـ 13 ر.س بدلًا من 17 ر.س","sub":"928 سؤالًا و8 تصنيفات في لعبة جماعية سعودية","link":"#/product/p_majlis","active":true}'::jsonb
)
on conflict (id) do update
set data = excluded.data,
    updated_at = now();
