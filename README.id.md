# Pray Reminder — Jadwal Sholat & Countdown Ramadhan

[English](README.md) · **Bahasa Indonesia**

Extension VS Code / Antigravity IDE supaya tetap ingat sholat saat ngoding. Tersedia dalam bahasa Indonesia dan Inggris.

- **Dashboard di sidebar** (ikon masjid di activity bar):
  - countdown live ke waktu sholat berikutnya, dengan warna langit yang berubah sesuai waktu;
  - jadwal hari ini, dengan penanda waktu yang sedang berjalan dan waktu berikutnya;
  - kartu countdown Ramadhan (hari, jam, menit, detik). Selama Ramadhan kartunya menampilkan hari ke-N, progres puasa, hitung mundur buka puasa atau imsak, dan tanggal Idul Fitri.
  - tombol **ID | EN** untuk ganti bahasa langsung.
- **Status bar**: waktu sholat berikutnya + sisa waktunya (`🔔 Ashar 14:59 · 1j 20m`) dan `🌙 Ramadhan 91 hari lagi`.
- **Pengingat**: notifikasi X menit sebelum masuk waktu (default 10) dan saat adzan, dengan tombol "Ingatkan 5 menit lagi". Hari Jumat, Dzuhur tampil sebagai Jumat.
- **Suara adzan**: memutar file adzan pilihanmu saat masuk waktu sholat (bisa beda khusus Subuh), atau suara ding-dong bawaan. Hentikan lewat notifikasi, status bar, atau `Pray: Hentikan Adzan`.
- **Banyak jendela aman**: notifikasi hanya muncul sekali walaupun ada beberapa jendela IDE terbuka.

## Suara adzan

1. Siapkan file audio adzan yang kamu suka (mp3, m4a, wav…). Extension ini tidak menyertakan rekaman adzan karena soal hak cipta.
2. Jalankan `Pray: Pilih Suara Adzan`, lalu pilih **Semua waktu sholat** atau **Khusus Subuh**. File akan diputar sekali sebagai preview.
3. Matikan atau nyalakan suara lewat tombol 🔊/🔇 di dashboard.

| Kejadian | Suara |
|---|---|
| Masuk waktu sholat | adzan pilihanmu (`pray.sound.file`, atau `pray.sound.fajrFile` untuk Subuh) |
| Pengingat awal, Imsak, tunda | ding-dong bawaan (dibuat oleh kode, tanpa file audio) |

Pemutaran memakai player bawaan OS: `afplay` di macOS, PowerShell/`MediaPlayer` di Windows, dan `ffplay`, `mpv`, `mpg123`, atau `paplay` di Linux. Path file diberikan sebagai argumen, tidak pernah lewat shell.

## Keamanan

- **Tanpa dependency runtime.** `.vsix` hanya berisi JavaScript hasil kompilasi dari kode di repo ini.
- **Hanya 2 devDependency** untuk build, dikunci ke versi persis: `typescript` dan `@types/vscode`, keduanya resmi dari Microsoft dan tanpa dependency turunan. `.npmrc` mematikan skrip install (`ignore-scripts=true`).
- **Tanpa internet.** Jadwal dihitung di lokal, dan kalender Hijriah memakai `Intl` bawaan. Webview memakai Content Security Policy ketat tanpa resource eksternal.

## Build & install ke Antigravity IDE

```sh
npm ci                 # install typescript + @types/vscode (tanpa skrip install)
npm run package        # build TypeScript lalu membuat pray-reminder-<versi>.vsix
"/Applications/Antigravity IDE.app/Contents/Resources/app/bin/antigravity-ide" --install-extension pray-reminder-0.4.0.vsix --force
```

Setelah itu jalankan **Developer: Reload Window**. Untuk VS Code, pakai `code --install-extension …`.

## Bahasa

| Bagian | Cara memilih bahasa |
|---|---|
| Status bar, notifikasi, dashboard | Setting `pray.language`: `auto` (ikut IDE), `id`, atau `en`. Bisa diganti lewat tombol **ID / EN** di dashboard atau perintah `Pray: Ganti Bahasa`. |
| Judul perintah & halaman Settings | Mengikuti bahasa tampilan IDE (`package.nls.json` / `package.nls.id.json`). |

## Perintah (Cmd+Shift+P)

| Perintah | Fungsi |
|---|---|
| `Pray: Tampilkan Jadwal Sholat` | Buka dashboard di sidebar |
| `Pray: Countdown Ramadhan` | Buka dashboard di sidebar |
| `Pray: Atur Lokasi` | Pilih kota, atau masukkan koordinat manual |
| `Pray: Ganti Bahasa` | Ganti Indonesia / Inggris |
| `Pray: Pilih Suara Adzan` | Pilih file adzan (semua waktu / khusus Subuh) atau kembali ke ding-dong |
| `Pray: Nyalakan/Matikan Suara Pengingat` | Mute / unmute |
| `Pray: Hentikan Adzan` | Hentikan suara yang sedang diputar |
| `Pray: Tes Notifikasi Pengingat` | Coba tampilan notifikasi |
| `Pray: Pengaturan` | Buka pengaturan extension |

Nama perintah di atas versi Indonesia. Kalau IDE berbahasa Inggris, namanya tampil dalam bahasa Inggris (lihat [README.md](README.md)).

## Pengaturan

| Setting | Default | Keterangan |
|---|---|---|
| `pray.language` | `auto` | `auto`, `id`, atau `en` |
| `pray.latitude` / `pray.longitude` | Jakarta | Koordinat lokasi |
| `pray.method` | `Kemenag` | Subuh 20°, Isya 18° (tersedia juga JAKIM, MUIS, MWL, ISNA, Egypt, Makkah, Karachi) |
| `pray.ihtiyat` | `2` | Menit pengaman, sama dengan Kemenag |
| `pray.remindBeforeMinutes` | `10` | 0 = matikan pengingat awal |
| `pray.modalNotification` | `false` | `true` = dialog yang harus diklik, susah terlewat |
| `pray.hijriOffset` | `0` | Isi `1` jika awal Ramadhan versi pemerintah sehari setelah Umm al-Qura |
| `pray.sound.enabled` | `true` | Putar suara bersama notifikasi |
| `pray.sound.file` | kosong | File adzan untuk semua waktu (kosong = ding-dong) |
| `pray.sound.fajrFile` | kosong | File adzan khusus Subuh (opsional) |
| `pray.sound.volume` | `80` | 0–100 |
| `pray.sound.beforeReminder` | `true` | Ding-dong untuk pengingat awal |

Jam ditampilkan sesuai timezone sistem. Jadwal hasil perhitungan bisa selisih ±1–2 menit dari jadwal resmi. Tanggal Ramadhan adalah perkiraan, sedangkan tanggal resmi mengikuti sidang isbat.

## Development

- `npm test` membuild lalu menjalankan test.
- Tekan F5 untuk membuka Extension Development Host (otomatis menjalankan `npm: build`).
