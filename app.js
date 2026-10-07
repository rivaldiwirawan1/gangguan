const STORAGE_KEY = "checklist-penanganan-gangguan";
const TELEMETRY_KEY = "checklist-telemetry";
const OUTBOX_KEY = "checklist-outbox";
const MAX_KETERANGAN_LENGTH = 1000;
const AUTOSAVE_DELAY_MS = 600;
const SIGNATURE_PIN_LENGTH = 6;
const API_TIMEOUT_MS = 12000;

function getAppConfig() {
  const cfg = window.APP_CONFIG && typeof window.APP_CONFIG === "object" ? window.APP_CONFIG : {};
  const rawToken = String(cfg.apiToken || "").trim();
  const token = (rawToken === "CHECKLIST_API_TOKEN" || rawToken === "YOUR_CHECKLIST_API_TOKEN") ? "" : rawToken;
  return {
    apiEndpoint: String(cfg.apiEndpoint || "").trim(),
    apiToken: token
  };
}

function getOutbox() {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Gagal membaca outbox:", err);
    return [];
  }
}

function setOutbox(items) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
}

function enqueueOutbox(item) {
  const next = getOutbox();
  next.push(item);
  setOutbox(next.slice(-100));
}

function getRequestId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return "req-" + Date.now() + "-" + Math.random().toString(16).slice(2, 10);
}

async function postChecklistToApi(payload) {
  const config = getAppConfig();
  if (!config.apiEndpoint) {
    return { ok: false, reason: "missing-endpoint" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const headers = {
      "Content-Type": "application/json"
    };

    if (config.apiToken) {
      headers.Authorization = "Bearer " + config.apiToken;
    }

    const response = await fetch(config.apiEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      const responseText = await response.text();
      return { ok: false, reason: "http-error", status: response.status, body: responseText };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, reason: "network-error", error: String(err && err.message ? err.message : err) };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function syncOutbox() {
  const items = getOutbox();
  if (!items.length) {
    return;
  }

  const remaining = [];
  for (let i = 0; i < items.length; i += 1) {
    const result = await postChecklistToApi(items[i]);
    if (!result.ok) {
      remaining.push(items[i]);
    }
  }

  setOutbox(remaining);

  if (remaining.length === 0) {
    showToast("Sinkronisasi data tertunda berhasil.");
    trackEvent("outbox_sync_success", { count: items.length });
  }
}

    const gangguanConfig = {
      sinyal: {
        label: "Isyarat Perintah Masuk",
        subtitle: "Checklist untuk isyarat perintah masuk pada saat gangguan sinyal",
        checklistByType: {
          mekanik: [
            "Lapor PPKP",
            "Lapor Unit Sintel",
            "Memberikan informasi ke stasiun sebelahnya",
            "KA yang masuk terlebih dahulu di jalur lain telah berhenti betul dan berada diantara S.18 pada jalur tersebut",
            "Gerakan langsiran yang mengarah ke jalur yang akan dilalui KA telah dihentikan",
            "Semua petugas terkait sudah ditempatnya masing-masing",
            "Pastikan jalur dan wesel yang akan dilalui KA bebas dari rintangan",
            "Pastikan kedudukan handal wesel telah sesuai dengan PDPS, plombir hendel tidak putus dan roda hendel tidak melorot",
            "Pastikan ruang pelayanan sinyal aman terkunci ketika ditinggalkan",
            "Cek kedudukan lidah wesel rapat mengarah ke jalur yang akan dilalui KA",
            "Wesel yang akan dilalui dari arah muka harus dipasang apitan lidah wesel dan apitan lidah wesel dikunci gembok",
            "Perlihatkan S.4A di depan wesel ujung, yang terlihat jelas dari KA yang berhenti di muka sinyal masuk",
            "Jika KA tidak bergerak, maju sampai S.4A terlihat oleh masinis",
            "Catat di lapka",
            "Catat di buku WK dan disebutkan sinyal-sinyal yang boleh dilalui"
          ],
          elektrik: [
            "Lapor PPKP",
            "Lapor Unit Sintel",
            "Memberikan informasi ke stasiun sebelahnya",
            "KA yang masuk terlebih dahulu di jalur lain telah berhenti betul dan berada diantara S.18 pada jalur tersebut",
            "Gerakan langsiran yang mengarah ke jalur yang akan dilalui KA telah dihentikan",
            "Semua petugas terkait sudah ditempatnya masing-masing",
            "Pastikan jalur dan wesel yang akan dilalui KA bebas dari rintangan",
            "Pastikan tampilan track wesel di LCP atau VDU normal",
            "Pastikan ruang pelayanan sinyal aman terkunci ketika ditinggalkan",
            "Cek kedudukan lidah wesel rapat mengarah ke jalur yang akan dilalui KA",
            "Wesel yang akan dilalui dari arah muka harus dipasang apitan lidah wesel dan apitan lidah wesel dikunci gembok",
            "Catat di lapka",
            "Catat di buku WK dan disebutkan sinyal-sinyal yang boleh dilalui"
          ]
        }
      },
      wesel: {
        label: "Pemberian MS Sinyal Masuk Pada Saat LCP Atau VDU Padam",
        subtitle: "Pemeriksaan fokus pada kondisi wesel dan penguncian jalur.",
        checklistByType: {
          mekanik: [
            //"Lapor PPKP dan konfirmasi nomor wesel yang terganggu",
            //"Pasang pengamanan area kerja sebelum pemeriksaan",
            //"Periksa kondisi batang penggerak wesel secara visual",
            //"Pastikan pengunci wesel dapat masuk dan menahan lidah wesel",
            //"Cek indikasi rapat-tidak rapat pada lidah wesel",
            //"Lakukan penguncian manual dan pasang gembok wesel",
            //"Konfirmasi posisi wesel ke petugas lapangan",
            //"Catat hasil pemeriksaan pada buku WK"
          ],
          elektrik: [
            "Cek kondisi peralatan sinyal dilapangan padam atau masih menyala",
            "Lapor PPKP",
            "Lapor Unit Sintel",
            "Memberikan informasi ke stasiun sebelahnya",
            "Inventarisir posisi KA yang ada di emplasemen stasiun dan yang mengarah ke stasiun kita",
            "KA yang masuk terlebih dahulu, telah berhenti betul dan berada diantara S.18 pada jalur tersebut",
            "Gerakan langsiran sudah berhenti dan posisi sarana berada diantara S.18",
            "Koordinasi dengan PPKP rencana prioritas pergerakan KA",
            "Semua petugas terkait sudah ditempatnya masing-masing",
            "Sebelum menerima dan memberangkatkan KA Pastikan jalur dan wesel yang akan dilalui KA bebas dari rintangan",
            "Pastikan ruang pelayanan sinyal aman terkunci ketika ditinggalkan",
            "Cek kedudukan lidah wesel rapat mengarah ke jalur yang akan dilalui KA",
            "Wesel yang akan dilalui dari arah muka harus dipasang apitan lidah wesel dan apitan lidah wesel dikunci gembok",
            "Menerima & Memberangkatkan KA Menggunakan MS",
            "Catat di buku WK ",
            "Pastikan PPKA melayani TBMS setelah memberangkatkan KA",
            "Catat dalam buku gangguan"

          ]
        }
      },
      perlintasan: {
        label: "PEMBERIAN IPM PADA SAAT LCP & VDU PADAM",
        subtitle: "Checklist untuk pemberian IPM pada saat LCP dan VDU padam.",
        checklistByType: {
          mekanik: [
            //"Lapor PPKP tentang gangguan perlintasan",
            //"Kirim petugas jaga tambahan ke lokasi perlintasan",
            //"Pastikan penutupan pintu dilakukan manual",
            //"Pasang rambu sementara dan alat isyarat darurat",
            //"Koordinasikan kecepatan terbatas untuk KA melintas",
            //"Pastikan komunikasi radio aktif selama penjagaan",
            //"Catat setiap KA yang melintas saat mode manual",
            //"Laporkan hasil penjagaan ke pengatur perjalanan"
          ],
          elektrik: [
            "Lapor PPKP dan Unit Sintel terkait gangguan perlintasan",
            "Periksa status kontrol perlintasan pada panel",
            "Cek sumber daya utama dan cadangan",
            "Uji sensor pendekat/track terkait aktivasi perlintasan",
            "Aktifkan prosedur penutupan manual jika otomasi gagal",
            "Koordinasikan petugas lapangan untuk memberi sinyal aman",
            "Pastikan semua log kejadian tercatat",
            "Lakukan uji normalisasi setelah perbaikan"
          ]
        }
      },
      ms_sinyal_keluar: {
        label: "Pemberian MS Sinyal Keluar Pada Saat LCP Atau VDU Padam",
        subtitle: "Checklist untuk pemberian MS Sinyal Keluar pada saat LCP atau VDU padam.",
        checklistByType: {
          mekanik: [
            //"Lapor PPKP dan konfirmasi nomor sinyal keluar yang terganggu",
            //"Pasang pengamanan area kerja sebelum pemeriksaan",
            //"Periksa kondisi mekanisme penggerak sinyal keluar secara visual",
            //"Pastikan pengunci sinyal keluar dapat masuk dan menahan posisi sinyal",
            //"Cek indikasi posisi sinyal keluar pada lapka"  ,
            //"Lakukan penguncian manual dan pasang gembok pada sinyal keluar",
            //"Konfirmasi posisi sinyal keluar ke petugas lapangan",
            //"Catat hasil pemeriksaan pada buku WK"
          ],
          elektrik: [
            "Cek kondisi peralatan sinyal keluar dilapangan padam atau masih menyala",
            "Lapor PPKP",
            "Lapor Unit Sintel",
            "Memberikan informasi ke stasiun sebelahnya",
            "Inventarisir posisi KA yang ada di emplasemen stasiun dan yang mengarah ke stasiun kita",
            "KA yang masuk terlebih dahulu, telah berhenti betul dan berada diantara S.18 pada jalur tersebut",
            "Gerakan langsiran sudah berhenti dan posisi sarana berada diantara S.18",
            "KA yang berangkat terlebih dahulu, telah diwartakan masuk oleh stasiun didepan kita",
            "Sebelum memberangkatkan KA Pastikan jalur dan wesel yang akan dilalui KA bebas dari rintangan",
            "Cek kedudukan lidah wesel rapat mengarah ke jalur yang akan dilalui KA",
            "Wesel yang akan dilalui dari arah muka harus dipasang apitan lidah wesel dan apitan lidah wesel dikunci gembok",
            "Memberangkatkan KA menggunakan MS/MS Suara                           ",
            "Lakukan warta KA dan catat di buku WK. ",
            "Catat dalam buku gangguan"
          ]
        }
      },
      gagal_balik: {
        label: "Penanganan Gagal Balik Wesel",
        subtitle: "Checklist untuk penanganan gagal balik wesel.",
        checklistByType: {
          mekanik: [
            "Lapor PPKP tentang gagal balik wesel",
            "Pasang pengamanan area kerja sebelum pemeriksaan",
            "Periksa kondisi mekanisme penggerak wesel secara visual",
            "Pastikan tidak ada kerusakan fisik pada komponen wesel",
            "Lakukan reset manual pada mekanisme jika memungkinkan",
            "Koordinasikan dengan petugas lapangan untuk pengamanan jalur",
            "Catat hasil pemeriksaan dan tindakan pada buku WK"
          ],
          elektrik: [
            "Cek kondisi wesel dilapangan ada ganjalan atau tidak",
            "Pada saat cek wesel pastikan membawa minyak pelumas dan engkol untuk persiapan ",
            "Setelah dipastikan tidak ada ganjalan coba bolak balik wesel dengan tombol TKW",
            "Setelah di coba bolak balik wesel tetap gagal lapor petugas sintel, PPKP dan catat dalam buku gangguan",
            "Untuk pelayanan Perka koordinasi dengan PPKP, kalau memungkinkan dialihkan ke jalur lain dengan tetap mengutamakan keselamatan Perka dan pelayanan penumpang",
            "Sambil menunggu petugas sintel, coba balik wesel dengan engkol (pastikan kondisi wesel secara fisik aman)",
            "Setelah diengkol wesel berhasil dibalik, coba set rute. Untuk kondisi darurat ketika wesel bisa atau tidak bisa dibalik dan rute tidak terbentuk, wesel agar dipasang apitan lidah wesel.",
            "Selanjutnya Pelayanan KA menggunakan IPM atau MS",
            "Setelah perbaikan selesai oleh unit Sintel atau Jalan rel, laporkan kembali kondisi normal ke PPKP dan catat dalam buku gangguan"
          ]
        }
      },
      wesel_kedip: {
        label: "Penanganan Wesel Kedip",
        subtitle: "Checklist untuk penanganan wesel kedip.",
        checklistByType: {
          mekanik: [
            //"Lapor PPKP tentang wesel kedip",
            //"Pasang pengamanan area kerja sebelum pemeriksaan",
            //"Periksa kondisi mekanisme penggerak wesel secara visual",
            //"Pastikan tidak ada kerusakan fisik pada komponen wesel",
            //"Lakukan reset manual pada mekanisme jika memungkinkan",
            //"Koordinasikan dengan petugas lapangan untuk pengamanan jalur",
            //"Catat hasil pemeriksaan dan tindakan pada buku WK"
          ],
          elektrik: [
            "Cek kondisi wesel dilapangan ada ganjalan atau tidak",
            "Tekan tombol TWT dan tombol wesel tsb ",
            "Cek kondisi wesel di lapangan",
            "Pada saat cek wesel pastikan membawa minyak pelumas dan engkol untuk persiapan ",
            "Balik wesel dengan engkol ke salah satu arah kedudukan belok atau lurus dan di reset",
            "Setelah di coba bolak balik wesel tetap gagal lapor petugas sintel, PPKP dan catat dalam buku gangguan",
            "Untuk pelayanan Perka koordinasi dengan PPKP, kalau memungkinkan dialihkan ke jalur lain dengan tetap mengutamakan keselamatan Perka dan pelayanan penumpang",
            "Sambil menunggu petugas sintel, coba balik wesel dengan engkol (pastikan kondisi wesel secara fisik aman)",
            "Setelah diengkol wesel berhasil dibalik dan sudah tidak berkedip, coba set rute. Jika gagal dan wesel masih berkedip. Pada saat kondisi darurat ketika wesel tetap digunakan, wesel diarahkan sesuai kebutuhan dengan engkol dan dipasang apitan lidah wesel.",
            "Selanjutnya Pelayanan KA menggunakan IPM atau MS",
            "Setelah perbaikan selesai oleh unit Sintel atau Jalan rel, laporkan kembali kondisi normal ke PPKP dan catat dalam buku gangguan"
          ]
        }
      },
      track_wesel_merah: {
        label: "Penanganan Track Wesel Merah",
        subtitle: "Checklist untuk penanganan track wesel merah.",
        checklistByType: {
          mekanik: [
            //"Lapor PPKP tentang track wesel merah",
            //"Pasang pengamanan area kerja sebelum pemeriksaan",
            //"Periksa kondisi mekanisme penggerak wesel secara visual",
            //"Pastikan tidak ada kerusakan fisik pada komponen wesel",
            //"Lakukan reset manual pada mekanisme jika memungkinkan",
            //"Koordinasikan dengan petugas lapangan untuk pengamanan jalur",
            //"Catat hasil pemeriksaan dan tindakan pada buku WK"
          ],
          elektrik: [
            "Cek kondisi wesel dilapangan ada material atau tidak",
            "Balik wesel dengan tekan tombol/kunci TBW dan tombol wesel tsb",
            "Lapor petugas sintel, PPKP dan catat dalam buku gangguan, termasuk catat penambahan counter TBW dan beri keterangan.",
            "Untuk pelayanan Perka koordinasi dengan PPKP, kalau memungkinkan dialihkan ke jalur lain dengan tetap mengutamakan keselamatan Perka dan pelayanan penumpang",
            "Selanjutnya Pelayanan KA set masuk terlebih dahulu, baru set rute keluar setelah semboyan 6A dilayani dan sebagian KA sdh melewati track di depan sinyal keluar ",
            "Setelah perbaikan selesai oleh unit Sintel, laporkan kembali kondisi normal ke PPKP dan catat dalam buku gangguan"
            
          ]
        }
      },
      goker: {
        label: "Penanganan Goyangan Keras",
        subtitle: "Checklist untuk penanganan goyangan keras di petak jalan.",
        checklistByType: {
          mekanik: [
            "Setelah mendapat informasi adanya goyangan keras di petak jalan dari ASP melalui PPKP, lapor ke kares/kaur JJ sesuai wilayahnya dan  Pastikan kembali lokasi letak  km nya dan catat dalam buku gangguan",
            "BLB kan semua KA yang akan melintas di petak jalan tersebut sebelum ada perintah dari Unit JJ melalui PPKP ",
            "Khusus di jalur ganda untuk pelayanan Perka koordinasi dengan PPKP, kalau memungkinkan dialihkan ke jalur lain (jalur hulu atau jalur hilir yang tidak terdapat goyangan keras) dengan tetap mengutamakan keselamatan Perka dan pelayanan penumpang",
            "Update setiap perubahan taspat sementara sampai dengan di tetapkan dipasang semboyan di km tsb atau berjalan normal sesuai kecepatan pada Gapeka dari kares/kaur JJ  ",
            "Setelah perbaikan selesai oleh Kares/kaur JJ, laporkan kembali kondisi normal ke PPKP dan catat dalam buku gangguan"
          ],
          elektrik: [
            "Setelah mendapat informasi adanya goyangan keras di petak jalan dari ASP melalui PPKP, lapor ke kares/kaur JJ sesuai wilayahnya dan  Pastikan kembali lokasi letak  km nya dan catat dalam buku gangguan",
            "BLB kan semua KA yang akan melintas di petak jalan tersebut sebelum ada perintah dari Unit JJ melalui PPKP ",
            "Khusus di jalur ganda untuk pelayanan Perka koordinasi dengan PPKP, kalau memungkinkan dialihkan ke jalur lain (jalur hulu atau jalur hilir yang tidak terdapat goyangan keras) dengan tetap mengutamakan keselamatan Perka dan pelayanan penumpang",
            "Update setiap perubahan taspat sementara sampai dengan di tetapkan dipasang semboyan di km tsb atau berjalan normal sesuai kecepatan pada Gapeka dari kares/kaur JJ  ",
            "Setelah perbaikan selesai oleh Kares/kaur JJ, laporkan kembali kondisi normal ke PPKP dan catat dalam buku gangguan"
          ]
        }
      },
      gta_jpl: {
        label: "Gangguan Tombol ACK di JPL",
        subtitle: "Checklist untuk penanganan Gangguan Tomgol ACK di JPL.",
        checklistByType: {
          mekanik: [
            //"Lapor PPKP tentang gangguan GTA JPL",
            //"Pasang pengamanan area kerja sebelum pemeriksaan",
            //"Periksa kondisi mekanisme penggerak GTA JPL secara visual",
            //"Pastikan tidak ada kerusakan fisik pada komponen GTA JPL",
            //"Lakukan reset manual pada mekanisme jika memungkinkan",
            //"Koordinasikan dengan petugas lapangan untuk pengamanan jalur",
            //"Catat hasil pemeriksaan dan tindakan pada buku WK"
          ],
          elektrik: [
            "Setelah mendapat informasi adanya gangguan tobol ACK dari PJL, PPKA segera melaporkan ke Petugas Sintel dan PPKP",
            "Catat dalam buku gangguan",
            "Informasikan ke PJL saat akan membentuk rute",
            "Untuk pelayanan Perka dengan melayani tombol ACK dari PPKA, setelah mendapat laporan dari PJL bahwa pastikan Pintu perlintasan benar - benar telah tertutup dan jalur di pintu perlintasan aman dari kendaraan.",
            "Setelah perbaikan selesai oleh unit Sintel, laporkan kembali kondisi normal ke PPKP dan catat dalam buku gangguan"

          ]
        }
      },
      speed_indikator: {
        label: "Gangguan Speed Indicator Di Sinyal Masuk",
        subtitle: "Checklist untuk penanganan gangguan speed indicator di sinyal masuk.",
        checklistByType: {
          mekanik: [
            //"Lapor PPKP tentang gangguan speed indicator",
            //"Pasang pengamanan area kerja sebelum pemeriksaan",
            //"Periksa kondisi mekanisme penggerak speed indicator secara visual",
            //"Pastikan tidak ada kerusakan fisik pada komponen speed indicator",
            //"Lakukan reset manual pada mekanisme jika memungkinkan",
            //"Koordinasikan dengan petugas lapangan untuk pengamanan jalur",
            //"Catat hasil pemeriksaan dan tindakan pada buku WK"
          ],
          elektrik: [
            "Pastikan rute terbentuk (rute masuk jalur belok) lapor PPKP dan Sintel",
            "Pastikan pintu perlintasan masih tertutup dan aman",
            "Untuk pelayanan Perka, tekan tombol TSD dan tombol sinyal yang gangguan speed indikator",
            "Aspek sinyal masuk adalah semboyan 6A dan speed indikator padam",
            "Laporkan ke unit sintel dan catat dalam buku gangguan"

          ]
        }
      },
      palang_pintu: {
        label: "Gangguan Motor Palang Pintu Perlintasan",
        subtitle: "Checklist untuk penanganan gangguan motor palang pintu perlintasan.",
        checklistByType: {
          mekanik: [
            //"Lapor PPKP tentang gangguan palang pintu perlintasan",
            //"Pasang pengamanan area kerja sebelum pemeriksaan",
            //"Periksa kondisi mekanisme penggerak palang pintu secara visual",
            //"Pastikan tidak ada kerusakan fisik pada komponen palang pintu",
            //"Lakukan reset manual pada mekanisme jika memungkinkan",
            //"Koordinasikan dengan petugas lapangan untuk pengamanan jalur",
            //"Catat hasil pemeriksaan dan tindakan pada buku WK"
          ],
          elektrik: [
            "Pasang pengait pada masing - masing palang pintu agar tidak turun",
            "Laporkan ke PPKA/PPKT gangguan tersebut",
            "catat dalam buku gangguan",
            "Untuk pelayanan KA, pasang rambu verboden di salah satu sisi jalan sejajar dengan palang pintu",
            "PJL membawa bendera merah untuk memberhentikan kendaraan yang akan melintas di PJL tersebut",
            "laporkan ke PPKA/PPKT JPL tersebut aman dilalui KA",
            "Setelah perbaikan selesai oleh unit Sintel, laporkan kembali kondisi normal ke PPKA dan catat dalam buku gangguan"
          ]
        }
      },
      panah_blok: {
        label: "Gangguan Panah Blok",
        subtitle: "Checklist untuk penanganan gangguan panah blok tidak bisa hilang.",
        checklistByType: {
          mekanik: [
            //"Lapor PPKP tentang gangguan panah blok",
            //"Pasang pengamanan area kerja sebelum pemeriksaan",
            //"Periksa kondisi mekanisme penggerak panah blok secara visual",
            //"Pastikan tidak ada kerusakan fisik pada komponen panah blok",
            //"Lakukan reset manual pada mekanisme jika memungkinkan",
            //"Koordinasikan dengan petugas lapangan untuk pengamanan jalur",
            //"Catat hasil pemeriksaan dan tindakan pada buku WK"
          ],
          elektrik: [
            "PPKA berkoordinasi dengan stasiun kanan dan kiri bahwa Hubungan Blok Terganggu, termasuk meyakinkan KA masuk lengkap dengan semboyan 21",
            "PPKA melaporkan ke petugas pengendali (PPKP).",
            "PPKA melaporkan ke petugas sintel dan catat dalam buku gangguan",
            "PPKA memastikan jalur yang akan dilalui KA aman",
            "PPKA melakukan tanya jawab kondisi petak jalan menggunakan warta KA",
            "Untuk pelayanan KA berangkat dapat menggunakan Rute dengan Sinyal Darurat (S.6A)",
            "Setelah perbaikan selesai oleh unit Sintel, laporkan kembali kondisi normal ke PPKP dan catat dalam buku gangguan, termasuk catat penambahan counter"
          ]
        }
      },
      wesel_terlanggar: {
        label: "Penanganan Wesel Terlanggar",
        subtitle: "Checklist untuk penanganan wesel terlanggar.",
        checklistByType: {
          mekanik: [
            "Pada persinyalan Mekanik Cek kawat plombir wesel terputus",
            "Rangkaian tidak boleh mundur/berjalan ke arah sebaliknya",
            "PPKA melaporkan ke petugas pengendali (PPKP).",
            "PPKA melaporkan ke petugas sintel dan catat dalam buku gangguan",
            "PPKA/PRS memastikan wesel yang terlanggar",
            "membebaskan semua rangkaian dari wesel",
            "Periksa wesel dan kembalikan kekedudukan semula",
            "Coba layani wesel dengan membalik handle wesel",
            "Tongklem lidah wesel jika terdapat kelainan untuk KA dari arah ujung",
            "Setelah perbaikan selesai oleh unit Sintel, laporkan kembali kondisi normal ke PPKP dan catat dalam buku gangguan, termasuk catat penambahan counter (jika ada)"
          ],
          elektrik: [
            "Pada persinyalan elektrik, Cek bunyi buser dan lampu indikator",
            "Rangkaian tidak boleh mundur/berjalan ke arah sebaliknya",
            "PPKA melaporkan ke petugas pengendali (PPKP).",
            "PPKA melaporkan ke petugas sintel dan catat dalam buku gangguan",
            "PPKA/PRS memastikan wesel yang terlanggar",
            "membebaskan semua rangkaian dari wesel",
            "Periksa wesel dan kembalikan kekedudukan semula (elekterik dengan engkol sampai indikator wesel tenang)",
            "Coba layani wesel dengan TKW",
            "Tongklem lidah wesel jika terdapat kelainan untuk KA dari arah ujung",
            "Setelah perbaikan selesai oleh unit Sintel, laporkan kembali kondisi normal ke PPKP dan catat dalam buku gangguan, termasuk catat penambahan counter (jika ada)"
          ]
        }
      },
      berjalan_jalur_kiri: {
        label: "KA Berjalan di Jalur Kiri",
        subtitle: "Checklist untuk penanganan KA yang berjalan di jalur kiri.",
        checklistByType: {
          mekanik: [
            "PPKA berkoordinasi dengan PPKP terkait berjalan jalur kiri dan meminta nomor penetapan warta perjalanan ke PPKA",
            "Koordinasi dengan PPKA Sebelah untuk menentukan Jam mulai berlaku, Ka pertama yang akan berjalan jalur kiri dan menulis dalam buku WK",
            "Pada pesawat telpon antarstasiun, peralatan Blok/meja pelayanan peralatan persinyalan digantung/diletakan sekeping papan peringatan",
            "Memberitahukan kepada PJL dan petugas perawatan jalan rel di petak jalan dengan alat komunikasi, apabila pemberitahuan tidak berhasil maka masinis ka pertama yang melalui jalur kiri harus diberitahu untuk menjalankan kereta apinya dengan kec terbatas dan memperdengarkan s.39A",
            "untuk KA yang berjalan Jalur kiri PPKA melakukan tanya jawab kondisi petak jalan menggunakan warta KA",
            "petak jalan yang dilengkapi sinyal jalur kiri : hubungan blok dilakukan, semua sinyal jalur kiri dilayani, Warta ka harus digunakan ditambah (jalur kiri)",
            "Setiap Ka yang akan berjalan jalur kiri harus dilaporkan PPKP",
            "Setelah petak jalan normal kembali, kedua PPKA menetapkan petak jalan jalur ganda normal kembali dengan warta, dan mengabarkan ke PPKP"
          ],
          elektrik: [
           "PPKA berkoordinasi dengan PPKP terkait berjalan jalur kiri dan meminta nomor penetapan warta perjalanan ke PPKA",
            "Koordinasi dengan PPKA Sebelah untuk menentukan Jam mulai berlaku, Ka pertama yang akan berjalan jalur kiri dan menulis dalam buku WK",
            "Pada pesawat telpon antarstasiun, peralatan Blok/meja pelayanan peralatan persinyalan digantung/diletakan sekeping papan peringatan",
            "Memberitahukan kepada PJL dan petugas perawatan jalan rel di petak jalan dengan alat komunikasi, apabila pemberitahuan tidak berhasil maka masinis ka pertama yang melalui jalur kiri harus diberitahu untuk menjalankan kereta apinya dengan kec terbatas dan memperdengarkan s.39A",
            "untuk KA yang berjalan Jalur kiri PPKA melakukan tanya jawab kondisi petak jalan menggunakan warta KA",
            "petak jalan yang dilengkapi sinyal jalur kiri : hubungan blok dilakukan, semua sinyal jalur kiri dilayani, Warta ka harus digunakan ditambah (jalur kiri)",
            "Setiap Ka yang akan berjalan jalur kiri harus dilaporkan PPKP",
            "Setelah petak jalan normal kembali, kedua PPKA menetapkan petak jalan jalur ganda normal kembali dengan warta, dan mengabarkan ke PPKP"
          ]
        }
      }
    };

    function createInitialCheckedByGangguanAndType() {
      const checkedByGangguanAndType = {};
      Object.keys(gangguanConfig).forEach((gangguanKey) => {
        checkedByGangguanAndType[gangguanKey] = {
          mekanik: Array(gangguanConfig[gangguanKey].checklistByType.mekanik.length).fill(false),
          elektrik: Array(gangguanConfig[gangguanKey].checklistByType.elektrik.length).fill(false)
        };
      });
      return checkedByGangguanAndType;
    }

    function createEmptySignature() {
      return {
        generatedAt: "",
        passphraseHash: "",
        payloadHash: "",
        payload: ""
      };
    }

    const state = {
      started: false,
      gangguanKey: "sinyal",
      checklistType: "mekanik",
      checkedByGangguanAndType: createInitialCheckedByGangguanAndType(),
      petugas: "",
      nipp: "",
      lokasi: "",
      tanggal: "",
          keterangan: "",
          finishReason: "",
          signature: createEmptySignature()
    };

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}

function getChecklistProgress() {
  const checkedList = getActiveCheckedList();
  const total = checkedList.length;
  const done = checkedList.filter(Boolean).length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  return { checkedList, total, done, progress };
}

function openWarningPopup() {
  const popup = document.getElementById("warningPopup");
  const reasonInput = document.getElementById("finishReason");
  if (!popup) {
    return;
  }

  popup.hidden = false;
  if (reasonInput) {
    reasonInput.value = state.finishReason || "";
    setTimeout(() => reasonInput.focus(), 0);
  }
}

function closeWarningPopup() {
  const popup = document.getElementById("warningPopup");
  if (!popup) {
    return;
  }

  popup.hidden = true;
}

function getFinishReason() {
  const reasonInput = document.getElementById("finishReason");
  return sanitizeText(reasonInput ? reasonInput.value : state.finishReason);
}

async function finishChecklistSubmission() {
  if (!validateMinimalData()) {
    return;
  }

  const { done, progress } = getChecklistProgress();

  if (done === 0) {
    showToast("Checklist masih kosong, belum bisa diselesaikan.");
    return;
  }

  const payload = {
    requestId: getRequestId(),
    clientSentAt: new Date().toISOString(),
    progress,
    completionReason: state.finishReason || "",
    signature: state.signature,
    data: buildPayload()
  };

  const result = await postChecklistToApi(payload);
  if (result.ok) {
    trackEvent("send_success", { gangguanKey: state.gangguanKey, progress, source: "finish" });
    showToast("Data berhasil dikirim. Mengunduh dokumen...");
  } else {
    enqueueOutbox(payload);
    trackEvent("send_queued", { reason: result.reason, gangguanKey: state.gangguanKey, source: "finish" });
    showToast("Koneksi bermasalah. Data diantrikan, dokumen tetap diunduh.");
  }

  closeWarningPopup();
  downloadPdfResult();
  state.finishReason = "";
  persistState();
}

function sanitizeText(value) {
  return String(value || "").replace(/[<>]/g, "").trim();
}

function getAuthenticatedProfile() {
  if (!window.ChecklistAuth || typeof window.ChecklistAuth.getCurrentUser !== "function") {
    return null;
  }

  const currentUser = window.ChecklistAuth.getCurrentUser();
  if (!currentUser || typeof currentUser !== "object") {
    return null;
  }

  const nama = sanitizeText(currentUser.nama || "");
  const jabatan = sanitizeText(currentUser.jabatan || "");
  const nipp = sanitizeText(currentUser.nipp || "");
  if (!nama) {
    return null;
  }

  return {
    nama,
    jabatan,
    nipp
  };
}

function applyAuthenticatedProfile(forceOverwriteName) {
  const petugasInput = document.getElementById("petugas");
  const nippInput = document.getElementById("nipp");
  if (!petugasInput) {
    return;
  }

  const profile = getAuthenticatedProfile();
  if (!profile) {
    petugasInput.readOnly = false;
    petugasInput.removeAttribute("aria-readonly");
    petugasInput.classList.remove("is-locked");
    petugasInput.title = "";

    if (nippInput) {
      nippInput.readOnly = false;
      nippInput.removeAttribute("aria-readonly");
      nippInput.classList.remove("is-locked");
      nippInput.title = "";
    }
    return;
  }

  if (forceOverwriteName || !state.petugas || state.petugas !== profile.nama) {
    state.petugas = profile.nama;
  }
  if (!state.nipp || state.nipp !== profile.nipp) {
    state.nipp = profile.nipp;
  }

  petugasInput.value = state.petugas;
  petugasInput.readOnly = true;
  petugasInput.setAttribute("aria-readonly", "true");
  petugasInput.classList.add("is-locked");
  petugasInput.title = "Nama petugas diambil dari database akun" + (profile.jabatan ? " (" + profile.jabatan + ")" : "") + ".";

  if (nippInput) {
    nippInput.value = state.nipp;
    nippInput.readOnly = true;
    nippInput.setAttribute("aria-readonly", "true");
    nippInput.classList.add("is-locked");
    nippInput.title = "NIPP diambil dari database akun" + (profile.jabatan ? " (" + profile.jabatan + ")" : "") + ".";
  }
}

function trackEvent(type, detail) {
  try {
    const current = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || "[]");
    const next = Array.isArray(current) ? current : [];
    next.push({
      type,
      detail,
      ts: new Date().toISOString()
    });
    localStorage.setItem(TELEMETRY_KEY, JSON.stringify(next.slice(-200)));
  } catch (err) {
    console.warn("Gagal menyimpan telemetry:", err);
  }
}

function renderSignatureIdentity() {
  const identityElement = document.getElementById("signaturePetugas");
  if (!identityElement) {
    return;
  }
  identityElement.textContent = "Petugas: " + (state.petugas || "Belum diisi");
}

function renderSignaturePanel() {
  const statusElement = document.getElementById("signatureStatus");
  const qrElement = document.getElementById("signatureQr");
  const finishButton = document.getElementById("btnSelesai");
  if (!statusElement || !qrElement) {
    return;
  }

  qrElement.innerHTML = "";
  renderSignatureIdentity();

  if (!state.signature.generatedAt || !state.signature.payload) {
    statusElement.textContent = "Belum ada tanda tangan digital.";
    if (finishButton) {
      finishButton.disabled = true;
      finishButton.classList.add("is-disabled");
      finishButton.title = "Tandatangani QR terlebih dahulu.";
    }
    return;
  }

  const timestamp = new Date(state.signature.generatedAt).toLocaleString("id-ID");
  statusElement.textContent = "Ditandatangani: " + timestamp;

  // If QR library is unavailable, show a textual fallback and still allow finishing.
  if (!window.QRCode) {
    qrElement.textContent = "Library QR belum siap. Menampilkan kode referensi sebagai fallback.";
    const ref = (state.signature.payloadHash || state.signature.passphraseHash || "").slice(0, 12);
    const fallbackDiv = document.createElement("div");
    fallbackDiv.className = "signature-fallback";
    fallbackDiv.style.marginTop = "8px";
    fallbackDiv.textContent = "Ref: " + (ref ? ref + "..." : "-") + " • " + timestamp;
    qrElement.appendChild(fallbackDiv);

    if (finishButton) {
      finishButton.disabled = false;
      finishButton.classList.remove("is-disabled");
      finishButton.title = "";
    }
    return;
  }

  new window.QRCode(qrElement, {
    text: state.signature.payload,
    width: 120,
    height: 120,
    correctLevel: window.QRCode.CorrectLevel.M
  });

  if (finishButton) {
    finishButton.disabled = false;
    finishButton.classList.remove("is-disabled");
    finishButton.title = "";
  }
}

function invalidateSignature(silent) {
  if (!state.signature.generatedAt) {
    return;
  }

  state.signature = createEmptySignature();
  renderSignaturePanel();

  if (!silent) {
    showToast("Perubahan data terdeteksi. Tanda tangan digital direset.");
  }
}

async function sha256Hex(input) {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  const bytes = Array.from(new Uint8Array(buffer));
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function syncFormToState() {
  const previous = {
    petugas: state.petugas,
    nipp: state.nipp,
    lokasi: state.lokasi,
    tanggal: state.tanggal,
    keterangan: state.keterangan,
    finishReason: state.finishReason
  };

  const keteranganInput = document.getElementById("keterangan");
  const limitedKeterangan = keteranganInput.value.slice(0, MAX_KETERANGAN_LENGTH);
  if (keteranganInput.value.length > MAX_KETERANGAN_LENGTH) {
    keteranganInput.value = limitedKeterangan;
    showToast("Keterangan dibatasi maksimal " + MAX_KETERANGAN_LENGTH + " karakter.");
  }

  const profile = getAuthenticatedProfile();
  if (profile) {
    state.petugas = profile.nama;
    state.nipp = profile.nipp || state.nipp;
  } else {
    state.petugas = sanitizeText(document.getElementById("petugas").value);
  }
  if (!profile) {
    state.nipp = sanitizeText(document.getElementById("nipp").value);
  }
  state.lokasi = sanitizeText(document.getElementById("lokasi").value);
  state.tanggal = document.getElementById("tanggal").value;
  state.keterangan = sanitizeText(limitedKeterangan);
  applyAuthenticatedProfile(true);
  renderSignatureIdentity();

  if (
    previous.petugas !== state.petugas
    || previous.nipp !== state.nipp
    || previous.lokasi !== state.lokasi
    || previous.tanggal !== state.tanggal
    || previous.keterangan !== state.keterangan
    || previous.finishReason !== state.finishReason
  ) {
    invalidateSignature(true);
  }
}

function fillFormFromState() {
  document.getElementById("petugas").value = state.petugas;
  document.getElementById("nipp").value = state.nipp;
  document.getElementById("lokasi").value = state.lokasi;
  document.getElementById("tanggal").value = state.tanggal;
  document.getElementById("keterangan").value = state.keterangan;
  applyAuthenticatedProfile(true);
  renderSignatureIdentity();
}

function getChecklistLength(type) {
  return gangguanConfig[state.gangguanKey].checklistByType[type].length;
}

function getAvailableType(type) {
  return getChecklistLength(type) > 0;
}

function ensureValidChecklistType() {
  if (getAvailableType(state.checklistType)) {
    return;
  }

  state.checklistType = getAvailableType("mekanik") ? "mekanik" : "elektrik";
}

function updateSidebarActive() {
  const sidebarItems = document.querySelectorAll(".sidebar-item");
  sidebarItems.forEach((item) => {
    const type = item.getAttribute("data-type");
    const available = getAvailableType(type);
    const isActive = type === state.checklistType;
    item.disabled = !available;
    item.classList.toggle("is-disabled", !available);
    item.classList.toggle("active", isActive);
    item.title = available ? "" : "Checklist belum tersedia";
  });
}

function updateGangguanHeader() {
  const activeGangguan = gangguanConfig[state.gangguanKey];
  document.getElementById("activeGangguanTitle").textContent = activeGangguan.label;
  document.getElementById("activeGangguanSubtitle").textContent = activeGangguan.subtitle;
}

function renderGangguanMenu() {
  const menu = document.getElementById("gangguanMenu");
  menu.innerHTML = "";

  Object.keys(gangguanConfig).forEach((gangguanKey) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gangguan-item" + (state.gangguanKey === gangguanKey ? " active" : "");
    button.onclick = () => switchGangguan(gangguanKey);

    const checkedState = state.checkedByGangguanAndType[gangguanKey];
    const done = checkedState.mekanik.filter(Boolean).length + checkedState.elektrik.filter(Boolean).length;
    const total = checkedState.mekanik.length + checkedState.elektrik.length;

    button.innerHTML = `
      <span class="gangguan-item-title">${gangguanConfig[gangguanKey].label}</span>
      <span class="gangguan-item-progress">${done}/${total}</span>
    `;

    menu.appendChild(button);
  });
}

function switchGangguan(gangguanKey) {
  if (!gangguanConfig[gangguanKey]) {
    return;
  }

  state.gangguanKey = gangguanKey;
  invalidateSignature(true);
  ensureValidChecklistType();
  renderGangguanMenu();
  updateGangguanHeader();
  updateSidebarActive();
  updateModeLabel();
  loadTable();
  updateStats();
  queueAutoSave();
  showToast("Berpindah ke menu " + gangguanConfig[gangguanKey].label + ".");
}

function getActiveChecklist() {
  return gangguanConfig[state.gangguanKey].checklistByType[state.checklistType];
}

function getActiveCheckedList() {
  return state.checkedByGangguanAndType[state.gangguanKey][state.checklistType];
}

function updateModeLabel() {
  const modeLabel = state.checklistType === "mekanik" ? "Mekanik" : "Elektrik";
  document.getElementById("modeLabel").textContent = modeLabel;
}

function updateStats() {
  const checkedList = getActiveCheckedList();
  const done = checkedList.filter(Boolean).length;
  const total = checkedList.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  document.getElementById("doneCount").textContent = done + " / " + total;
  document.getElementById("progressText").textContent = percent + "%";
  document.getElementById("progressBar").style.width = percent + "%";
  updateSidebarProgress();
}

function updateSidebarProgress() {
  const activeCheckedState = state.checkedByGangguanAndType[state.gangguanKey];
  const mekanikDone = activeCheckedState.mekanik.filter(Boolean).length;
  const mekanikTotal = activeCheckedState.mekanik.length;
  const elektrikDone = activeCheckedState.elektrik.filter(Boolean).length;
  const elektrikTotal = activeCheckedState.elektrik.length;

  document.getElementById("menuProgress-mekanik").textContent = mekanikDone + "/" + mekanikTotal;
  document.getElementById("menuProgress-elektrik").textContent = elektrikDone + "/" + elektrikTotal;
  renderGangguanMenu();
}

function toggleItem(index, checked) {
  const checkedList = getActiveCheckedList();
  checkedList[index] = checked;
  invalidateSignature(true);
  state.started = true;
  loadTable();
  updateStats();
  queueAutoSave();
}

function loadTable() {
  const activeChecklist = getActiveChecklist();
  const checkedList = getActiveCheckedList();
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  if (!activeChecklist.length) {
    const row = document.createElement("tr");
    row.innerHTML = "<td colspan='4' class='empty-row'>Checklist untuk mode ini belum tersedia.</td>";
    tbody.appendChild(row);
    return;
  }

  activeChecklist.forEach((item, index) => {
    const row = document.createElement("tr");
    if (checkedList[index]) {
      row.classList.add("checked");
    }

    row.innerHTML = `
      <td data-label="No">${index + 1}</td>
      <td data-label="Kegiatan">${item}</td>
      <td data-label="Status"><span class="status-pill ${checkedList[index] ? "done" : ""}">${checkedList[index] ? "Sudah Dilakukan" : "Belum Dilakukan"}</span></td>
      <td data-label="Tandai"><input class="status-toggle" type="checkbox" ${checkedList[index] ? "checked" : ""} onchange="toggleItem(${index}, this.checked)"></td>
    `;

    tbody.appendChild(row);
  });
}

function switchChecklistType(type) {
  if (type !== "mekanik" && type !== "elektrik") {
    return;
  }
  if (!getAvailableType(type)) {
    showToast("Checklist mode " + type + " belum tersedia untuk gangguan ini.");
    return;
  }

  state.checklistType = type;
  invalidateSignature(true);
  updateSidebarActive();
  updateModeLabel();
  loadTable();
  updateStats();
  queueAutoSave();
  showToast("Berpindah ke persinyalan " + (type === "mekanik" ? "Mekanik" : "Elektrik") + ".");
}

function validateMinimalData() {
  syncFormToState();

  if (!state.petugas || !state.nipp || !state.lokasi) {
    showToast("Isi nama petugas, NIPP, dan lokasi terlebih dahulu.");
    return false;
  }
  if (!/^\d{5,20}$/.test(state.nipp)) {
    showToast("NIPP harus berupa angka dengan panjang 5-20 digit.");
    return false;
  }
  if (state.keterangan.length > MAX_KETERANGAN_LENGTH) {
    showToast("Keterangan melebihi batas karakter.");
    return false;
  }
  return true;
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function queueAutoSave() {
  clearTimeout(queueAutoSave.timer);
  queueAutoSave.timer = setTimeout(() => {
    syncFormToState();
    persistState();
  }, AUTOSAVE_DELAY_MS);
}

function simpan() {
  if (!validateMinimalData()) {
    return;
  }
  persistState();
  trackEvent("manual_save", { gangguanKey: state.gangguanKey, type: state.checklistType });
  showToast("Data berhasil disimpan lokal.");
}

function buildPayload() {
  const checkedList = getActiveCheckedList();
  const activeChecklist = getActiveChecklist();

  return {
    meta: {
      gangguan: gangguanConfig[state.gangguanKey].label,
      gangguanKey: state.gangguanKey,
      petugas: state.petugas,
      nipp: state.nipp,
      lokasi: state.lokasi,
      tanggal: state.tanggal,
      keterangan: state.keterangan,
      started: state.started,
      modeChecklist: state.checklistType
    },
    checklist: activeChecklist.map((item, index) => ({
      kegiatan: item,
      selesai: checkedList[index]
    }))
  };
}

function kirim() {
  if (!validateMinimalData()) {
    return;
  }

  const checkedList = getActiveCheckedList();
  const total = checkedList.length;
  const done = checkedList.filter(Boolean).length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  if (done === 0) {
    showToast("Checklist masih kosong, belum bisa dikirim.");
    return;
  }

  const payload = {
    requestId: getRequestId(),
    clientSentAt: new Date().toISOString(),
    progress,
    completionReason: state.finishReason || "",
    signature: state.signature,
    data: buildPayload()
  };

  postChecklistToApi(payload).then((result) => {
    if (result.ok) {
      showToast("Data berhasil dikirim ke server.");
      trackEvent("send_success", { gangguanKey: state.gangguanKey, progress });
      syncOutbox();
      return;
    }

    enqueueOutbox(payload);
    const reason = result.reason === "missing-endpoint"
      ? "Endpoint belum diatur"
      : "Koneksi bermasalah";
    showToast(reason + ". Data masuk antrean sinkron.");
    trackEvent("send_queued", { reason: result.reason, gangguanKey: state.gangguanKey });
    console.log("Payload antrean kirim:", payload);
  });
}

async function selesaiChecklist() {
  const { progress } = getChecklistProgress();

  if (progress < 100) {
    openWarningPopup();
    return;
  }

  await finishChecklistSubmission();
}

async function continueFinishChecklist() {
  const reason = getFinishReason();

  if (!reason) {
    showToast("Alasan harus diisi sebelum melanjutkan.");
    return;
  }

  state.finishReason = reason;
  persistState();
  await finishChecklistSubmission();
}

async function generateSignatureQr() {
  syncFormToState();

  if (!validateMinimalData()) {
    return;
  }

  if (!window.crypto || !window.crypto.subtle) {
    showToast("Browser tidak mendukung tanda tangan digital ini.");
    return;
  }

  const pinInput = document.getElementById("signaturePin");
  const pin = String(pinInput.value || "").trim();
  if (!new RegExp("^\\d{" + SIGNATURE_PIN_LENGTH + "}$").test(pin)) {
    showToast("PIN harus " + SIGNATURE_PIN_LENGTH + " digit angka.");
    return;
  }

  if (window.ChecklistAuth && typeof window.ChecklistAuth.verifySignaturePin === "function") {
    const pinCheck = await window.ChecklistAuth.verifySignaturePin(pin);
    if (!pinCheck.ok) {
      showToast(pinCheck.message || "PIN tanda tangan tidak valid.");
      return;
    }
  }

  const checkedList = getActiveCheckedList();
  const done = checkedList.filter(Boolean).length;
  const total = checkedList.length;
  const payloadFingerprint = await sha256Hex(JSON.stringify(buildPayload()));
  const pinHash = await sha256Hex(pin + "|" + payloadFingerprint);
  const timestamp = new Date().toISOString();

  state.signature = {
    generatedAt: timestamp,
    passphraseHash: pinHash,
    payloadHash: payloadFingerprint,
    payload: JSON.stringify({
      v: 1,
      g: state.gangguanKey,
      m: state.checklistType,
      n: state.nipp,
      p: state.petugas.slice(0, 40),
      t: state.tanggal || "-",
      d: done,
      x: total,
      h: pinHash,
      f: payloadFingerprint,
      ts: timestamp
    })
  };

  pinInput.value = "";
  renderSignaturePanel();
  persistState();
  trackEvent("signature_qr_generated", { gangguanKey: state.gangguanKey, type: state.checklistType });
  showToast("Tanda tangan digital berhasil dibuat.");
}

function resetChecklist() {
  const isConfirmed = confirm("Reset semua data checklist dan form?");
  if (!isConfirmed) {
    return;
  }

  state.started = false;
  state.gangguanKey = "sinyal";
  state.checklistType = "mekanik";
  state.checkedByGangguanAndType = createInitialCheckedByGangguanAndType();
  state.petugas = "";
  state.nipp = "";
  state.lokasi = "";
  state.tanggal = "";
  state.keterangan = "";
  state.finishReason = "";
  state.signature = createEmptySignature();

  fillFormFromState();
  renderSignaturePanel();
  renderGangguanMenu();
  updateGangguanHeader();
  updateSidebarActive();
  updateModeLabel();
  loadTable();
  updateStats();
  localStorage.removeItem(STORAGE_KEY);
  trackEvent("reset", {});
  showToast("Checklist dan data form berhasil direset.");
}

function buildPrintableText() {
  const payload = buildPayload();
  const checklistLines = payload.checklist.map((item, idx) => {
    return (idx + 1) + ". [" + (item.selesai ? "Sudah Dilakukan" : "Belum Dilakukan") + "] " + item.kegiatan;
  });

  return [
    "Checklist Penanganan Gangguan Stasiun Tebing Tinggi",
    "Sinyal: " + payload.meta.modeChecklist,
    "Petugas: " + payload.meta.petugas,
    "NIPP: " + payload.meta.nipp,
    "Lokasi/Stasiun: " + payload.meta.lokasi,
    "Tanggal & Waktu: " + (payload.meta.tanggal || "-"),
    "Keterangan: " + (payload.meta.keterangan || "-"),
    "Alasan melanjutkan: " + (state.finishReason || "-"),
    "Tanda Tangan Digital: " + (state.signature.generatedAt ? "Aktif" : "Belum dibuat"),
    "Waktu Tanda Tangan: " + (state.signature.generatedAt || "-"),
    "",
    "Detail Checklist",
    checklistLines.join("\n")
  ].join("\n");
}

function downloadTextFallback() {
  const text = buildPrintableText();
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "hasil-checklist-" + state.gangguanKey + "-" + state.checklistType + ".txt";
  anchor.click();
  URL.revokeObjectURL(url);
}

function getSignatureQrDataUrl() {
  const qrElement = document.getElementById("signatureQr");
  if (!qrElement) {
    return "";
  }

  const image = qrElement.querySelector("img");
  if (image && image.src && image.src.startsWith("data:image")) {
    return image.src;
  }

  const canvas = qrElement.querySelector("canvas");
  if (canvas) {
    return canvas.toDataURL("image/png");
  }

  return "";
}

function downloadPdfResult() {
  syncFormToState();

  if (!window.jspdf || !window.jspdf.jsPDF) {
    downloadTextFallback();
    showToast("PDF tidak tersedia. File teks cadangan berhasil diunduh.");
    trackEvent("export_txt_fallback", {});
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const left = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const right = pageWidth - 40;
  const maxTextWidth = right - left;
  let y = 50;

  const modeLabel = state.checklistType === "mekanik" ? "Mekanik" : "Elektrik";
  const activeChecklist = getActiveChecklist();
  const checkedList = getActiveCheckedList();
  const done = checkedList.filter(Boolean).length;
  const total = checkedList.length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  function writeLine(text, size, isBold) {
    doc.setFont("times", isBold ? "bold" : "normal");
    doc.setFontSize(size);
    const wrapped = doc.splitTextToSize(text, maxTextWidth);
    wrapped.forEach((line) => {
      if (y > 790) {
        doc.addPage();
        y = 50;
      }
      doc.text(line, left, y);
      y += size + 5;
    });
  }

  writeLine("Checklist Penanganan Gangguan Stasiun Tebing Tinggi", 16, true);
  y += 2;
  writeLine("Jenis Gangguan: " + gangguanConfig[state.gangguanKey].label, 11, false);
  writeLine("Sinyal: " + modeLabel, 11, false);
  writeLine("Petugas: " + (state.petugas || "-"), 11, false);
  writeLine("NIPP: " + (state.nipp || "-"), 11, false);
  writeLine("Lokasi/Stasiun: " + (state.lokasi || "-"), 11, false);
  writeLine("Tanggal & Waktu: " + (state.tanggal || "-"), 11, false);
  writeLine("Progres: " + done + " / " + total + " (" + progress + "%)", 11, true);
  y += 4;
  writeLine("Keterangan: " + (state.keterangan || "-"), 11, false);
  writeLine("Alasan melanjutkan: " + (state.finishReason || "-"), 11, false);

  if (state.signature.generatedAt) {
    y += 4;
    writeLine("Tanda Tangan Digital: Aktif", 11, true);
    writeLine("Waktu Tanda Tangan: " + state.signature.generatedAt, 10, false);
    writeLine("Hash: " + state.signature.passphraseHash.slice(0, 24) + "...", 10, false);
  }

  y += 8;
  writeLine("Detail Checklist", 13, true);
  y += 2;

  activeChecklist.forEach((item, index) => {
    const statusText = checkedList[index] ? "Sudah Dilakukan" : "Belum Dilakukan";
    writeLine((index + 1) + ". [" + statusText + "] " + item, 10, false);
  });

  if (state.signature.generatedAt) {
    const qrDataUrl = getSignatureQrDataUrl();
    const pageHeight = doc.internal.pageSize.getHeight();
    const qrSize = 90;
    const qrX = right - qrSize;
    const qrY = pageHeight - 40 - qrSize - 28;
    if (y > qrY - 12) {
      doc.addPage();
    }

    const targetPage = doc.getNumberOfPages();
    doc.setPage(targetPage);

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
      doc.setFont("times", "normal");
      doc.setFontSize(10);
      doc.text(state.petugas || "-", qrX, qrY + qrSize + 12);
      doc.text("NIPP: " + (state.nipp || "-"), qrX, qrY + qrSize + 24);
    } else {
      // Draw placeholder box and textual reference when QR image not available
      doc.setDrawColor(200);
      doc.rect(qrX, qrY, qrSize, qrSize);
      doc.setFont("times", "normal");
      doc.setFontSize(10);
      const ref = state.signature.payloadHash ? state.signature.payloadHash.slice(0, 12) + "..." : (state.signature.passphraseHash ? state.signature.passphraseHash.slice(0, 12) + "..." : "-");
      doc.text("Ref: " + ref, qrX + 2, qrY + 12);
      doc.text("Waktu: " + state.signature.generatedAt, qrX + 2, qrY + 24);
      doc.text(state.petugas || "-", qrX, qrY + qrSize + 12);
      doc.text("NIPP: " + (state.nipp || "-"), qrX, qrY + qrSize + 24);
    }
  }

  const sanitizedDate = new Date().toISOString().slice(0, 10);
  const fileName = "hasil-checklist-" + state.gangguanKey + "-" + state.checklistType + "-" + sanitizedDate + ".pdf";
  doc.save(fileName);
  trackEvent("export_pdf", { fileName });
  showToast("PDF berhasil diunduh.");
}

function hydrateFromObject(parsed) {
  if (typeof parsed !== "object" || parsed === null) {
    return false;
  }

  const sourceState = parsed.state && typeof parsed.state === "object" ? parsed.state : parsed;
  state.started = Boolean(sourceState.started);
  state.petugas = sourceState.petugas || "";
  state.nipp = sourceState.nipp || "";
  state.lokasi = sourceState.lokasi || "";
  state.tanggal = sourceState.tanggal || "";
  state.keterangan = sourceState.keterangan || "";
  state.finishReason = sourceState.finishReason || "";
  state.signature = createEmptySignature();
  if (sourceState.signature && typeof sourceState.signature === "object") {
    state.signature.generatedAt = sourceState.signature.generatedAt || "";
    state.signature.passphraseHash = sourceState.signature.passphraseHash || "";
    state.signature.payloadHash = sourceState.signature.payloadHash || "";
    state.signature.payload = sourceState.signature.payload || "";
  }
  state.gangguanKey = gangguanConfig[sourceState.gangguanKey] ? sourceState.gangguanKey : "sinyal";
  state.checklistType = sourceState.checklistType === "elektrik" ? "elektrik" : "mekanik";

  if (sourceState.checkedByGangguanAndType && typeof sourceState.checkedByGangguanAndType === "object") {
    Object.keys(gangguanConfig).forEach((gangguanKey) => {
      const incoming = sourceState.checkedByGangguanAndType[gangguanKey];
      if (!incoming || typeof incoming !== "object") {
        return;
      }

      if (Array.isArray(incoming.mekanik) && incoming.mekanik.length === gangguanConfig[gangguanKey].checklistByType.mekanik.length) {
        state.checkedByGangguanAndType[gangguanKey].mekanik = incoming.mekanik.map(Boolean);
      }
      if (Array.isArray(incoming.elektrik) && incoming.elektrik.length === gangguanConfig[gangguanKey].checklistByType.elektrik.length) {
        state.checkedByGangguanAndType[gangguanKey].elektrik = incoming.elektrik.map(Boolean);
      }
    });
  }

  if (sourceState.checkedByType && typeof sourceState.checkedByType === "object") {
    const sinyal = state.checkedByGangguanAndType.sinyal;
    if (Array.isArray(sourceState.checkedByType.mekanik) && sourceState.checkedByType.mekanik.length === sinyal.mekanik.length) {
      sinyal.mekanik = sourceState.checkedByType.mekanik.map(Boolean);
    }
    if (Array.isArray(sourceState.checkedByType.elektrik) && sourceState.checkedByType.elektrik.length === sinyal.elektrik.length) {
      sinyal.elektrik = sourceState.checkedByType.elektrik.map(Boolean);
    }
  }

  if (Array.isArray(sourceState.checked)) {
    const sinyalMekanik = state.checkedByGangguanAndType.sinyal.mekanik;
    if (sourceState.checked.length === sinyalMekanik.length) {
      state.checkedByGangguanAndType.sinyal.mekanik = sourceState.checked.map(Boolean);
    }
  }

  ensureValidChecklistType();
  fillFormFromState();
  renderSignaturePanel();
  renderGangguanMenu();
  updateGangguanHeader();
  updateSidebarActive();
  updateModeLabel();
  loadTable();
  updateStats();
  persistState();
  return true;
}

function hydrateFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    fillFormFromState();
    renderSignaturePanel();
    renderGangguanMenu();
    updateGangguanHeader();
    updateSidebarActive();
    updateModeLabel();
    loadTable();
    updateStats();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    const loaded = hydrateFromObject(parsed);
    if (loaded) {
      showToast("Data sebelumnya berhasil dimuat.");
    }
  } catch (err) {
    console.error("Gagal membaca data tersimpan:", err);
  }
}

function bindAutoSaveListeners() {
  ["petugas", "nipp", "lokasi", "tanggal", "keterangan"].forEach((id) => {
    const element = document.getElementById(id);
    element.addEventListener("input", queueAutoSave);
    element.addEventListener("change", queueAutoSave);
  });

  window.addEventListener("beforeunload", () => {
    syncFormToState();
    persistState();
  });

  window.addEventListener("error", (event) => {
    trackEvent("runtime_error", { message: event.message, file: event.filename, line: event.lineno });
  });

  window.addEventListener("unhandledrejection", (event) => {
    trackEvent("promise_rejection", { message: String(event.reason || "unknown") });
  });

  window.addEventListener("online", () => {
    syncOutbox();
  });
}

window.switchChecklistType = switchChecklistType;
window.toggleItem = toggleItem;
window.simpan = simpan;
window.kirim = kirim;
window.resetChecklist = resetChecklist;
window.downloadPdfResult = downloadPdfResult;
window.generateSignatureQr = generateSignatureQr;
window.selesaiChecklist = selesaiChecklist;

bindAutoSaveListeners();
hydrateFromStorage();
syncOutbox();
