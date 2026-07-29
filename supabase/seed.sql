-- Rufuf digital storefront seed.
-- The full protected question bank is deployed directly to Supabase and is not
-- committed to this public repository.

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
  '{
    "id":"p_majlis",
    "name":"لعبة المجلس",
    "sku":"RUF-MAJLIS-001",
    "categoryId":"c_digital",
    "price":17,
    "salePrice":13,
    "cost":0,
    "stock":999999,
    "lowStock":0,
    "desc":"لعبة أسئلة وتحديات رقمية بروح المجلس، تضم 8 تصنيفات و928 سؤالًا بثلاث درجات صعوبة. تحصل على بيانات دخول خاصة بعد تأكيد الدفع.",
    "images":[],
    "options":[],
    "status":"active",
    "featured":true,
    "digital":true,
    "gameUrl":"https://fs101sk-sketch.github.io/rufuf-store/majlis/",
    "weight":0,
    "sold":0,
    "rating":5,
    "seoTitle":"لعبة المجلس الرقمية",
    "seoDesc":"لعبة جماعية رقمية بأسئلة سعودية متنوعة، لفريقين وبثلاث درجات صعوبة."
  }'::jsonb
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
