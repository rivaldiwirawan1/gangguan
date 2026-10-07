document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.ChecklistAuth;
  const cfg = window.APP_CONFIG || {};

  function setAvatar(name) {
    const el = document.querySelector(".user-nav .avatar");
    if (!el) return;
    const initials = (String(name || "").trim() || "?")
      .split(" ")
      .map((s) => s.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
    el.textContent = initials || "--";
  }

  function setUsername(name) {
    const el = document.getElementById("navUsername");
    if (!el) return;
    el.textContent = String(name || "Pengguna");
  }

  function setNipp(nipp) {
    const el = document.getElementById("navNipp");
    if (!el) return;
    el.textContent = String(nipp || "-");
  }

  function setJabatan(jabatan) {
    const el = document.getElementById("navJabatan");
    if (!el) return;
    el.textContent = String(jabatan || "-");
  }

  try {
    if (!auth || !auth.isLoggedIn || !auth.isLoggedIn()) return;

    let user = auth.getCurrentUser();
    if (user) {
      if (user.nama) setUsername(user.nama);
      if (user.nama) setAvatar(user.nama);
      if (user.nipp) setNipp(user.nipp);
      if (user.jabatan) setJabatan(user.jabatan);
    }

    // expose super status for other UI scripts
    try { window.CURRENT_USER = window.CURRENT_USER || {}; window.CURRENT_USER.is_super = !!(user && user.is_super); } catch (e) {}
    // show admin link if super
    try {
      const adminLink = document.getElementById("adminLink");
      if (adminLink) {
        if (user && user.is_super) {
          adminLink.style.display = "block";
        } else {
          adminLink.style.display = "none";
        }
      }
    } catch (e) {}

    // If remote auth configured, try to refresh profile from server
    if (auth.hasRemoteAuth && auth.hasRemoteAuth() && cfg.authEndpoint && cfg.apiToken && user && user.nipp) {
      try {
        const controller = new AbortController();
        const res = await fetch(cfg.authEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + String(cfg.apiToken || "")
          },
          body: JSON.stringify({ action: "profile", nipp: user.nipp }),
          signal: controller.signal
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.ok && data.user) {
            const u = data.user;
            if (u.nama) setUsername(u.nama);
            if (u.nama) setAvatar(u.nama);
            if (u.nipp) setNipp(u.nipp);
            if (u.jabatan) setJabatan(u.jabatan);
            // if avatar_url available, replace avatar element with image
            if (u.avatar_url) {
              const avEl = document.querySelector(".user-nav .avatar");
              if (avEl) {
                const img = document.createElement("img");
                img.src = u.avatar_url;
                img.alt = u.nama || "avatar";
                img.style.width = "100%";
                img.style.height = "100%";
                img.style.objectFit = "cover";
                img.style.borderRadius = "999px";
                avEl.textContent = "";
                avEl.appendChild(img);
              }
            }
          }
        }
      } catch (e) {
        // ignore network/profile errors
      }
    }
  } catch (err) {
    // silent
  }

  // Profile dialog: open when clicking profile link
  try {
    const profileLink = document.getElementById("profileLink");
    const dialog = document.getElementById("profileDialog");
    if (profileLink && dialog) {
      const viewSection = document.getElementById("profileView");
      const editSection = document.getElementById("profileEditSection");
      const btnEdit = document.getElementById("profileEdit");
      const btnSave = document.getElementById("profileSave");
      const btnCancel = document.getElementById("profileCancel");
      const feedback = document.getElementById("profileSaveFeedback");

      function setFeedback(message, type) {
        if (!feedback) return;
        feedback.textContent = String(message || "");
        feedback.classList.remove("success", "error", "loading");
        if (type) feedback.classList.add(type);
      }

      function setEditingMode(isEdit) {
        if (viewSection) viewSection.style.display = isEdit ? "none" : "block";
        if (editSection) editSection.style.display = isEdit ? "block" : "none";
        if (btnEdit) btnEdit.style.display = isEdit ? "none" : "inline-grid";
        if (btnSave) btnSave.style.display = isEdit ? "inline-grid" : "none";
        if (btnCancel) btnCancel.style.display = isEdit ? "inline-grid" : "none";
      }

      function setSaveBusy(isBusy) {
        if (!btnSave) return;
        btnSave.disabled = !!isBusy;
        btnSave.classList.toggle("is-busy", !!isBusy);
      }

      function setAvatarInDialog(avatarUrl, name) {
        const av = document.getElementById("profileAvatar");
        if (!av) return;
        av.innerHTML = "";
        if (avatarUrl) {
          const img = document.createElement("img"); img.src = avatarUrl; img.alt = name || "avatar"; av.appendChild(img);
        } else {
          av.textContent = (String(name || "").trim() || "--").split(" ").map(s=>s[0]?.toUpperCase()||"").slice(0,2).join("") || "--";
        }
      }

      async function openProfileDialog() {
        let user = null;
        try { user = auth && typeof auth.getCurrentUser === "function" ? auth.getCurrentUser() : null; } catch (e) { user = null; }

        const name = (user && user.nama) || document.getElementById("navUsername")?.textContent || "Pengguna";
        const nipp = (user && user.nipp) || document.getElementById("navNipp")?.textContent || "-";
        const jabatan = (user && user.jabatan) || document.getElementById("navJabatan")?.textContent || "-";
        const kedudukanStasiun = (user && user.kedudukanStasiun) || "";
        const email = (user && user.email) || "";
        const avatarUrl = (user && user.avatar_url) || "";
        const sigStatus = (user && user.signaturePin) ? "Tersedia" : "Belum";

        // view mode
        const elName = document.getElementById("profileName"); if (elName) elName.textContent = name;
        const elNipp = document.getElementById("profileNipp"); if (elNipp) elNipp.textContent = nipp;
        const elJabatan = document.getElementById("profileJabatan"); if (elJabatan) elJabatan.textContent = jabatan;
        const elKedudukan = document.getElementById("profileKedudukan"); if (elKedudukan) elKedudukan.textContent = kedudukanStasiun || "-";
        const elEmail = document.getElementById("profileEmail"); if (elEmail) elEmail.textContent = email || "-";
        const elSig = document.getElementById("profileSignatureStatus"); if (elSig) elSig.textContent = sigStatus;
        setAvatarInDialog(avatarUrl, name);

        // prepare edit inputs
        const inName = document.getElementById("profileNameInput"); if (inName) inName.value = name;
        const inJabatan = document.getElementById("profileJabatanInput"); if (inJabatan) inJabatan.value = jabatan;
        const inKedudukan = document.getElementById("profileKedudukanInput"); if (inKedudukan) inKedudukan.value = kedudukanStasiun || "";
        const inEmail = document.getElementById("profileEmailInput"); if (inEmail) inEmail.value = email || "";
        const inAvatarUrl = document.getElementById("profileAvatarUrlInput"); if (inAvatarUrl) inAvatarUrl.value = avatarUrl || "";

        // reset buttons/view
        setEditingMode(false);
        setSaveBusy(false);
        setFeedback("", "");

        try { if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", ""); } catch (e) { dialog.setAttribute("open", ""); }
      }

      profileLink.addEventListener("click", (ev) => { ev.preventDefault(); openProfileDialog(); });

      // Edit
      if (btnEdit) btnEdit.addEventListener("click", (e) => {
        e.preventDefault();
        setEditingMode(true);
        setFeedback("Mode edit aktif.", "loading");
      });

      // Cancel
      if (btnCancel) btnCancel.addEventListener("click", (e) => {
        e.preventDefault();
        setEditingMode(false);
        setFeedback("Perubahan dibatalkan.", "error");
      });

      // Save
      if (btnSave) btnSave.addEventListener("click", (e) => {
        e.preventDefault();
        setSaveBusy(true);
        setFeedback("Menyimpan perubahan profil...", "loading");
        try {
          const inName = document.getElementById("profileNameInput");
          const inJabatan = document.getElementById("profileJabatanInput");
          const inKedudukan = document.getElementById("profileKedudukanInput");
          const inEmail = document.getElementById("profileEmailInput");
          const inAvatarUrl = document.getElementById("profileAvatarUrlInput");

          const newName = inName ? String(inName.value || "").trim() : "";
          const newJabatan = inJabatan ? String(inJabatan.value || "").trim() : "";
          const newKedudukan = inKedudukan ? String(inKedudukan.value || "").trim() : "";
          const newEmail = inEmail ? String(inEmail.value || "").trim() : "";
          const newAvatar = inAvatarUrl ? String(inAvatarUrl.value || "").trim() : "";

          if (!newName) {
            setFeedback("Nama tidak boleh kosong.", "error");
            setSaveBusy(false);
            return;
          }

          if (newEmail && !/^\S+@\S+\.\S+$/.test(newEmail)) {
            setFeedback("Format email tidak valid.", "error");
            setSaveBusy(false);
            return;
          }

          // persist to localStorage users and session
          try {
            const usersKey = (auth && auth.AUTH_USERS_STORAGE_KEY) || "checklist-auth-users";
            const sessionKey = (auth && auth.AUTH_SESSION_KEY) || "checklist-auth-session";
            // update stored users
            const rawUsers = localStorage.getItem(usersKey);
            let parsedUsers = [];
            try { parsedUsers = rawUsers ? JSON.parse(rawUsers) : []; } catch (err) { parsedUsers = []; }
            const elNipp = document.getElementById("profileNipp");
            const curNipp = elNipp ? String(elNipp.textContent || "").trim() : "";
            if (curNipp) {
              let found = false;
              parsedUsers = Array.isArray(parsedUsers) ? parsedUsers : [];
              parsedUsers = parsedUsers.map((u) => {
                if (String(u.nipp || "") === curNipp) {
                  found = true;
                  return Object.assign({}, u, {
                    nama: newName || u.nama,
                    jabatan: newJabatan || u.jabatan,
                    kedudukanStasiun: newKedudukan || u.kedudukanStasiun,
                    email: newEmail || u.email,
                    avatar_url: newAvatar || u.avatar_url
                  });
                }
                return u;
              });
              if (!found) {
                parsedUsers.push({ nipp: curNipp, nama: newName, jabatan: newJabatan, kedudukanStasiun: newKedudukan, email: newEmail, avatar_url: newAvatar, createdAt: new Date().toISOString() });
              }
              localStorage.setItem(usersKey, JSON.stringify(parsedUsers));
            }

            // update session user if exists
            try {
              const rawSession = localStorage.getItem(sessionKey);
              if (rawSession) {
                const parsed = JSON.parse(rawSession);
                if (parsed && parsed.nipp && parsed.user && String(parsed.nipp || "") === curNipp) {
                  parsed.user.nama = newName || parsed.user.nama;
                  parsed.user.jabatan = newJabatan || parsed.user.jabatan;
                  parsed.user.kedudukanStasiun = newKedudukan || parsed.user.kedudukanStasiun;
                  localStorage.setItem(sessionKey, JSON.stringify(parsed));
                }
              }
            } catch (err) {}
          } catch (err) {}

          // update UI
          const elName = document.getElementById("profileName"); if (elName) elName.textContent = newName || elName.textContent;
          const elJabatan = document.getElementById("profileJabatan"); if (elJabatan) elJabatan.textContent = newJabatan || elJabatan.textContent;
          const elKedudukan = document.getElementById("profileKedudukan"); if (elKedudukan) elKedudukan.textContent = newKedudukan || elKedudukan.textContent || "-";
          const elEmailView = document.getElementById("profileEmail"); if (elEmailView) elEmailView.textContent = newEmail || elEmailView.textContent || "-";
          setAvatarInDialog(newAvatar, newName);
          // update header
          setUsername(newName || undefined);
          setJabatan(newJabatan || undefined);
          setAvatar(newName || undefined);

          // switch back to view
          setEditingMode(false);
          setFeedback("Profil berhasil diperbarui.", "success");

        } catch (err) {
          console.error("Gagal menyimpan profil:", err);
          setFeedback("Gagal menyimpan profil.", "error");
        } finally {
          setSaveBusy(false);
        }
      });

      const closeBtn = document.getElementById("closeProfile");
      if (closeBtn) closeBtn.addEventListener("click", (e) => { e.preventDefault(); try { dialog.close(); } catch (err) { dialog.removeAttribute("open"); } });
    }
  } catch (e) {}
});
