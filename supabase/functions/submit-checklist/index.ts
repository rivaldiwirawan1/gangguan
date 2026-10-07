// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS"
};

type Submission = {
  requestId: string;
  clientSentAt: string;
  progress: number;
  signature: Record<string, unknown>;
  data: {
    meta: {
      gangguanKey: string;
      modeChecklist: string;
      petugas: string;
      nipp: string;
      lokasi: string;
      tanggal?: string;
      keterangan?: string;
    };
    checklist: Array<{ kegiatan: string; selesai: boolean }>;
  };
};

function badRequest(message: string) {
  return new Response(JSON.stringify({ ok: false, message }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function parseAndValidate(payload: unknown): Submission | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Partial<Submission>;

  if (!p.requestId || typeof p.requestId !== "string") return null;
  if (!p.clientSentAt || typeof p.clientSentAt !== "string") return null;
  if (typeof p.progress !== "number") return null;
  if (!p.signature || typeof p.signature !== "object") return null;
  if (!p.data || typeof p.data !== "object") return null;
  if (!p.data.meta || typeof p.data.meta !== "object") return null;
  if (!Array.isArray(p.data.checklist)) return null;

  const meta = p.data.meta;
  if (!meta.gangguanKey || !meta.modeChecklist || !meta.petugas || !meta.nipp || !meta.lokasi) {
    return null;
  }

  return p as Submission;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const configuredToken = Deno.env.get("CHECKLIST_API_TOKEN") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

  if (!configuredToken || bearer !== configuredToken) {
    return new Response(JSON.stringify({ ok: false, message: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Supabase automatically injects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Edge Functions
  // Custom secrets PROJECT_URL and SERVICE_ROLE_KEY used as fallback for local/self-hosted
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ ok: false, message: "Server environment is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (req.method === "GET") {
    const url = new URL(req.url);
    const requestId = (url.searchParams.get("requestId") || "").trim();
    const limitRaw = Number(url.searchParams.get("limit") || 50);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 50;
    const nipp = (url.searchParams.get("nipp") || "").trim();
    const lokasi = (url.searchParams.get("lokasi") || "").trim();

    if (requestId) {
      const { data, error } = await supabase
        .from("checklist_submissions")
        .select("id, request_id, created_at, progress, gangguan_key, mode_checklist, petugas, nipp, lokasi, tanggal, keterangan, signature, payload")
        .eq("request_id", requestId)
        .maybeSingle();

      if (error) {
        return new Response(JSON.stringify({ ok: false, message: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ ok: true, item: data || null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let query = supabase
      .from("checklist_submissions")
      .select("id, request_id, created_at, progress, gangguan_key, mode_checklist, petugas, nipp, lokasi, tanggal")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (nipp) {
      query = query.eq("nipp", nipp);
    }
    if (lokasi) {
      query = query.ilike("lokasi", "%" + lokasi + "%");
    }

    const { data, error } = await query;
    if (error) {
      return new Response(JSON.stringify({ ok: false, message: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true, items: data || [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (req.method === "DELETE") {
    const url = new URL(req.url);
    const requestId = (url.searchParams.get("requestId") || "").trim();
    if (!requestId) {
      return badRequest("requestId is required for delete");
    }

    // Require admin credentials in headers for delete
    const adminNipp = String(req.headers.get("x-admin-nipp") || "").trim();
    const adminPassword = String(req.headers.get("x-admin-password") || "");
    if (!adminNipp || !adminPassword) {
      return new Response(JSON.stringify({ ok: false, message: "Admin credentials required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // compute sha256 helper
    async function sha256HexLocal(input: string) {
      const data = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest("SHA-256", data);
      const bytes = Array.from(new Uint8Array(digest));
      return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    // verify admin is active and super
    const { data: adminRow, error: adminErr } = await supabase
      .from("checklist_users")
      .select("nipp, password_hash, is_active, is_super")
      .eq("nipp", adminNipp)
      .maybeSingle();

    if (adminErr) {
      return new Response(JSON.stringify({ ok: false, message: adminErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!adminRow || !adminRow.is_active) {
      return new Response(JSON.stringify({ ok: false, message: "Admin not found or inactive" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const incomingHash = await sha256HexLocal(adminPassword);
    if (incomingHash !== String(adminRow.password_hash || "") || !adminRow.is_super) {
      return new Response(JSON.stringify({ ok: false, message: "Unauthorized: requires superuser" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error } = await supabase
      .from("checklist_submissions")
      .delete()
      .eq("request_id", requestId);

    if (error) {
      return new Response(JSON.stringify({ ok: false, message: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true, deleted: requestId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, message: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = parseAndValidate(body);
  if (!parsed) {
    return badRequest("Payload structure is invalid");
  }

  const { error } = await supabase
    .from("checklist_submissions")
    .insert({
      request_id: parsed.requestId,
      client_sent_at: parsed.clientSentAt,
      progress: parsed.progress,
      gangguan_key: parsed.data.meta.gangguanKey,
      mode_checklist: parsed.data.meta.modeChecklist,
      petugas: parsed.data.meta.petugas,
      nipp: parsed.data.meta.nipp,
      lokasi: parsed.data.meta.lokasi,
      tanggal: parsed.data.meta.tanggal ?? null,
      keterangan: parsed.data.meta.keterangan ?? null,
      passphrase_hash: String(parsed.signature.passphraseHash || ""),
      payload_hash: String(parsed.signature.payloadHash || ""),
      signature: parsed.signature,
      payload: parsed.data
    });

  if (error) {
    const isDuplicate = error.code === "23505";
    return new Response(JSON.stringify({ ok: !isDuplicate, message: isDuplicate ? "Duplicate request_id" : error.message }), {
      status: isDuplicate ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
