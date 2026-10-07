// @ts-nocheck
// Redeploy marker: keep this file in sync with the Supabase dashboard editor.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const NIPP_PATTERN = /^\d{5,20}$/;
const PIN_PATTERN = /^\d{6}$/;

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function validateCredentials(nipp: string, password: string, signaturePin?: string) {
  if (!NIPP_PATTERN.test(nipp)) {
    return "NIPP harus berupa angka 5-20 digit";
  }
  if (password.length < 6) {
    return "Password minimal 6 karakter";
  }
  if (typeof signaturePin === "string" && !PIN_PATTERN.test(signaturePin)) {
    return "PIN tanda tangan harus 6 digit angka";
  }
  return "";
}

function sanitizeText(value: unknown) {
  return String(value || "").replace(/[<>]/g, "").trim();
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

  const supabaseUrl = Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return response(500, { ok: false, message: "Server environment is not configured" });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return response(400, { ok: false, message: "Invalid JSON body" });
  }

  const action = String(body.action || "").trim();
  if (!action) {
    return response(400, { ok: false, message: "action is required" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (action === "register") {
    const nipp = String(body.nipp || "").trim();
    const nama = sanitizeText(body.nama);
    const jabatan = sanitizeText(body.jabatan);
    const password = String(body.password || "");
    const signaturePin = String(body.signaturePin || "").trim();

    const validationError = validateCredentials(nipp, password, signaturePin);
    if (validationError) {
      return response(400, { ok: false, message: validationError });
    }

    if (!nama) {
      return response(400, { ok: false, message: "Nama wajib diisi" });
    }
    if (!jabatan) {
      return response(400, { ok: false, message: "Jabatan wajib diisi" });
    }

    const passwordHash = await sha256Hex(password);
    const signaturePinHash = await sha256Hex(signaturePin);

    const { error } = await supabase.from("checklist_users").insert({
      nipp,
      nama,
      jabatan,
      password_hash: passwordHash,
      signature_pin_hash: signaturePinHash,
      is_active: true
    });

    if (error) {
      if (error.code === "23505") {
        return response(409, { ok: false, message: "NIPP sudah terdaftar" });
      }
      return response(500, { ok: false, message: error.message });
    }

    return response(200, { ok: true, message: "Pendaftaran berhasil" });
  }

  if (action === "profile") {
    const nipp = String(body.nipp || "").trim();

    if (!NIPP_PATTERN.test(nipp)) {
      return response(400, { ok: false, message: "NIPP harus berupa angka 5-20 digit" });
    }

    const { data, error } = await supabase
      .from("checklist_users")
      .select("nipp, nama, jabatan, avatar_url, is_active")
      .eq("nipp", nipp)
      .maybeSingle();

    if (error) {
      return response(500, { ok: false, message: error.message });
    }

    if (!data || !data.is_active) {
      return response(404, { ok: false, message: "Data akun tidak ditemukan" });
    }

    return response(200, {
      ok: true,
      user: {
        nipp: data.nipp,
        nama: sanitizeText(data.nama),
        jabatan: sanitizeText(data.jabatan),
        avatar_url: sanitizeText(data.avatar_url)
      }
    });
  }

  if (action === "lookup-user") {
    const nipp = String(body.nipp || "").trim();

    if (!NIPP_PATTERN.test(nipp)) {
      return response(400, { ok: false, message: "NIPP harus berupa angka 5-20 digit" });
    }

    const { data, error } = await supabase
      .from("checklist_users")
      .select("nipp, nama, jabatan, avatar_url, is_active")
      .eq("nipp", nipp)
      .maybeSingle();

    if (error) {
      return response(500, { ok: false, message: error.message });
    }

    if (!data || !data.is_active) {
      return response(404, { ok: false, message: "Data akun tidak ditemukan" });
    }

    return response(200, {
      ok: true,
      user: {
        nipp: data.nipp,
        nama: sanitizeText(data.nama),
        jabatan: sanitizeText(data.jabatan),
        avatar_url: sanitizeText(data.avatar_url)
      }
    });
  }

  if (action === "reset-password") {
    const nipp = String(body.nipp || "").trim();
    const newPassword = String(body.password || "");

    if (!NIPP_PATTERN.test(nipp)) {
      return response(400, { ok: false, message: "NIPP harus berupa angka 5-20 digit" });
    }

    if (newPassword.length < 6) {
      return response(400, { ok: false, message: "Password minimal 6 karakter" });
    }

    const { data, error } = await supabase
      .from("checklist_users")
      .select("nipp, is_active")
      .eq("nipp", nipp)
      .maybeSingle();

    if (error) {
      return response(500, { ok: false, message: error.message });
    }

    if (!data || !data.is_active) {
      return response(404, { ok: false, message: "Data akun tidak ditemukan" });
    }

    const passwordHash = await sha256Hex(newPassword);
    const { error: updateError } = await supabase
      .from("checklist_users")
      .update({ password_hash: passwordHash })
      .eq("nipp", nipp);

    if (updateError) {
      return response(500, { ok: false, message: updateError.message });
    }

    return response(200, { ok: true, message: "Password berhasil diperbarui" });
  }

  if (action === "login") {
    const nipp = String(body.nipp || "").trim();
    const password = String(body.password || "");

    const validationError = validateCredentials(nipp, password);
    if (validationError) {
      return response(400, { ok: false, message: validationError });
    }

    const { data, error } = await supabase
      .from("checklist_users")
      .select("nipp, nama, jabatan, avatar_url, password_hash, is_active")
      .eq("nipp", nipp)
      .maybeSingle();

    if (error) {
      return response(500, { ok: false, message: error.message });
    }

    if (!data || !data.is_active) {
      return response(401, { ok: false, message: "NIPP atau password tidak valid" });
    }

    const incomingPasswordHash = await sha256Hex(password);
    if (incomingPasswordHash !== String(data.password_hash || "")) {
      return response(401, { ok: false, message: "NIPP atau password tidak valid" });
    }

    return response(200, {
      ok: true,
      user: {
        nipp: data.nipp,
        nama: sanitizeText(data.nama),
        jabatan: sanitizeText(data.jabatan),
        avatar_url: sanitizeText(data.avatar_url),
        is_super: Boolean(data.is_super)
      }
    });
  }

  // Helper: verify admin credentials and super flag
  async function verifyAdminCredentials(nipp, password) {
    if (!NIPP_PATTERN.test(String(nipp || ""))) return { ok: false, message: "NIPP tidak valid" };
    if (String(password || "").length < 6) return { ok: false, message: "Password tidak valid" };

    const { data, error } = await supabase
      .from("checklist_users")
      .select("nipp, password_hash, is_active, is_super")
      .eq("nipp", nipp)
      .maybeSingle();

    if (error) return { ok: false, message: error.message };
    if (!data || !data.is_active) return { ok: false, message: "Akun tidak ditemukan atau non-aktif" };

    const incomingHash = await sha256Hex(String(password));
    if (incomingHash !== String(data.password_hash || "")) return { ok: false, message: "NIPP atau password tidak valid" };
    if (!data.is_super) return { ok: false, message: "Aksi ini memerlukan hak superuser" };

    return { ok: true, nipp: data.nipp };
  }

  // List users (superuser only)
  if (action === "list-users") {
    const adminNipp = String(body.adminNipp || "").trim();
    const adminPassword = String(body.adminPassword || "");

    const verified = await verifyAdminCredentials(adminNipp, adminPassword);
    if (!verified.ok) return response(403, { ok: false, message: verified.message || "Forbidden" });

    const { data: list, error: listErr } = await supabase.from("checklist_users").select("nipp, nama, jabatan, is_active, is_super, avatar_url, created_at");
    if (listErr) return response(500, { ok: false, message: listErr.message });

    return response(200, { ok: true, users: list || [] });
  }

  // Update user (superuser only)
  if (action === "update-user") {
    const adminNipp = String(body.adminNipp || "").trim();
    const adminPassword = String(body.adminPassword || "");
    const targetNipp = String(body.targetNipp || "").trim();
    const fields = body.fields && typeof body.fields === "object" ? body.fields : null;

    if (!targetNipp || !fields) return response(400, { ok: false, message: "targetNipp and fields are required" });

    const verified = await verifyAdminCredentials(adminNipp, adminPassword);
    if (!verified.ok) return response(403, { ok: false, message: verified.message || "Forbidden" });

    const updatePayload: Record<string, unknown> = {};
    if (typeof fields.nama === "string") updatePayload.nama = sanitizeText(fields.nama);
    if (typeof fields.jabatan === "string") updatePayload.jabatan = sanitizeText(fields.jabatan);
    if (typeof fields.avatar_url === "string") updatePayload.avatar_url = sanitizeText(fields.avatar_url);
    if (typeof fields.is_active === "boolean") updatePayload.is_active = fields.is_active;
    if (typeof fields.is_super === "boolean") updatePayload.is_super = fields.is_super;
    if (typeof fields.password === "string" && fields.password.length >= 6) {
      updatePayload.password_hash = await sha256Hex(String(fields.password));
    }

    if (!Object.keys(updatePayload).length) return response(400, { ok: false, message: "No valid fields to update" });

    const { error: updErr } = await supabase.from("checklist_users").update(updatePayload).eq("nipp", targetNipp);
    if (updErr) return response(500, { ok: false, message: updErr.message });

    return response(200, { ok: true, updated: targetNipp });
  }

  if (action === "profile") {
    const nipp = String(body.nipp || "").trim();

    if (!NIPP_PATTERN.test(nipp)) {
      return response(400, { ok: false, message: "NIPP tidak valid" });
    }

    const { data, error } = await supabase
      .from("checklist_users")
      .select("nipp, nama, jabatan, avatar_url, is_active")
      .eq("nipp", nipp)
      .maybeSingle();

    if (error) {
      return response(500, { ok: false, message: error.message });
    }

    if (!data || !data.is_active) {
      return response(404, { ok: false, message: "Akun tidak ditemukan" });
    }

    return response(200, {
      ok: true,
      user: {
        nipp: data.nipp,
        nama: sanitizeText(data.nama),
        jabatan: sanitizeText(data.jabatan),
        avatar_url: sanitizeText(data.avatar_url)
      }
    });
  }

  if (action === "verify-pin") {
    const nipp = String(body.nipp || "").trim();
    const signaturePin = String(body.signaturePin || "").trim();

    if (!NIPP_PATTERN.test(nipp)) {
      return response(400, { ok: false, message: "NIPP tidak valid" });
    }
    if (!PIN_PATTERN.test(signaturePin)) {
      return response(400, { ok: false, message: "PIN harus 6 digit angka" });
    }

    const { data, error } = await supabase
      .from("checklist_users")
      .select("signature_pin_hash, is_active")
      .eq("nipp", nipp)
      .maybeSingle();

    if (error) {
      return response(500, { ok: false, message: error.message });
    }

    if (!data || !data.is_active) {
      return response(401, { ok: false, message: "Akun tidak ditemukan" });
    }

    const incomingPinHash = await sha256Hex(signaturePin);
    if (incomingPinHash !== String(data.signature_pin_hash || "")) {
      return response(401, { ok: false, message: "PIN tanda tangan tidak valid" });
    }

    return response(200, { ok: true, valid: true });
  }

  return response(400, { ok: false, message: "Action tidak dikenali" });
});
