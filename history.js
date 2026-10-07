function getAppConfig() {
  const cfg = window.APP_CONFIG && typeof window.APP_CONFIG === "object" ? window.APP_CONFIG : {};
  const rawToken = String(cfg.apiToken || "").trim();
  const token = (rawToken === "CHECKLIST_API_TOKEN" || rawToken === "YOUR_CHECKLIST_API_TOKEN") ? "" : rawToken;
  return {
    apiEndpoint: String(cfg.apiEndpoint || "").trim(),
    apiToken: token
  };
}

function getAuthHeaders() {
  const config = getAppConfig();
  const headers = { "Content-Type": "application/json" };
  if (config.apiToken) {
    headers.Authorization = "Bearer " + config.apiToken;
  }
  return headers;
}

function setHistoryHint(text) {
  document.getElementById("historyHint").textContent = text;
}

function formatGangguanLabel(value) {
  return String(value || "-")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function resetFilters() {
  document.getElementById("filterNipp").value = "";
  document.getElementById("filterLokasi").value = "";
  document.getElementById("filterLimit").value = "50";
  loadHistory();
}

async function loadDetailByRequestId(requestId) {
  const config = getAppConfig();
  const detailBox = document.getElementById("historyDetail");
  if (!config.apiEndpoint) {
    detailBox.textContent = "Endpoint API belum diatur di config.js.";
    return;
  }

  const url = new URL(config.apiEndpoint);
  url.searchParams.set("requestId", requestId);
  detailBox.textContent = "Memuat detail...";

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    detailBox.textContent = "Gagal memuat detail: " + response.status;
    return;
  }

  const payload = await response.json();
  if (!payload.ok || !payload.item) {
    detailBox.textContent = "Detail tidak ditemukan.";
    return;
  }

  const item = payload.item;
  const detailPayload = item.payload || {};
  const meta = detailPayload.meta || {};
  const checklist = Array.isArray(detailPayload.checklist) ? detailPayload.checklist : [];

  const checklistHtml = checklist.length
    ? "<ol class='history-checklist-list'>" + checklist.map((entry, index) => {
      const done = Boolean(entry && entry.selesai);
      const kegiatan = entry && entry.kegiatan ? entry.kegiatan : "-";
      return "<li><span class='history-checklist-status " + (done ? "done" : "pending") + "'>" + (done ? "Sudah Dilakukan" : "Belum Dilakukan") + "</span><span class='history-checklist-text'>" + escapeHtml((index + 1) + ". " + kegiatan) + "</span></li>";
    }).join("") + "</ol>"
    : "<div class='history-empty-detail'>Checklist tidak tersedia.</div>";

  detailBox.innerHTML = [
    "<div class='history-detail-title'>Detail Checklist</div>",
    "<div class='history-detail-meta'><strong>Request ID:</strong> " + escapeHtml(item.request_id) + "</div>",
    "<div class='history-detail-meta'><strong>Jenis Gangguan:</strong> " + escapeHtml(formatGangguanLabel(meta.gangguan || item.gangguan_key)) + "</div>",
    "<div class='history-detail-meta'><strong>Sinyal:</strong> " + escapeHtml(formatGangguanLabel(meta.modeChecklist || item.mode_checklist)) + "</div>",
    "<div class='history-detail-meta'><strong>Petugas:</strong> " + escapeHtml(item.petugas || "-") + "</div>",
    "<div class='history-detail-meta'><strong>NIPP:</strong> " + escapeHtml(item.nipp || "-") + "</div>",
    "<div class='history-detail-meta'><strong>Lokasi/Stasiun:</strong> " + escapeHtml(item.lokasi || "-") + "</div>",
    "<div class='history-detail-meta'><strong>Tanggal & Waktu:</strong> " + escapeHtml(meta.tanggal || item.tanggal || "-") + "</div>",
    "<div class='history-detail-meta'><strong>Keterangan:</strong> " + escapeHtml(meta.keterangan || item.keterangan || "-") + "</div>",
    "<div class='history-detail-meta'><strong>Waktu Kirim:</strong> " + escapeHtml(new Date(item.created_at).toLocaleString("id-ID")) + "</div>",
    "<div class='history-detail-divider'></div>",
    "<div class='history-detail-subtitle'>Detail Checklist</div>",
    checklistHtml
  ].join("");
}

async function loadHistory() {
  const config = getAppConfig();
  const loadButton = document.getElementById("btnMuatRiwayat");
  if (!config.apiEndpoint) {
    setHistoryHint("Endpoint API belum diatur di config.js.");
    return;
  }

  const nipp = String(document.getElementById("filterNipp").value || "").trim();
  const lokasi = String(document.getElementById("filterLokasi").value || "").trim();
  const limitInput = Number(document.getElementById("filterLimit").value || 50);
  const limit = Number.isFinite(limitInput) ? Math.max(1, Math.min(200, Math.floor(limitInput))) : 50;

  const url = new URL(config.apiEndpoint);
  url.searchParams.set("limit", String(limit));
  if (nipp) {
    url.searchParams.set("nipp", nipp);
  }
  if (lokasi) {
    url.searchParams.set("lokasi", lokasi);
  }

  try {
    loadButton.disabled = true;
    setHistoryHint("Memuat data...");
    const currentUser = (window.ChecklistAuth && window.ChecklistAuth.getCurrentUser && window.ChecklistAuth.getCurrentUser()) || (window.CURRENT_USER || {});
    const isSuper = !!(currentUser && currentUser.is_super);
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      setHistoryHint("Gagal memuat data: " + response.status);
      return;
    }

    const payload = await response.json();
    const items = Array.isArray(payload.items) ? payload.items : [];
    const body = document.getElementById("historyBody");
    body.innerHTML = "";

    if (!items.length) {
      body.innerHTML = "<tr><td colspan='5' class='empty-row'>Tidak ada data untuk filter ini.</td></tr>";
      setHistoryHint("0 data ditemukan.");
      return;
    }

    items.forEach((item) => {
      const row = document.createElement("tr");
      const waktu = new Date(item.created_at).toLocaleString("id-ID");
      row.innerHTML = [
        "<td data-label='Waktu'>" + escapeHtml(waktu) + "</td>",
        "<td data-label='Petugas'>" + escapeHtml(item.petugas || "-") + "</td>",
        "<td data-label='NIPP'>" + escapeHtml(item.nipp || "-") + "</td>",
        "<td data-label='Lokasi/Stasiun'>" + escapeHtml(item.lokasi || "-") + "</td>",
        "<td data-label='Aksi'><div class='history-action-group'><button class='btn btn-gray history-detail-btn' type='button' data-request-id='" + escapeHtml(item.request_id || "") + "'>Detail</button>" + (isSuper ? "<button class='btn btn-red history-delete-btn' type='button' data-request-id='" + escapeHtml(item.request_id || "") + "'>Hapus</button>" : "") + "</div></td>"
      ].join("");
      body.appendChild(row);
    });

    body.querySelectorAll(".history-detail-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const requestId = button.getAttribute("data-request-id") || "";
        if (requestId) {
          loadDetailByRequestId(requestId);
        }
      });
    });

    body.querySelectorAll(".history-delete-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const requestId = button.getAttribute("data-request-id") || "";
        if (!requestId) {
          return;
        }

        const ok = window.confirm("Hapus data request " + requestId + " dari server?");
        if (!ok) {
          return;
        }

        button.disabled = true;
        setHistoryHint("Menghapus data...");
        const deleted = await deleteByRequestId(requestId);
        button.disabled = false;

        if (deleted) {
          setHistoryHint("Data berhasil dihapus.");
          loadHistory();
        }
      });
    });

    setHistoryHint(items.length + " data dimuat.");
  } catch (err) {
    setHistoryHint("Gagal memuat data. Periksa koneksi dan token.");
  } finally {
    loadButton.disabled = false;
  }
}

async function deleteByRequestId(requestId) {
  const config = getAppConfig();
  if (!config.apiEndpoint) {
    setHistoryHint("Endpoint API belum diatur di config.js.");
    return false;
  }

  const url = new URL(config.apiEndpoint);
  url.searchParams.set("requestId", requestId);

  const response = await fetch(url.toString(), {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    setHistoryHint("Gagal hapus: " + (payload.message || response.status));
    return false;
  }

  const detailBox = document.getElementById("historyDetail");
  detailBox.textContent = "Data request " + requestId + " sudah dihapus.";
  return true;
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnMuatRiwayat").addEventListener("click", loadHistory);
  document.getElementById("btnResetFilter").addEventListener("click", resetFilters);
  loadHistory();
});
