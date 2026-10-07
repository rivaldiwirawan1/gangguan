// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return response(405, { ok: false, message: "Method not allowed" });
  }

  const configuredToken = Deno.env.get("CHECKLIST_API_TOKEN") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

  if (!configuredToken || bearer !== configuredToken) {
    return response(401, { ok: false, message: "Unauthorized" });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return response(400, { ok: false, message: "Invalid JSON body" });
  }

  const qrPayloadRaw = String(body.qrPayload || "").trim();
  if (!qrPayloadRaw) {
    return response(400, { ok: false, message: "qrPayload is required" });
  }

  let qrData: Record<string, unknown>;
  try {
    qrData = JSON.parse(qrPayloadRaw);
  } catch {
    return response(400, { ok: false, message: "qrPayload is not valid JSON" });
  }

  const payloadHash = String(qrData.f || "").trim();
  const nipp = String(qrData.n || "").trim();
  if (!payloadHash || !nipp) {
    return response(400, { ok: false, message: "QR payload must include fields f (payload hash) and n (NIPP)" });
  }

  const supabaseUrl = Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return response(500, { ok: false, message: "Server environment is not configured" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from("checklist_submissions")
    .select("id, request_id, created_at, progress, gangguan_key, mode_checklist, petugas, nipp, lokasi, payload_hash")
    .eq("nipp", nipp)
    .eq("payload_hash", payloadHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return response(500, { ok: false, message: error.message });
  }

  if (!data) {
    return response(200, { ok: true, valid: false, message: "Data tidak ditemukan atau tidak cocok" });
  }

  return response(200, {
    ok: true,
    valid: true,
    item: data
  });
});
