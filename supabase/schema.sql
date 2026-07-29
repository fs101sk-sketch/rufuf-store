-- Rufuf storefront schema for Supabase.
-- Frontend: GitHub Pages. Backend: Supabase Data API + Auth.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.store_admin_emails (
  email text primary key,
  role text not null default 'owner'
    check (role in ('owner', 'admin', 'support', 'stock')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
revoke all on table private.store_admin_emails from public, anon, authenticated;

create or replace function private.is_store_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.store_admin_emails as a
    join auth.users as u on lower(u.email) = lower(a.email)
    where u.id = (select auth.uid())
      and a.active
  );
$$;
revoke all on function private.is_store_admin() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_store_admin() to authenticated;

create table if not exists public.settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  name text generated always as (data->>'name') stored,
  active boolean generated always as (coalesce((data->>'active')::boolean, true)) stored
);

create table if not exists public.products (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  name text generated always as (data->>'name') stored,
  sku text generated always as (data->>'sku') stored,
  category_id text generated always as (data->>'categoryId') stored,
  status text generated always as (data->>'status') stored,
  price numeric generated always as ((data->>'price')::numeric) stored,
  stock integer generated always as ((data->>'stock')::integer) stored
);

create table if not exists public.customers (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  name text generated always as (data->>'name') stored,
  phone text generated always as (data->>'phone') stored
);

create table if not exists public.orders (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  number text generated always as (data->>'number') stored,
  status text generated always as (data->>'status') stored,
  affiliate_code text generated always as (data->>'affiliateCode') stored,
  phone text generated always as (data#>>'{customer,phone}') stored,
  total numeric generated always as ((data->>'total')::numeric) stored,
  created_at text generated always as (data->>'createdAt') stored
);

create table if not exists public.affiliates (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  code text generated always as (data->>'code') stored,
  name text generated always as (data->>'name') stored,
  status text generated always as (data->>'status') stored
);

create table if not exists public.payouts (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  code text generated always as (data->>'code') stored
);

create table if not exists public.shipping_methods (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_methods (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  status text generated always as (data->>'status') stored
);

create table if not exists public.pages (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  slug text generated always as (data->>'slug') stored
);

create table if not exists public.banners (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.staff (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  email text generated always as (data->>'email') stored
);

create table if not exists public.activity_log (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create sequence if not exists public.order_number_seq
  as bigint
  start with 1041
  increment by 1
  no cycle;

create unique index if not exists orders_number_unique_idx
  on public.orders (number);
create index if not exists orders_phone_idx
  on public.orders (phone);
create index if not exists orders_status_created_idx
  on public.orders (status, created_at desc);
create unique index if not exists customers_phone_unique_idx
  on public.customers (phone);
create index if not exists products_status_category_idx
  on public.products (status, category_id);
create unique index if not exists affiliates_code_unique_idx
  on public.affiliates (upper(code));
create unique index if not exists coupons_code_unique_idx
  on public.coupons (upper(code));
create unique index if not exists staff_email_unique_idx
  on public.staff (lower(email))
  where email is not null and email <> '';

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'settings', 'categories', 'products', 'customers', 'orders',
    'affiliates', 'payouts', 'coupons', 'shipping_methods',
    'payment_methods', 'reviews', 'pages', 'banners', 'staff',
    'activity_log'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists store_admin_all on public.%I', table_name);
    execute format(
      'create policy store_admin_all on public.%I for all to authenticated using ((select private.is_store_admin())) with check ((select private.is_store_admin()))',
      table_name
    );
  end loop;
end
$$;

drop policy if exists public_read_settings on public.settings;
create policy public_read_settings on public.settings
  for select to anon
  using (id = 'main');

drop policy if exists public_read_categories on public.categories;
create policy public_read_categories on public.categories
  for select to anon
  using (active);

drop policy if exists public_read_products on public.products;
create policy public_read_products on public.products
  for select to anon
  using (status = 'active');

drop policy if exists public_read_shipping on public.shipping_methods;
create policy public_read_shipping on public.shipping_methods
  for select to anon
  using (coalesce((data->>'active')::boolean, false));

drop policy if exists public_read_payments on public.payment_methods;
create policy public_read_payments on public.payment_methods
  for select to anon
  using (coalesce((data->>'enabled')::boolean, false));

drop policy if exists public_read_reviews on public.reviews;
create policy public_read_reviews on public.reviews
  for select to anon
  using (status = 'approved');

drop policy if exists public_read_pages on public.pages;
create policy public_read_pages on public.pages
  for select to anon
  using (true);

drop policy if exists public_read_banners on public.banners;
create policy public_read_banners on public.banners
  for select to anon
  using (coalesce((data->>'active')::boolean, false));

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on
  public.settings,
  public.categories,
  public.products,
  public.shipping_methods,
  public.payment_methods,
  public.reviews,
  public.pages,
  public.banners
to anon, authenticated;
grant select, insert, update, delete on
  public.settings,
  public.categories,
  public.products,
  public.customers,
  public.orders,
  public.affiliates,
  public.payouts,
  public.coupons,
  public.shipping_methods,
  public.payment_methods,
  public.reviews,
  public.pages,
  public.banners,
  public.staff,
  public.activity_log
to authenticated;
revoke all on sequence public.order_number_seq from public, anon, authenticated;

create or replace function public.current_store_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select a.role
  from private.store_admin_emails as a
  join auth.users as u on lower(u.email) = lower(a.email)
  where u.id = (select auth.uid())
    and a.active
  limit 1;
$$;

create or replace function public.ref_click(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  affiliate_row record;
begin
  if p_code is null or char_length(p_code) > 40 then
    return null;
  end if;

  select id, data
  into affiliate_row
  from public.affiliates
  where upper(code) = upper(trim(p_code))
    and status = 'active'
  limit 1;

  if not found then
    return null;
  end if;

  update public.affiliates
  set data = jsonb_set(
        data,
        '{clicks}',
        to_jsonb(coalesce((data->>'clicks')::integer, 0) + 1)
      ),
      updated_at = now()
  where id = affiliate_row.id;

  return jsonb_build_object(
    'code', affiliate_row.data->>'code',
    'name', affiliate_row.data->>'name'
  );
end
$$;

create or replace function public.check_coupon(p_code text, p_sub numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  coupon_row record;
begin
  if p_code is null or char_length(p_code) > 40 then
    return jsonb_build_object('ok', false, 'msg', 'الكود غير صالح');
  end if;

  select data
  into coupon_row
  from public.coupons
  where upper(code) = upper(trim(p_code))
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'msg', 'الكود غير صالح');
  end if;
  if coalesce((coupon_row.data->>'active')::boolean, false) is not true then
    return jsonb_build_object('ok', false, 'msg', 'الكود غير مفعّل');
  end if;
  if nullif(coupon_row.data->>'expires', '') is not null
     and (coupon_row.data->>'expires')::timestamptz < now() then
    return jsonb_build_object('ok', false, 'msg', 'انتهت صلاحية الكود');
  end if;
  if coalesce((coupon_row.data->>'limit')::integer, 0) > 0
     and coalesce((coupon_row.data->>'used')::integer, 0)
       >= (coupon_row.data->>'limit')::integer then
    return jsonb_build_object('ok', false, 'msg', 'انتهى عدد مرات الاستخدام');
  end if;
  if greatest(coalesce(p_sub, 0), 0)
       < coalesce((coupon_row.data->>'minOrder')::numeric, 0) then
    return jsonb_build_object('ok', false, 'msg', 'قيمة الطلب أقل من الحد الأدنى');
  end if;

  return jsonb_build_object(
    'ok', true,
    'coupon', jsonb_build_object(
      'code', coupon_row.data->>'code',
      'type', coupon_row.data->>'type',
      'value', coalesce((coupon_row.data->>'value')::numeric, 0),
      'minOrder', coalesce((coupon_row.data->>'minOrder')::numeric, 0)
    )
  );
end
$$;

create or replace function public.place_order(p_order jsonb, p_customer jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_id text;
  order_number text;
  customer_id text;
  customer_name text;
  customer_phone text;
  customer_email text;
  customer_city text;
  customer_address text;
  order_note text;
  item jsonb;
  product_row record;
  shipping_row record;
  payment_row record;
  coupon_row record;
  affiliate_data jsonb;
  affiliate_code text := '';
  quantity integer;
  unit_price numeric;
  subtotal numeric := 0;
  shipping_cost numeric := 0;
  discount numeric := 0;
  vat_rate numeric := 15;
  vat_amount numeric := 0;
  total_amount numeric := 0;
  commission numeric := 0;
  sanitized_items jsonb := '[]'::jsonb;
  customer_data jsonb;
  order_data jsonb;
  existing_order jsonb;
begin
  if p_order is null
     or jsonb_typeof(p_order) <> 'object'
     or jsonb_typeof(p_order->'items') <> 'array'
     or jsonb_array_length(p_order->'items') < 1
     or jsonb_array_length(p_order->'items') > 30 then
    raise exception 'بيانات الطلب غير صالحة' using errcode = '22023';
  end if;

  order_id := left(coalesce(p_order->>'id', ''), 80);
  if order_id !~ '^[A-Za-z0-9_-]{6,80}$' then
    order_id := 'o_' || replace(gen_random_uuid()::text, '-', '');
  end if;

  perform pg_advisory_xact_lock(hashtext('rufuf-order:' || order_id));
  select data into existing_order
  from public.orders
  where id = order_id;
  if found then
    return jsonb_build_object(
      'ok', true,
      'order_id', order_id,
      'number', existing_order->>'number',
      'total', (existing_order->>'total')::numeric
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
  customer_city := trim(left(coalesce(p_order->>'city', ''), 80));
  customer_address := trim(left(coalesce(p_order->>'address', ''), 300));
  order_note := trim(left(coalesce(p_order->>'note', ''), 500));

  if char_length(customer_name) < 2
     or customer_phone !~ '^05[0-9]{8}$'
     or char_length(customer_city) < 2
     or char_length(customer_address) < 5 then
    raise exception 'أكمل الاسم والجوال والمدينة والعنوان بشكل صحيح' using errcode = '22023';
  end if;

  for item in
    select value from jsonb_array_elements(p_order->'items')
  loop
    quantity := greatest(least(coalesce((item->>'qty')::integer, 0), 20), 0);
    if quantity < 1 then
      raise exception 'كمية المنتج غير صالحة' using errcode = '22023';
    end if;

    select id, data
    into product_row
    from public.products
    where id = item->>'pid'
      and status = 'active'
    for update;

    if not found then
      raise exception 'أحد المنتجات لم يعد متاحًا' using errcode = '22023';
    end if;
    if coalesce((product_row.data->>'stock')::integer, 0) < quantity then
      raise exception 'الكمية المطلوبة غير متوفرة للمنتج: %', product_row.data->>'name'
        using errcode = '22023';
    end if;

    unit_price := coalesce(
      nullif(product_row.data->>'salePrice', '')::numeric,
      (product_row.data->>'price')::numeric
    );
    subtotal := subtotal + (unit_price * quantity);
    sanitized_items := sanitized_items || jsonb_build_array(
      jsonb_build_object(
        'pid', product_row.id,
        'name', product_row.data->>'name',
        'sku', product_row.data->>'sku',
        'price', unit_price,
        'qty', quantity,
        'opt', left(coalesce(item->>'opt', ''), 100)
      )
    );

    update public.products
    set data = jsonb_set(
          jsonb_set(
            data,
            '{stock}',
            to_jsonb((data->>'stock')::integer - quantity)
          ),
          '{sold}',
          to_jsonb(coalesce((data->>'sold')::integer, 0) + quantity)
        ),
        updated_at = now()
    where id = product_row.id;
  end loop;

  select data
  into shipping_row
  from public.shipping_methods
  where id = p_order->>'shippingMethodId'
    and coalesce((data->>'active')::boolean, false)
  limit 1;
  if not found then
    select data
    into shipping_row
    from public.shipping_methods
    where coalesce((data->>'active')::boolean, false)
    order by id
    limit 1;
  end if;
  if not found then
    raise exception 'لا توجد طريقة شحن متاحة' using errcode = '22023';
  end if;

  shipping_cost := coalesce((shipping_row.data->>'price')::numeric, 0);
  if coalesce((shipping_row.data->>'freeOver')::numeric, 0) > 0
     and subtotal >= (shipping_row.data->>'freeOver')::numeric then
    shipping_cost := 0;
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

  if nullif(trim(p_order->>'affiliateCode'), '') is not null then
    select data
    into affiliate_data
    from public.affiliates
    where upper(code) = upper(trim(p_order->>'affiliateCode'))
      and status = 'active'
    limit 1;
    if found then
      discount := round(subtotal * 0.05, 2);
      affiliate_code := affiliate_data->>'code';
      if affiliate_data->>'commissionType' = 'percent' then
        commission := round(
          subtotal * coalesce((affiliate_data->>'commissionValue')::numeric, 0) / 100,
          2
        );
      else
        commission := coalesce((affiliate_data->>'commissionValue')::numeric, 0);
      end if;
    end if;
  end if;

  if nullif(trim(p_order->>'coupon'), '') is not null then
    select id, data
    into coupon_row
    from public.coupons
    where upper(code) = upper(trim(p_order->>'coupon'))
    for update;

    if found
       and coalesce((coupon_row.data->>'active')::boolean, false)
       and (
         nullif(coupon_row.data->>'expires', '') is null
         or (coupon_row.data->>'expires')::timestamptz >= now()
       )
       and (
         coalesce((coupon_row.data->>'limit')::integer, 0) = 0
         or coalesce((coupon_row.data->>'used')::integer, 0)
           < (coupon_row.data->>'limit')::integer
       )
       and subtotal >= coalesce((coupon_row.data->>'minOrder')::numeric, 0) then
      if coupon_row.data->>'type' = 'percent' then
        discount := discount
          + round(subtotal * coalesce((coupon_row.data->>'value')::numeric, 0) / 100, 2);
      elsif coupon_row.data->>'type' = 'fixed' then
        discount := discount + coalesce((coupon_row.data->>'value')::numeric, 0);
      elsif coupon_row.data->>'type' = 'shipping' then
        shipping_cost := 0;
      end if;

      update public.coupons
      set data = jsonb_set(
            data,
            '{used}',
            to_jsonb(coalesce((data->>'used')::integer, 0) + 1)
          ),
          updated_at = now()
      where id = coupon_row.id;
    end if;
  end if;

  discount := least(discount, subtotal);
  select coalesce((data->>'vat')::numeric, 15)
  into vat_rate
  from public.settings
  where id = 'main';
  vat_rate := coalesce(vat_rate, 15);
  vat_amount := round(greatest(subtotal - discount + shipping_cost, 0) * vat_rate / 100, 2);
  total_amount := round(greatest(subtotal - discount + shipping_cost + vat_amount, 0), 2);

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
    'city', customer_city,
    'createdAt', coalesce(p_customer->>'createdAt', now()::text),
    'notes', ''
  );
  insert into public.customers (id, data)
  values (customer_id, customer_data)
  on conflict (id) do update
  set data = excluded.data,
      updated_at = now();

  order_number := '#' || nextval('public.order_number_seq')::text;
  order_data := p_order || jsonb_build_object(
    'id', order_id,
    'number', order_number,
    'customerId', customer_id,
    'customer', jsonb_build_object(
      'name', customer_name,
      'phone', customer_phone,
      'email', customer_email
    ),
    'city', customer_city,
    'address', customer_address,
    'items', sanitized_items,
    'subtotal', round(subtotal, 2),
    'shipping', round(shipping_cost, 2),
    'discount', round(discount, 2),
    'vat', vat_amount,
    'total', total_amount,
    'shippingMethod', shipping_row.data->>'name',
    'shippingMethodId', p_order->>'shippingMethodId',
    'affiliateCode', affiliate_code,
    'commission', commission,
    'commissionPaid', false,
    'payment', payment_row.data->>'name',
    'status', 'new',
    'createdAt', now(),
    'timeline', jsonb_build_array(jsonb_build_object('t', now(), 's', 'تم إنشاء الطلب')),
    'note', order_note
  );

  insert into public.orders (id, data)
  values (order_id, order_data);

  return jsonb_build_object(
    'ok', true,
    'order_id', order_id,
    'number', order_number,
    'total', total_amount
  );
end
$$;

create or replace function public.track_order(p_number text, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row record;
  clean_number text;
  clean_phone text;
begin
  clean_number := replace(trim(coalesce(p_number, '')), '#', '');
  clean_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if clean_phone ~ '^009665[0-9]{8}$' then
    clean_phone := '0' || substring(clean_phone from 6);
  elsif clean_phone ~ '^9665[0-9]{8}$' then
    clean_phone := '0' || substring(clean_phone from 4);
  elsif clean_phone ~ '^5[0-9]{8}$' then
    clean_phone := '0' || clean_phone;
  end if;
  if clean_number = ''
     or char_length(clean_number) > 30
     or clean_phone !~ '^05[0-9]{8}$' then
    return null;
  end if;

  select data
  into order_row
  from public.orders
  where replace(number, '#', '') = clean_number
    and phone = clean_phone
  order by created_at desc
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'number', order_row.data->>'number',
    'status', order_row.data->>'status',
    'total', order_row.data->>'total',
    'city', order_row.data->>'city',
    'address', order_row.data->>'address',
    'createdAt', order_row.data->>'createdAt'
  );
end
$$;

revoke all on function public.current_store_role() from public, anon, authenticated;
revoke all on function public.ref_click(text) from public, anon, authenticated;
revoke all on function public.check_coupon(text, numeric) from public, anon, authenticated;
revoke all on function public.place_order(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.track_order(text, text) from public, anon, authenticated;

grant execute on function public.current_store_role() to authenticated;
grant execute on function public.ref_click(text) to anon, authenticated;
grant execute on function public.check_coupon(text, numeric) to anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb) to anon, authenticated;
grant execute on function public.track_order(text, text) to anon, authenticated;
