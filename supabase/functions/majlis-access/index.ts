import { createClient } from "npm:@supabase/supabase-js@2.111.0";

const allowedOrigin = "https://fs101sk-sketch.github.io";
const gameUrl = `${allowedOrigin}/rufuf-store/majlis/`;

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin === allowedOrigin ? origin : allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function isPaid(status: unknown) {
  return ["paid", "processing", "shipped", "delivered"].includes(String(status || ""));
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function buildPassword(secret: string, orderId: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(orderId));
  const hex = toHex(signature);
  return `Mj!${hex.slice(0, 5).toUpperCase()}-${hex.slice(5, 15)}a`;
}

async function findUserByEmail(
  service: ReturnType<typeof createClient>,
  email: string,
) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 100) break;
  }
  return null;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    if (origin && origin !== allowedOrigin) return json({ error: "origin_not_allowed" }, 403, origin);
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (origin && origin !== allowedOrigin) return json({ error: "origin_not_allowed" }, 403, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "server_configuration_error" }, 500, origin);
  }

  let payload: { order_id?: string; claim_token?: string; admin_provision?: boolean };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400, origin);
  }

  const orderId = String(payload.order_id || "").trim();
  const claimToken = String(payload.claim_token || "").trim().toLowerCase();
  const adminProvision = payload.admin_provision === true;
  if (
    !/^[A-Za-z0-9_-]{6,80}$/.test(orderId) ||
    (!adminProvision && !/^[0-9a-f]{64}$/.test(claimToken))
  ) {
    return json({ error: "invalid_claim" }, 400, origin);
  }

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    if (adminProvision) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      const authorization = request.headers.get("authorization") || "";
      const bearer = authorization.replace(/^Bearer\s+/i, "");
      if (!anonKey || !bearer) return json({ error: "admin_auth_required" }, 401, origin);
      const adminClient = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: authorization } },
      });
      const { data: authData, error: authError } = await adminClient.auth.getUser(bearer);
      if (authError || !authData.user) return json({ error: "admin_auth_required" }, 401, origin);
      const { data: role, error: roleError } = await adminClient.rpc("current_store_role");
      if (roleError || !role) return json({ error: "admin_forbidden" }, 403, origin);
    }

    const tokenHash = adminProvision ? null : `\\x${await sha256(claimToken)}`;
    let claimQuery = service
      .from("majlis_purchase_claims")
      .select("order_id,user_id,username,claimed_at")
      .eq("order_id", orderId);
    if (tokenHash) claimQuery = claimQuery.eq("token_hash", tokenHash);
    const { data: claim, error: claimError } = await claimQuery.maybeSingle();

    if (claimError) throw claimError;
    if (!claim) return json({ error: "invalid_claim" }, 403, origin);

    const { data: orderRow, error: orderError } = await service
      .from("orders")
      .select("data")
      .eq("id", orderId)
      .single();
    if (orderError) throw orderError;

    const order = orderRow.data as {
      number?: string;
      status?: string;
      items?: Array<{ pid?: string }>;
    };
    if (!order.items?.some((item) => item.pid === "p_majlis")) {
      return json({ error: "product_not_found" }, 403, origin);
    }
    if (!isPaid(order.status)) {
      return json(
        {
          ok: false,
          code: "payment_pending",
          message: "بانتظار تأكيد الدفع. ستظهر بيانات الدخول هنا فور اعتماد الطلب.",
        },
        409,
        origin,
      );
    }

    const orderNumber = String(order.number || "").replace(/\D/g, "");
    const fallback = orderId.replace(/[^A-Za-z0-9]/g, "").slice(-10).toLowerCase();
    const username = claim.username || `majlis-${orderNumber || fallback}`;
    const email = `${username}@players.rufuf.sa`;
    const password = await buildPassword(serviceRoleKey, orderId);

    let userId = claim.user_id as string | null;
    if (!userId) {
      const { data: entitlement, error: entitlementError } = await service
        .from("majlis_entitlements")
        .select("user_id,username")
        .eq("order_id", orderId)
        .maybeSingle();
      if (entitlementError) throw entitlementError;
      userId = entitlement?.user_id || null;
    }

    if (userId) {
      const { error } = await service.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { username, product: "majlis", order_id: orderId },
      });
      if (error) throw error;
    } else {
      const { data: created, error: createError } = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username, product: "majlis", order_id: orderId },
      });

      if (createError) {
        const existing = await findUserByEmail(service, email);
        if (!existing) throw createError;
        userId = existing.id;
        const { error: updateError } = await service.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
          user_metadata: { username, product: "majlis", order_id: orderId },
        });
        if (updateError) throw updateError;
      } else {
        userId = created.user.id;
      }
    }

    const { error: entitlementUpsertError } = await service
      .from("majlis_entitlements")
      .upsert(
        {
          user_id: userId,
          order_id: orderId,
          username,
          active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (entitlementUpsertError) throw entitlementUpsertError;

    let claimUpdate = service
      .from("majlis_purchase_claims")
      .update({
        user_id: userId,
        username,
        claimed_at: new Date().toISOString(),
      })
      .eq("order_id", orderId);
    if (tokenHash) claimUpdate = claimUpdate.eq("token_hash", tokenHash);
    const { error: claimUpdateError } = await claimUpdate;
    if (claimUpdateError) throw claimUpdateError;

    return json(
      {
        ok: true,
        username,
        ...(adminProvision ? { provisioned: true } : { password }),
        game_url: gameUrl,
      },
      200,
      origin,
    );
  } catch (error) {
    console.error("majlis-access", error);
    return json(
      {
        error: "provisioning_failed",
        message: "تعذّر تجهيز حساب اللعبة الآن. حاول مرة أخرى بعد قليل.",
      },
      500,
      origin,
    );
  }
});
