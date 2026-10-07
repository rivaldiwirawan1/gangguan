(function () {
  function getEl(id) {
    return document.getElementById(id);
  }

  function setMessage(targetId, text, type) {
    const el = getEl(targetId);
    if (!el) {
      return;
    }

    el.textContent = text || "";
    el.classList.remove("is-error", "is-success");

    if (type === "error") {
      el.classList.add("is-error");
    }

    if (type === "success") {
      el.classList.add("is-success");
    }
  }

  function setFieldError(inputId, message) {
    const input = getEl(inputId);
    const errorEl = getEl(inputId + "Error");
    if (input) {
      input.classList.toggle("has-error", !!message);
      if (message) {
        input.setAttribute("aria-invalid", "true");
      } else {
        input.removeAttribute("aria-invalid");
      }
    }
    if (errorEl) {
      errorEl.textContent = message || "";
    }
  }

  function clearAuthFieldErrors() {
    [
      "loginNipp",
      "loginPassword",
      "registerNama",
      "registerJabatan",
      "registerKedudukan",
      "registerNipp",
      "registerPassword",
      "registerPin",
      "registerPinConfirm"
    ].forEach((id) => setFieldError(id, ""));
  }

  function setButtonLoading(buttonId, isLoading, loadingText, idleText) {
    const btn = getEl(buttonId);
    if (!btn) {
      return;
    }
    btn.disabled = !!isLoading;
    btn.classList.toggle("is-loading", !!isLoading);
    btn.textContent = isLoading ? loadingText : idleText;
  }

  function bindPasswordToggles() {
    const toggleButtons = document.querySelectorAll("[data-toggle-target]");
    toggleButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const targetId = String(button.getAttribute("data-toggle-target") || "").trim();
        const input = targetId ? getEl(targetId) : null;
        if (!input) {
          return;
        }

        const nextType = input.type === "password" ? "text" : "password";
        input.type = nextType;
        const showing = nextType === "text";
        button.textContent = showing ? "Sembunyi" : "Lihat";
        button.setAttribute("aria-label", showing ? "Sembunyikan isi" : "Tampilkan isi");
      });
    });
  }

  function clearForgotPasswordState() {
    ["forgotNipp", "forgotNewPassword", "forgotNewPasswordConfirm"].forEach((id) => {
      const input = getEl(id);
      if (input) {
        input.value = "";
      }
    });
    ["forgotNipp", "forgotNewPassword", "forgotNewPasswordConfirm"].forEach((id) => setFieldError(id, ""));
    setMessage("forgotLookupMessage", "", "");
    const accountCard = getEl("forgotAccountCard");
    const resetSection = getEl("forgotResetSection");
    if (accountCard) {
      accountCard.classList.add("auth-hidden");
    }
    if (resetSection) {
      resetSection.classList.add("auth-hidden");
    }
  }

  function showForgotPasswordPanel() {
    const panel = getEl("forgotPasswordPanel");
    const loginForm = getEl("loginForm");
    const registerForm = getEl("registerForm");
    const authCard = document.querySelector(".auth-card");

    clearForgotPasswordState();

    if (loginForm) {
      loginForm.classList.remove("auth-hidden");
    }
    if (registerForm) {
      registerForm.classList.add("auth-hidden");
    }
    if (panel) {
      panel.classList.remove("auth-hidden");
    }
    if (authCard) {
      authCard.classList.add("auth-card-wide");
    }

    const nippInput = getEl("forgotNipp");
    if (nippInput) {
      nippInput.focus();
    }
  }

  function hideForgotPasswordPanel() {
    const panel = getEl("forgotPasswordPanel");
    if (panel) {
      panel.classList.add("auth-hidden");
    }

    const authCard = document.querySelector(".auth-card");
    const registerVisible = !getEl("registerForm").classList.contains("auth-hidden");
    if (authCard && !registerVisible) {
      authCard.classList.remove("auth-card-wide");
    }

    clearForgotPasswordState();
  }

  function renderForgotAccount(user, editable) {
    const card = getEl("forgotAccountCard");
    const resetSection = getEl("forgotResetSection");
    const nameEl = getEl("forgotAccountName");
    const jabatanEl = getEl("forgotAccountJabatan");
    const kedudukanEl = getEl("forgotAccountKedudukan");

    if (!card || !resetSection) {
      return;
    }

    if (nameEl) {
      nameEl.textContent = user.nama || "-";
    }
    if (jabatanEl) {
      jabatanEl.textContent = user.jabatan || "-";
    }
    if (kedudukanEl) {
      kedudukanEl.textContent = user.kedudukanStasiun || user.kedudukan_stasiun || "-";
    }

    card.classList.remove("auth-hidden");
    if (editable) {
      resetSection.classList.remove("auth-hidden");
    } else {
      resetSection.classList.add("auth-hidden");
    }
  }

  async function handleForgotSearch() {
    clearAuthFieldErrors();
    setMessage("forgotLookupMessage", "", "");

    if (!window.ChecklistAuth || typeof window.ChecklistAuth.lookupUserByNipp !== "function") {
      setMessage("forgotLookupMessage", "Fitur pencarian akun belum tersedia.", "error");
      return;
    }

    const nipp = String(getEl("forgotNipp").value || "").trim();
    if (!/^\d{5,20}$/.test(nipp)) {
      setFieldError("forgotNipp", "NIPP harus berupa angka 5-20 digit.");
      setMessage("forgotLookupMessage", "Periksa NIPP yang dimasukkan.", "error");
      return;
    }

    setButtonLoading("forgotSearchSubmit", true, "Mencari...", "Cari Akun");
    let result;
    try {
      result = await window.ChecklistAuth.lookupUserByNipp(nipp);
    } finally {
      setButtonLoading("forgotSearchSubmit", false, "Mencari...", "Cari Akun");
    }

    if (!result.ok) {
      setMessage("forgotLookupMessage", result.message || "Akun tidak ditemukan.", "error");
      return;
    }

    renderForgotAccount(result.user, result.editable !== false);
    setMessage("forgotLookupMessage", "Data akun ditemukan. Silakan atur password baru.", "success");
  }

  async function handleForgotReset() {
    clearAuthFieldErrors();
    setMessage("forgotLookupMessage", "", "");

    const nipp = String(getEl("forgotNipp").value || "").trim();
    const newPassword = String(getEl("forgotNewPassword").value || "");
    const newPasswordConfirm = String(getEl("forgotNewPasswordConfirm").value || "");

    let invalid = false;

    if (!/^\d{5,20}$/.test(nipp)) {
      setFieldError("forgotNipp", "NIPP harus berupa angka 5-20 digit.");
      invalid = true;
    }

    if (newPassword.length < 6) {
      setFieldError("forgotNewPassword", "Password minimal 6 karakter.");
      invalid = true;
    }

    if (newPassword !== newPasswordConfirm) {
      setFieldError("forgotNewPasswordConfirm", "Konfirmasi password tidak sama.");
      invalid = true;
    }

    if (invalid) {
      setMessage("forgotLookupMessage", "Periksa kembali password baru.", "error");
      return;
    }

    if (!window.ChecklistAuth || typeof window.ChecklistAuth.resetPasswordByNipp !== "function") {
      setMessage("forgotLookupMessage", "Fitur reset password belum tersedia.", "error");
      return;
    }

    setButtonLoading("forgotResetSubmit", true, "Menyimpan...", "Reset Password");
    let result;
    try {
      result = await window.ChecklistAuth.resetPasswordByNipp({ nipp, password: newPassword });
    } finally {
      setButtonLoading("forgotResetSubmit", false, "Menyimpan...", "Reset Password");
    }

    if (!result.ok) {
      setMessage("forgotLookupMessage", result.message || "Reset password gagal.", "error");
      return;
    }

    setMessage("forgotLookupMessage", "Password berhasil diubah. Silakan login dengan password baru.", "success");
    getEl("loginNipp").value = nipp;
    getEl("loginPassword").value = "";
    hideForgotPasswordPanel();
    activateTab("login");
  }

  function activateTab(mode) {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const forgotPanel = document.getElementById("forgotPasswordPanel");
    const authCard = document.querySelector(".auth-card");
    const tabs = document.querySelectorAll("[data-auth-tab]");

    tabs.forEach((tab) => {
      const tabMode = tab.getAttribute("data-auth-tab");
      const active = tabMode === mode;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    if (loginForm && registerForm) {
      loginForm.classList.toggle("auth-hidden", mode !== "login");
      registerForm.classList.toggle("auth-hidden", mode !== "register");
    }

    if (forgotPanel) {
      forgotPanel.classList.toggle("auth-hidden", mode !== "login");
      if (mode !== "login") {
        clearForgotPasswordState();
      }
    }

    if (authCard) {
      authCard.classList.toggle("auth-card-wide", mode === "register" || (mode === "login" && forgotPanel && !forgotPanel.classList.contains("auth-hidden")));
    }

    if (mode === "login") {
      const nippInput = document.getElementById("loginNipp");
      if (nippInput) {
        nippInput.focus();
      }
    }

    if (mode === "register") {
      const nippInput = document.getElementById("registerNipp");
      if (nippInput) {
        nippInput.focus();
      }
    }
  }

  function bindAuthTabs() {
    const tabs = document.querySelectorAll("[data-auth-tab]");
    if (!tabs.length) {
      return;
    }

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const mode = tab.getAttribute("data-auth-tab") || "login";
        activateTab(mode);
      });
    });
  }

  function initLoginForm() {
    const loginForm = getEl("loginForm");
    const registerForm = getEl("registerForm");
    if (!loginForm || !registerForm) {
      return;
    }

    bindAuthTabs();
    bindPasswordToggles();
    activateTab("login");

    const openForgotPasswordButton = getEl("openForgotPassword");
    const backToLoginButton = getEl("backToLogin");
    const forgotSearchButton = getEl("forgotSearchSubmit");
    const forgotResetButton = getEl("forgotResetSubmit");

    if (openForgotPasswordButton) {
      openForgotPasswordButton.addEventListener("click", showForgotPasswordPanel);
    }

    if (backToLoginButton) {
      backToLoginButton.addEventListener("click", () => {
        hideForgotPasswordPanel();
      });
    }

    if (forgotSearchButton) {
      forgotSearchButton.addEventListener("click", handleForgotSearch);
    }

    if (forgotResetButton) {
      forgotResetButton.addEventListener("click", handleForgotReset);
    }

    if (!window.ChecklistAuth || typeof window.ChecklistAuth.login !== "function") {
      setMessage("loginMessage", "Sistem autentikasi gagal dimuat. Coba refresh halaman.", "error");
      return;
    }

    const users = window.ChecklistAuth.getAuthUsers();
    if (!users.length) {
      setMessage("loginMessage", "Belum ada akun. Silakan gunakan menu Daftar.", "error");
    }

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearAuthFieldErrors();
      setMessage("loginMessage", "", "");

      const nipp = String(getEl("loginNipp").value || "").trim();
      const password = String(getEl("loginPassword").value || "");
      const rememberMe = !!getEl("rememberMe").checked;

      let invalid = false;

      if (!/^\d{5,20}$/.test(nipp)) {
        setFieldError("loginNipp", "NIPP harus berupa angka 5-20 digit.");
        invalid = true;
      }

      if (!password) {
        setFieldError("loginPassword", "Password wajib diisi.");
        invalid = true;
      }

      if (invalid) {
        setMessage("loginMessage", "Periksa kembali data login kamu.", "error");
        return;
      }

      setButtonLoading("loginSubmit", true, "Memproses...", "Login");
      let result;
      try {
        result = await window.ChecklistAuth.login(nipp, password, rememberMe);
      } finally {
        setButtonLoading("loginSubmit", false, "Memproses...", "Login");
      }

      if (!result.ok) {
        const rawMessage = String(result.message || "Login gagal");
        const lower = rawMessage.toLowerCase();
        let finalMessage = rawMessage;
        if (lower.includes("terhubung") || lower.includes("network")) {
          finalMessage = "Jaringan bermasalah. Cek koneksi lalu coba lagi.";
        } else if (lower.includes("token") || lower.includes("endpoint")) {
          finalMessage = "Konfigurasi server auth belum benar. Hubungi admin.";
        }
        setMessage("loginMessage", finalMessage, "error");
        return;
      }

      setMessage("loginMessage", "Login berhasil. Mengalihkan...", "success");
      window.ChecklistAuth.redirectAfterLogin();
    });

    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearAuthFieldErrors();
      setMessage("registerMessage", "", "");

      if (typeof window.ChecklistAuth.register !== "function") {
        setMessage("registerMessage", "Fitur pendaftaran tidak tersedia.", "error");
        return;
      }

      const nipp = String(getEl("registerNipp").value || "").trim();
      const nama = String(getEl("registerNama").value || "").trim();
      const jabatan = String(getEl("registerJabatan").value || "").trim();
      const kedudukanStasiun = String(getEl("registerKedudukan").value || "").trim();
      const password = String(getEl("registerPassword").value || "");
      const pin = String(getEl("registerPin").value || "").trim();
      const pinConfirm = String(getEl("registerPinConfirm").value || "").trim();

      let invalid = false;

      if (!nama) {
        setFieldError("registerNama", "Nama wajib diisi.");
        invalid = true;
      }

      if (!jabatan) {
        setFieldError("registerJabatan", "Jabatan wajib diisi.");
        invalid = true;
      }

      if (!kedudukanStasiun) {
        setFieldError("registerKedudukan", "Kedudukan stasiun wajib diisi.");
        invalid = true;
      }

      if (!/^\d{5,20}$/.test(nipp)) {
        setFieldError("registerNipp", "NIPP harus berupa angka 5-20 digit.");
        invalid = true;
      }

      if (password.length < 6) {
        setFieldError("registerPassword", "Password minimal 6 karakter.");
        invalid = true;
      }

      if (!/^\d{6}$/.test(pin)) {
        setFieldError("registerPin", "PIN tanda tangan harus 6 digit angka.");
        invalid = true;
      }

      if (pin !== pinConfirm) {
        setFieldError("registerPinConfirm", "Konfirmasi PIN tidak sama.");
        invalid = true;
      }

      if (invalid) {
        setMessage("registerMessage", "Periksa kembali data pendaftaran kamu.", "error");
        return;
      }

      setButtonLoading("registerSubmit", true, "Memproses...", "Daftar Akun");
      let result;
      try {
        result = await window.ChecklistAuth.register({
          nipp,
          nama,
          jabatan,
          kedudukanStasiun,
          password,
          signaturePin: pin
        });
      } finally {
        setButtonLoading("registerSubmit", false, "Memproses...", "Daftar Akun");
      }

      if (!result.ok) {
        const rawMessage = String(result.message || "Pendaftaran gagal");
        const lower = rawMessage.toLowerCase();
        let finalMessage = rawMessage;
        if (lower.includes("terhubung") || lower.includes("network")) {
          finalMessage = "Jaringan bermasalah. Cek koneksi lalu coba lagi.";
        } else if (lower.includes("token") || lower.includes("endpoint")) {
          finalMessage = "Konfigurasi server auth belum benar. Hubungi admin.";
        }
        setMessage("registerMessage", finalMessage, "error");
        return;
      }

      setMessage("registerMessage", "Pendaftaran berhasil. Silakan login.", "success");
      getEl("registerPassword").value = "";
      getEl("registerPin").value = "";
      getEl("registerPinConfirm").value = "";
      getEl("loginNipp").value = nipp;
      activateTab("login");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLoginForm);
  } else {
    initLoginForm();
  }
})();
