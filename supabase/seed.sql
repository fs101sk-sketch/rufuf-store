-- Seed data for the Rufuf demo storefront.
-- No sample customers or orders are inserted.

insert into public.settings (id, data) values ('main', '{"storeName":"متجر رفوف","tagline":"منتجات مختارة بعناية، تُشحن لكل السعودية","currency":"ر.س","vat":15,"vatIncluded":false,"phone":"920001234","email":"care@rufuf.sa","address":"الرياض — حي الياسمين","cr":"1010XXXXXX","vatNo":"3000000000003","whatsapp":"966500000000","instagram":"rufuf.sa","twitter":"rufuf_sa","tiktok":"rufuf","freeShipOver":300,"lowStockAlert":5,"ordersPrefix":"#","maintenance":false,"affiliateDefaultRate":10,"affiliateCookieDays":30,"affiliateMinPayout":200,"affiliateAutoApprove":false}'::jsonb)
on conflict (id) do update
set data = excluded.data, updated_at = now();

insert into public.categories (id, data) values
  ('c1', '{"id":"c1","name":"العطور والعود","slug":"perfumes","icon":"🕌","active":true}'::jsonb),
  ('c2', '{"id":"c2","name":"القهوة المختصة","slug":"coffee","icon":"☕","active":true}'::jsonb),
  ('c3', '{"id":"c3","name":"التمور والضيافة","slug":"dates","icon":"🌴","active":true}'::jsonb),
  ('c4', '{"id":"c4","name":"الإكسسوارات","slug":"accessories","icon":"⌚","active":true}'::jsonb),
  ('c5', '{"id":"c5","name":"العناية الشخصية","slug":"care","icon":"🧴","active":true}'::jsonb),
  ('c6', '{"id":"c6","name":"إلكترونيات","slug":"tech","icon":"🎧","active":true}'::jsonb)
on conflict (id) do update
set data = excluded.data, updated_at = now();

insert into public.products (id, data) values
  ('p1', '{"id":"p1","name":"عطر عود ملكي 100 مل","sku":"PRF-1001","categoryId":"c1","price":780,"salePrice":649,"cost":452,"stock":24,"lowStock":5,"desc":"عود كمبودي معتّق بتركيبة شرقية دافئة، ثبات يتجاوز 10 ساعات مع بصمة عطرية مميزة.","images":[],"options":[{"name":"الحجم","values":["50 مل","100 مل"]}],"status":"active","featured":true,"weight":0.6,"sold":0,"rating":"4.9","seoTitle":"عطر عود ملكي 100 مل","seoDesc":"عود كمبودي معتّق بتركيبة شرقية دافئة، ثبات يتجاوز 10 ساعات مع بصمة عطرية مميزة.","createdAt":"2026-04-24T09:00:00.000Z"}'::jsonb),
  ('p2', '{"id":"p2","name":"دهن عود هندي 3 مل","sku":"PRF-1002","categoryId":"c1","price":1250,"salePrice":null,"cost":725,"stock":8,"lowStock":5,"desc":"دهن عود هندي فاخر بتقطير تقليدي، يقدّم في عبوة زجاجية مع علبة هدية.","images":[],"options":[],"status":"active","featured":true,"weight":0.6,"sold":0,"rating":"4.5","seoTitle":"دهن عود هندي 3 مل","seoDesc":"دهن عود هندي فاخر بتقطير تقليدي، يقدّم في عبوة زجاجية مع علبة هدية.","createdAt":"2026-04-07T09:00:00.000Z"}'::jsonb),
  ('p3', '{"id":"p3","name":"مبخرة كهربائية رخام","sku":"PRF-1003","categoryId":"c1","price":345,"salePrice":299,"cost":200,"stock":41,"lowStock":5,"desc":"مبخرة بتصميم رخامي وحرارة قابلة للتحكم، مناسبة للمجالس والمكاتب.","images":[],"options":[{"name":"اللون","values":["أبيض","أسود","بيج"]}],"status":"active","featured":false,"weight":0.6,"sold":0,"rating":"4.6","seoTitle":"مبخرة كهربائية رخام","seoDesc":"مبخرة بتصميم رخامي وحرارة قابلة للتحكم، مناسبة للمجالس والمكاتب.","createdAt":"2026-04-24T09:00:00.000Z"}'::jsonb),
  ('p4', '{"id":"p4","name":"قهوة إثيوبية يرقشيف 250 جم","sku":"COF-2001","categoryId":"c2","price":89,"salePrice":null,"cost":52,"stock":120,"lowStock":5,"desc":"حبوب مختصة بدرجة تحميص فاتحة، نوتات الياسمين والحمضيات. تُطحن حسب الطلب.","images":[],"options":[{"name":"الطحن","values":["حب كامل","V60","إسبريسو"]}],"status":"active","featured":true,"weight":0.6,"sold":0,"rating":"4.1","seoTitle":"قهوة إثيوبية يرقشيف 250 جم","seoDesc":"حبوب مختصة بدرجة تحميص فاتحة، نوتات الياسمين والحمضيات. تُطحن حسب الطلب.","createdAt":"2026-04-09T09:00:00.000Z"}'::jsonb),
  ('p5', '{"id":"p5","name":"قهوة كولومبية هويلا 250 جم","sku":"COF-2002","categoryId":"c2","price":79,"salePrice":69,"cost":46,"stock":86,"lowStock":5,"desc":"تحميص متوسط بنوتات الكراميل والشوكولاتة، مثالية للتحضير اليومي.","images":[],"options":[{"name":"الطحن","values":["حب كامل","V60","مقطرة"]}],"status":"active","featured":false,"weight":0.6,"sold":0,"rating":"4.2","seoTitle":"قهوة كولومبية هويلا 250 جم","seoDesc":"تحميص متوسط بنوتات الكراميل والشوكولاتة، مثالية للتحضير اليومي.","createdAt":"2026-04-10T09:00:00.000Z"}'::jsonb),
  ('p6', '{"id":"p6","name":"ركوة قهوة نحاس مطروق","sku":"COF-2003","categoryId":"c2","price":185,"salePrice":null,"cost":107,"stock":17,"lowStock":5,"desc":"ركوة نحاسية مطروقة يدويًا بمقبض خشبي عازل للحرارة، سعة 400 مل.","images":[],"options":[],"status":"active","featured":false,"weight":0.6,"sold":0,"rating":"4.4","seoTitle":"ركوة قهوة نحاس مطروق","seoDesc":"ركوة نحاسية مطروقة يدويًا بمقبض خشبي عازل للحرارة، سعة 400 مل.","createdAt":"2026-05-01T09:00:00.000Z"}'::jsonb),
  ('p7', '{"id":"p7","name":"تمر سكري فاخر 1 كجم","sku":"DAT-3001","categoryId":"c3","price":95,"salePrice":85,"cost":55,"stock":210,"lowStock":5,"desc":"سكري قصيم درجة أولى، حبّة ممتلئة وقوام طري، معبأ بعبوة محكمة.","images":[],"options":[{"name":"الوزن","values":["500 جم","1 كجم","3 كجم"]}],"status":"active","featured":true,"weight":0.6,"sold":0,"rating":"4.9","seoTitle":"تمر سكري فاخر 1 كجم","seoDesc":"سكري قصيم درجة أولى، حبّة ممتلئة وقوام طري، معبأ بعبوة محكمة.","createdAt":"2026-05-25T09:00:00.000Z"}'::jsonb),
  ('p8', '{"id":"p8","name":"تمر عجوة المدينة 1 كجم","sku":"DAT-3002","categoryId":"c3","price":180,"salePrice":null,"cost":104,"stock":64,"lowStock":5,"desc":"عجوة المدينة المنورة، فرز ممتاز، مثالية للهدايا والمناسبات.","images":[],"options":[],"status":"active","featured":false,"weight":0.6,"sold":0,"rating":"4.9","seoTitle":"تمر عجوة المدينة 1 كجم","seoDesc":"عجوة المدينة المنورة، فرز ممتاز، مثالية للهدايا والمناسبات.","createdAt":"2026-07-19T09:00:00.000Z"}'::jsonb),
  ('p9', '{"id":"p9","name":"صندوق ضيافة مشكّل","sku":"DAT-3003","categoryId":"c3","price":420,"salePrice":379,"cost":244,"stock":29,"lowStock":5,"desc":"صندوق فاخر يجمع التمور والشوكولاتة والقهوة، مع بطاقة إهداء مخصصة.","images":[],"options":[],"status":"active","featured":false,"weight":0.6,"sold":0,"rating":"4.2","seoTitle":"صندوق ضيافة مشكّل","seoDesc":"صندوق فاخر يجمع التمور والشوكولاتة والقهوة، مع بطاقة إهداء مخصصة.","createdAt":"2026-04-25T09:00:00.000Z"}'::jsonb),
  ('p10', '{"id":"p10","name":"ساعة جلد كلاسيك","sku":"ACC-4001","categoryId":"c4","price":560,"salePrice":489,"cost":325,"stock":15,"lowStock":5,"desc":"ساعة بحركة كوارتز ياباني وسوار جلد طبيعي، مقاومة للماء 3 ATM.","images":[],"options":[{"name":"اللون","values":["بني","أسود"]}],"status":"active","featured":true,"weight":0.6,"sold":0,"rating":"4.8","seoTitle":"ساعة جلد كلاسيك","seoDesc":"ساعة بحركة كوارتز ياباني وسوار جلد طبيعي، مقاومة للماء 3 ATM.","createdAt":"2026-04-19T09:00:00.000Z"}'::jsonb),
  ('p11', '{"id":"p11","name":"محفظة جلد طبيعي","sku":"ACC-4002","categoryId":"c4","price":210,"salePrice":null,"cost":122,"stock":52,"lowStock":5,"desc":"محفظة جلد طبيعي بست فتحات بطاقات وجيب للأوراق النقدية.","images":[],"options":[{"name":"اللون","values":["بني","أسود","كحلي"]}],"status":"active","featured":false,"weight":0.6,"sold":0,"rating":"4.8","seoTitle":"محفظة جلد طبيعي","seoDesc":"محفظة جلد طبيعي بست فتحات بطاقات وجيب للأوراق النقدية.","createdAt":"2026-06-21T09:00:00.000Z"}'::jsonb),
  ('p12', '{"id":"p12","name":"كريم مرطب بزيت الأرغان","sku":"CAR-5001","categoryId":"c5","price":120,"salePrice":99,"cost":70,"stock":73,"lowStock":5,"desc":"مرطب يومي غني بزيت الأرغان وفيتامين هـ، سريع الامتصاص وخالٍ من العطور.","images":[],"options":[],"status":"active","featured":false,"weight":0.6,"sold":0,"rating":"4.0","seoTitle":"كريم مرطب بزيت الأرغان","seoDesc":"مرطب يومي غني بزيت الأرغان وفيتامين هـ، سريع الامتصاص وخالٍ من العطور.","createdAt":"2026-06-23T09:00:00.000Z"}'::jsonb),
  ('p13', '{"id":"p13","name":"سماعات لاسلكية عازلة","sku":"TEC-6001","categoryId":"c6","price":649,"salePrice":549,"cost":376,"stock":33,"lowStock":5,"desc":"عزل ضوضاء نشط، بطارية تعمل 32 ساعة، وضع الشفافية وشحن سريع.","images":[],"options":[{"name":"اللون","values":["أسود","فضي"]}],"status":"active","featured":true,"weight":0.6,"sold":0,"rating":"4.7","seoTitle":"سماعات لاسلكية عازلة","seoDesc":"عزل ضوضاء نشط، بطارية تعمل 32 ساعة، وضع الشفافية وشحن سريع.","createdAt":"2026-05-11T09:00:00.000Z"}'::jsonb),
  ('p14', '{"id":"p14","name":"شاحن سريع 65 واط","sku":"TEC-6002","categoryId":"c6","price":159,"salePrice":129,"cost":92,"stock":95,"lowStock":5,"desc":"ثلاثة منافذ GaN بقدرة 65 واط، يشحن الجوال واللابتوب في وقت واحد.","images":[],"options":[],"status":"active","featured":false,"weight":0.6,"sold":0,"rating":"4.3","seoTitle":"شاحن سريع 65 واط","seoDesc":"ثلاثة منافذ GaN بقدرة 65 واط، يشحن الجوال واللابتوب في وقت واحد.","createdAt":"2026-06-16T09:00:00.000Z"}'::jsonb)
on conflict (id) do update
set data = excluded.data, updated_at = now();

insert into public.shipping_methods (id, data) values
  ('s1', '{"id":"s1","name":"شحن قياسي (3-5 أيام)","price":25,"freeOver":300,"eta":"3-5 أيام عمل","active":true,"cities":"كل المدن"}'::jsonb),
  ('s2', '{"id":"s2","name":"شحن سريع (24 ساعة)","price":45,"freeOver":0,"eta":"خلال 24 ساعة","active":true,"cities":"الرياض، جدة، الدمام"}'::jsonb),
  ('s3', '{"id":"s3","name":"استلام من الفرع","price":0,"freeOver":0,"eta":"جاهز خلال ساعتين","active":true,"cities":"الرياض — حي الياسمين"}'::jsonb)
on conflict (id) do update
set data = excluded.data, updated_at = now();

insert into public.payment_methods (id, data) values
  ('m1', '{"id":"m1","name":"مدى / بطاقة ائتمانية","enabled":true,"fee":1.5}'::jsonb),
  ('m2', '{"id":"m2","name":"Apple Pay","enabled":true,"fee":1.5}'::jsonb),
  ('m3', '{"id":"m3","name":"تابي — قسّمها على 4","enabled":true,"fee":6}'::jsonb),
  ('m4', '{"id":"m4","name":"الدفع عند الاستلام","enabled":true,"fee":15}'::jsonb),
  ('m5', '{"id":"m5","name":"تحويل بنكي","enabled":false,"fee":0}'::jsonb)
on conflict (id) do update
set data = excluded.data, updated_at = now();

insert into public.reviews (id, data) values
  ('r1', '{"id":"r1","productId":"p1","name":"عبدالعزيز الحربي","rating":5,"text":"ثبات ممتاز والرائحة فخمة، وصل خلال يومين.","status":"approved","createdAt":"2026-07-17T09:00:00.000Z"}'::jsonb),
  ('r2', '{"id":"r2","productId":"p4","name":"نورة القحطاني","rating":4,"text":"قهوة نظيفة وحموضة متوازنة، أتمنى خيار تحميص أغمق.","status":"approved","createdAt":"2026-07-22T09:00:00.000Z"}'::jsonb),
  ('r3', '{"id":"r3","productId":"p13","name":"سلطان الدوسري","rating":5,"text":"عزل الضوضاء فوق التوقع بهذا السعر.","status":"pending","createdAt":"2026-07-27T09:00:00.000Z"}'::jsonb),
  ('r4', '{"id":"r4","productId":"p7","name":"ريم العتيبي","rating":3,"text":"التمر طيب بس العبوة وصلت مفتوحة شوي.","status":"pending","createdAt":"2026-07-28T09:00:00.000Z"}'::jsonb)
on conflict (id) do update
set data = excluded.data, updated_at = now();

insert into public.pages (id, data) values
  ('g1', '{"id":"g1","title":"من نحن","slug":"about","content":"متجر رفوف يختار منتجاته بعناية من مصادر موثوقة، ويشحن لكل مدن المملكة."}'::jsonb),
  ('g2', '{"id":"g2","title":"سياسة الاستبدال والاسترجاع","slug":"returns","content":"يمكن استرجاع المنتج خلال 14 يومًا من الاستلام بحالته الأصلية ومع الفاتورة."}'::jsonb),
  ('g3', '{"id":"g3","title":"سياسة الخصوصية","slug":"privacy","content":"نحمي بياناتك ولا نشاركها مع أي طرف ثالث خارج نطاق تنفيذ الطلب والشحن."}'::jsonb)
on conflict (id) do update
set data = excluded.data, updated_at = now();

insert into public.banners (id, data) values
  ('b1', '{"id":"b1","title":"عروض الصيف — خصم حتى 25%","sub":"على العطور والقهوة المختصة","link":"#/shop","active":true}'::jsonb)
on conflict (id) do update
set data = excluded.data, updated_at = now();

insert into public.coupons (id, data) values
  ('k1', '{"id":"k1","code":"WELCOME10","type":"percent","value":10,"minOrder":150,"limit":500,"used":0,"expires":"2026-09-27T09:00:00.000Z","active":true,"note":"خصم أول طلب"}'::jsonb),
  ('k2', '{"id":"k2","code":"FREESHIP","type":"shipping","value":0,"minOrder":200,"limit":0,"used":0,"expires":"2026-11-26T09:00:00.000Z","active":true,"note":"شحن مجاني"}'::jsonb),
  ('k3', '{"id":"k3","code":"EID50","type":"fixed","value":50,"minOrder":400,"limit":200,"used":0,"expires":"2026-07-09T09:00:00.000Z","active":false,"note":"عرض العيد — منتهي"}'::jsonb)
on conflict (id) do update
set data = excluded.data, updated_at = now();

insert into public.affiliates (id, data) values
  ('a1', '{"id":"a1","name":"مشاعل التميمي","handle":"@mashael.style","code":"MASHAEL15","commissionType":"percent","commissionValue":12,"status":"active","clicks":0,"paid":0,"createdAt":"2026-03-31T09:00:00.000Z"}'::jsonb),
  ('a2', '{"id":"a2","name":"خالد الرشيد","handle":"@khaled.reviews","code":"KHALED10","commissionType":"percent","commissionValue":10,"status":"active","clicks":0,"paid":0,"createdAt":"2026-05-05T09:00:00.000Z"}'::jsonb),
  ('a3', '{"id":"a3","name":"ليان عبدالله","handle":"@layan.picks","code":"LAYAN20","commissionType":"fixed","commissionValue":35,"status":"active","clicks":0,"paid":0,"createdAt":"2026-06-21T09:00:00.000Z"}'::jsonb),
  ('a4', '{"id":"a4","name":"تركي المطيري","handle":"@turki.deals","code":"TURKI5","commissionType":"percent","commissionValue":8,"status":"paused","clicks":0,"paid":0,"createdAt":"2026-07-14T09:00:00.000Z"}'::jsonb)
on conflict (id) do update
set data = excluded.data, updated_at = now();
