(function () {
  const AUTH_SESSION_KEY = "checklist-auth-session";
  const AUTH_REDIRECT_KEY = "checklist-auth-redirect";
  const AUTH_USERS_STORAGE_KEY = "checklist-auth-users";
  const DEFAULT_AUTH_TTL_MS = 8 * 60 * 60 * 1000;
  const REMEMBER_AUTH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const SIGNATURE_PIN_LENGTH = 6;
  const AUTH_API_TIMEOUT_MS = 12000;

  function normalizeEndpoint(value) {
    const text = String(value || "").trim();
    if (!text) {
      return "";
    }

    if (
      text.includes("<PROJECT_REF>")
      || text.includes("YOUR_")
      || text.includes("CHECKLIST_API_TOKEN")
    ) {
      return "";
    }

    return text;
  }

  function deriveAuthEndpoint(apiEndpoint) {
    const endpoint = normalizeEndpoint(apiEndpoint);
    if (!endpoint) {
      return "";
    }

    try {
      const url = new URL(endpoint);
      url.pathname = url.pathname.replace(/\/submit-checklist\/?$/, "/auth-user");
      return url.toString();
    } catch (_err) {
      return "";
    }
  }

  function getPageName() {
    const path = String(window.location.pathname || "");
    const cleanPath = path.replace(/\\/g, "/");
    const lastPart = cleanPath.split("/").pop();
    return lastPart || "index.html";
  }

  function getAppConfig() {
    const cfg = window.APP_CONFIG && typeof window.APP_CONFIG === "object" ? window.APP_CONFIG : {};
    const apiToken = String(cfg.apiToken || "").trim();
    const authEndpoint = normalizeEndpoint(cfg.authEndpoint) || deriveAuthEndpoint(cfg.apiEndpoint);

    return {
      raw: cfg,
      authEndpoint,
      apiToken
    };
  }

  function hasRemoteAuth() {
    const cfg = getAppConfig();
    return !!(cfg.authEndpoint && cfg.apiToken);
  }

  async function callRemoteAuth(action, payload) {
    const cfg = getAppConfig();
    if (!cfg.authEndpoint || !cfg.apiToken) {
      return {
        ok: false,
        reason: "missing-config",
        message: "Endpoint auth Supabase belum dikonfigurasi"
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AUTH_API_TIMEOUT_MS);

    try {
      const response = await fetch(cfg.authEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + cfg.apiToken
        },
        body: JSON.stringify({ action, ...payload }),
        signal: controller.signal
      });

      let data = null;
      try {
        data = await response.json();
      } catch (_err) {
        data = null;
      }

      if (!response.ok || !data || data.ok !== true) {
        return {
          ok: false,
          reason: "remote-error",
          message: (data && data.message) || "Autentikasi ke server gagal"
        };
      }

      return {
        ok: true,
        data
      };
    } catch (_err) {
      return {
        ok: false,
        reason: "network-error",
        message: "Tidak dapat terhubung ke server autentikasi"
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function normalizeNipp(value) {
    return String(value || "").trim();
  }

  function normalizeUser(rawUser, source) {
    if (!rawUser || typeof rawUser !== "object") {
      return null;
    }

    const nipp = normalizeNipp(rawUser.nipp);
    const nama = String(rawUser.nama || "").trim();
    const jabatan = String(rawUser.jabatan || "").trim();
    const kedudukanStasiun = String(rawUser.kedudukanStasiun || rawUser.kedudukan_stasiun || "").trim();
    const password = String(rawUser.password || "");
    const signaturePin = String(rawUser.signaturePin || "");

    let isSuper = false;
    if (typeof rawUser.is_super === "boolean") {
      isSuper = rawUser.is_super;
    } else if (typeof rawUser.is_super === "string") {
      isSuper = /^(true|1|yes|ya)$/i.test(rawUser.is_super.trim());
    } else if (typeof rawUser.is_super === "number") {
      isSuper = Number(rawUser.is_super) === 1;
    }

    if (!nipp || !password) {
      return null;
    }

    if (signaturePin && !new RegExp("^\\d{" + SIGNATURE_PIN_LENGTH + "}$").test(signaturePin)) {
      return null;
    }

    return {
      nipp,
      nama,
      jabatan,
      kedudukanStasiun,
      password,
      signaturePin,
      is_super: !!isSuper,
      source: source || "unknown"
    };
  }

  function getConfigUsers() {
    const cfg = getAppConfig().raw;
    const users = [];

    if (Array.isArray(cfg.authUsers)) {
      cfg.authUsers.forEach((item) => {
        const normalized = normalizeUser(item, "config");
        if (normalized) {
          users.push(normalized);
        }
      });
    }

    if (!users.length) {
      const singleNipp = normalizeNipp(cfg.authNipp);
      const singlePassword = String(cfg.authPassword || "");
      const singleSignaturePin = String(cfg.authSignaturePin || "");
      if (singleNipp && singlePassword) {
        const normalizedSingle = normalizeUser(
          {
            nipp: singleNipp,
            nama: String(cfg.authNama || "").trim(),
            jabatan: String(cfg.authJabatan || "").trim(),
            kedudukanStasiun: String(cfg.authKedudukanStasiun || "").trim(),
            password: singlePassword,
            signaturePin: singleSignaturePin
          },
          "config"
        );
        if (normalizedSingle) {
          users.push(normalizedSingle);
        }
      }
    }

    return users;
  }

  function getStoredUsers() {
    try {
      const raw = localStorage.getItem(AUTH_USERS_STORAGE_KEY);
      const parsed = JSON.parse(raw || "[]");
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((item) => normalizeUser(item, "local"))
        .filter(Boolean);
    } catch (_err) {
      return [];
    }
  }

  function setStoredUsers(users) {
    localStorage.setItem(AUTH_USERS_STORAGE_KEY, JSON.stringify(users));
  }

  function getAuthUsers() {
    const merged = new Map();
    getConfigUsers().forEach((item) => {
      merged.set(item.nipp, item);
    });
    getStoredUsers().forEach((item) => {
      merged.set(item.nipp, item);
    });
    return Array.from(merged.values());
  }

  function getLocalStoredUserByNipp(nipp) {
    const normalizedNipp = normalizeNipp(nipp);
    if (!normalizedNipp) {
      return null;
    }

    return getStoredUsers().find((item) => item.nipp === normalizedNipp) || null;
  }

  function findUserByNipp(nipp) {
    const normalizedNipp = normalizeNipp(nipp);
    if (!normalizedNipp) {
      return null;
    }

    const users = getAuthUsers();
    return users.find((item) => item.nipp === normalizedNipp) || null;
  }

  function readSession() {
    try {
      const raw = localStorage.getItem(AUTH_SESSION_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return null;
      }

      const nipp = normalizeNipp(parsed.nipp);
      const expiresAt = Number(parsed.expiresAt || 0);
      if (!nipp || !Number.isFinite(expiresAt)) {
        return null;
      }

      if (Date.now() > expiresAt) {
        localStorage.removeItem(AUTH_SESSION_KEY);
        return null;
      }

      return {
        nipp,
        user: {
          nipp,
          nama: String((parsed.user && parsed.user.nama) || "").trim(),
          jabatan: String((parsed.user && parsed.user.jabatan) || "").trim(),
          kedudukanStasiun: String((parsed.user && parsed.user.kedudukanStasiun) || "").trim()
        },
        loginAt: Number(parsed.loginAt || 0),
        expiresAt
      };
    } catch (_err) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }
  }

  function saveSession(user, rememberMe) {
    const now = Date.now();
    const ttl = rememberMe ? REMEMBER_AUTH_TTL_MS : DEFAULT_AUTH_TTL_MS;
    const safeUser = {
      nipp: normalizeNipp(user && user.nipp),
      nama: String((user && user.nama) || "").trim(),
      jabatan: String((user && user.jabatan) || "").trim(),
      kedudukanStasiun: String((user && user.kedudukanStasiun) || "").trim(),
      is_super: !!(user && user.is_super)
    };
    const payload = {
      nipp: safeUser.nipp,
      user: safeUser,
      loginAt: now,
      expiresAt: now + ttl
    };

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(payload));
    return payload;
  }

  function isLoggedIn() {
    return !!readSession();
  }

  function getRedirectAfterLogin() {
    const fromStorage = sessionStorage.getItem(AUTH_REDIRECT_KEY);
    if (fromStorage) {
      sessionStorage.removeItem(AUTH_REDIRECT_KEY);
      return fromStorage;
    }

    return "index.html";
  }

  function redirectToLogin() {
    const currentTarget =
      String(window.location.pathname || "") +
      String(window.location.search || "") +
      String(window.location.hash || "");

    sessionStorage.setItem(AUTH_REDIRECT_KEY, currentTarget || "index.html");
    window.location.replace("login.html");
  }

  function redirectAfterLogin() {
    window.location.replace(getRedirectAfterLogin());
  }

  async function login(nipp, password, rememberMe) {
    const normalizedNipp = normalizeNipp(nipp);
    const normalizedPassword = String(password || "");

    if (hasRemoteAuth()) {
      const remoteResult = await callRemoteAuth("login", {
        nipp: normalizedNipp,
        password: normalizedPassword
      });

      if (!remoteResult.ok) {
        return {
          ok: false,
          message: remoteResult.message || "Login gagal"
        };
      }

      const remoteUser = remoteResult.data && remoteResult.data.user ? remoteResult.data.user : { nipp: normalizedNipp };
      const session = saveSession(remoteUser, !!rememberMe);
      return {
        ok: true,
        session,
        source: "remote"
      };
    }

    const users = getAuthUsers();

    if (!users.length) {
      return {
        ok: false,
        message: "Kredensial login belum dikonfigurasi di config.js"
      };
    }

    const matched = users.find((item) => item.nipp === normalizedNipp && item.password === normalizedPassword);

    if (!matched) {
      return {
        ok: false,
        message: "NIPP atau password tidak valid"
      };
    }

    const session = saveSession(matched, !!rememberMe);

    return {
      ok: true,
      session
    };
  }

  async function register(params) {
    const normalizedNipp = normalizeNipp(params && params.nipp);
    const normalizedNama = String((params && params.nama) || "").trim();
    const normalizedJabatan = String((params && params.jabatan) || "").trim();
    const normalizedKedudukanStasiun = String((params && params.kedudukanStasiun) || "").trim();
    const normalizedPassword = String((params && params.password) || "");
    const normalizedSignaturePin = String((params && params.signaturePin) || "");

    if (hasRemoteAuth()) {
      const remoteResult = await callRemoteAuth("register", {
        nipp: normalizedNipp,
        nama: normalizedNama,
        jabatan: normalizedJabatan,
        kedudukanStasiun: normalizedKedudukanStasiun,
        password: normalizedPassword,
        signaturePin: normalizedSignaturePin
      });

      if (!remoteResult.ok) {
        return {
          ok: false,
          message: remoteResult.message || "Pendaftaran gagal"
        };
      }

      return {
        ok: true,
        message: "Pendaftaran berhasil. Silakan login.",
        source: "remote"
      };
    }

    if (!/^\d{5,20}$/.test(normalizedNipp)) {
      return {
        ok: false,
        message: "NIPP harus berupa angka dengan panjang 5-20 digit"
      };
    }

    if (!normalizedNama) {
      return {
        ok: false,
        message: "Nama wajib diisi"
      };
    }

    if (!normalizedJabatan) {
      return {
        ok: false,
        message: "Jabatan wajib diisi"
      };
    }

    if (!normalizedKedudukanStasiun) {
      return {
        ok: false,
        message: "Kedudukan stasiun wajib diisi"
      };
    }

    if (normalizedPassword.length < 6) {
      return {
        ok: false,
        message: "Password minimal 6 karakter"
      };
    }

    if (!new RegExp("^\\d{" + SIGNATURE_PIN_LENGTH + "}$").test(normalizedSignaturePin)) {
      return {
        ok: false,
        message: "PIN tanda tangan harus " + SIGNATURE_PIN_LENGTH + " digit angka"
      };
    }

    if (findUserByNipp(normalizedNipp)) {
      return {
        ok: false,
        message: "NIPP sudah terdaftar"
      };
    }

    const storedUsers = getStoredUsers();
    storedUsers.push({
      nipp: normalizedNipp,
      nama: normalizedNama,
      jabatan: normalizedJabatan,
      kedudukanStasiun: normalizedKedudukanStasiun,
      password: normalizedPassword,
      signaturePin: normalizedSignaturePin,
      createdAt: new Date().toISOString()
    });
    setStoredUsers(storedUsers);

    return {
      ok: true,
      message: "Pendaftaran berhasil. Silakan login."
    };
  }

  async function lookupUserByNipp(nipp) {
    const normalizedNipp = normalizeNipp(nipp);

    if (!/^[0-9]{5,20}$/.test(normalizedNipp)) {
      return {
        ok: false,
        message: "NIPP harus berupa angka 5-20 digit"
      };
    }

    if (hasRemoteAuth()) {
      let remoteResult = await callRemoteAuth("profile", {
        nipp: normalizedNipp
      });

      if (!remoteResult.ok) {
        const fallbackMessage = String(remoteResult.message || "").toLowerCase();
        if (fallbackMessage.includes("action") || fallbackMessage.includes("tidak dikenali")) {
          remoteResult = await callRemoteAuth("lookup-user", {
            nipp: normalizedNipp
          });
        }
      }

      if (!remoteResult.ok) {
        return {
          ok: false,
          message: remoteResult.message || "Akun tidak ditemukan"
        };
      }

      return {
        ok: true,
        user: remoteResult.data && remoteResult.data.user ? remoteResult.data.user : { nipp: normalizedNipp },
        source: "remote",
        editable: true
      };
    }

    const localUser = findUserByNipp(normalizedNipp);
    if (localUser) {
      return {
        ok: true,
        user: {
          nipp: localUser.nipp,
          nama: localUser.nama || "",
          jabatan: localUser.jabatan || "",
          kedudukanStasiun: localUser.kedudukanStasiun || ""
        },
        source: localUser.source || "local",
        editable: localUser.source !== "config"
      };
    }

    return {
      ok: false,
      message: "Data akun tidak ditemukan"
    };
  }

  async function resetPasswordByNipp(params) {
    const normalizedNipp = normalizeNipp(params && params.nipp);
    const newPassword = String((params && params.password) || "");

    if (!/^[0-9]{5,20}$/.test(normalizedNipp)) {
      return {
        ok: false,
        message: "NIPP harus berupa angka 5-20 digit"
      };
    }

    if (newPassword.length < 6) {
      return {
        ok: false,
        message: "Password minimal 6 karakter"
      };
    }

    if (hasRemoteAuth()) {
      const remoteResult = await callRemoteAuth("reset-password", {
        nipp: normalizedNipp,
        password: newPassword
      });

      if (!remoteResult.ok) {
        return {
          ok: false,
          message: remoteResult.message || "Reset password gagal"
        };
      }

      return {
        ok: true,
        message: "Password berhasil diperbarui",
        source: "remote"
      };
    }

    const storedUsers = getStoredUsers();
    const userIndex = storedUsers.findIndex((item) => item.nipp === normalizedNipp);

    if (userIndex < 0) {
      const configUser = getConfigUsers().find((item) => item.nipp === normalizedNipp);
      if (configUser) {
        return {
          ok: false,
          message: "Password akun bawaan konfigurasi tidak bisa direset dari halaman login"
        };
      }

      return {
        ok: false,
        message: "Data akun tidak ditemukan"
      };
    }

    storedUsers[userIndex].password = newPassword;
    setStoredUsers(storedUsers);
    return {
      ok: true,
      message: "Password berhasil diperbarui",
      source: "local"
    };
  }

  function getCurrentUser() {
    const session = readSession();
    if (!session) {
      return null;
    }

    if (session.user && session.user.nipp && hasRemoteAuth()) {
      return {
        nipp: session.user.nipp,
        nama: String(session.user.nama || "").trim(),
        jabatan: String(session.user.jabatan || "").trim(),
        kedudukanStasiun: String(session.user.kedudukanStasiun || "").trim(),
        is_super: !!session.user.is_super,
        signaturePin: ""
      };
    }

    return findUserByNipp(session.nipp);
  }

  async function verifySignaturePin(pin) {
    const normalizedPin = String(pin || "").trim();
    const currentUser = getCurrentUser();

    if (!currentUser) {
      return {
        ok: false,
        message: "Sesi login tidak ditemukan. Silakan login ulang."
      };
    }

    if (!new RegExp("^\\d{" + SIGNATURE_PIN_LENGTH + "}$").test(normalizedPin)) {
      return {
        ok: false,
        message: "PIN harus " + SIGNATURE_PIN_LENGTH + " digit angka."
      };
    }

    if (hasRemoteAuth()) {
      const remoteResult = await callRemoteAuth("verify-pin", {
        nipp: currentUser.nipp,
        signaturePin: normalizedPin
      });

      if (!remoteResult.ok) {
        return {
          ok: false,
          message: remoteResult.message || "PIN tanda tangan tidak valid."
        };
      }

      return {
        ok: true,
        source: "remote"
      };
    }

    if (!currentUser.signaturePin) {
      return {
        ok: true
      };
    }

    if (currentUser.signaturePin !== normalizedPin) {
      return {
        ok: false,
        message: "PIN tanda tangan tidak sesuai dengan akun login."
      };
    }

    return {
      ok: true
    };
  }

  function logout() {
    localStorage.removeItem(AUTH_SESSION_KEY);
    window.location.replace("login.html");
  }

  function bindLogoutButtons() {
    const logoutButtons = document.querySelectorAll("[data-auth-logout]");
    if (!logoutButtons.length) return;

    logoutButtons.forEach((button) => {
      button.addEventListener("click", (ev) => {
        try {
          ev.preventDefault();
        } catch (e) {}
        const confirmText = "Keluar dari akun? Anda akan diminta untuk login kembali.";
        if (window.confirm(confirmText)) {
          logout();
        }
      });
    });
  }

  function protectPage() {
    const pageName = getPageName();
    const onLoginPage = pageName.toLowerCase() === "login.html";
    const session = readSession();
    const loggedIn = !!session;

    if (onLoginPage) {
      if (loggedIn) {
        redirectAfterLogin();
      }
      return;
    }

    if (!loggedIn) {
      redirectToLogin();
      return;
    }

    if (hasRemoteAuth() && (!session.user || !session.user.nama)) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      redirectToLogin();
    }
  }

  function init() {
    protectPage();
    bindLogoutButtons();
  }

  window.ChecklistAuth = {
    AUTH_SESSION_KEY,
    AUTH_USERS_STORAGE_KEY,
    hasRemoteAuth,
    getAuthUsers,
    getCurrentUser,
    getSession: readSession,
    isLoggedIn,
    login,
    register,
    lookupUserByNipp,
    resetPasswordByNipp,
    verifySignaturePin,
    logout,
    redirectAfterLogin
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
