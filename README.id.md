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
- **Banyak jendela aman**: notifikasi hanya muncul sekali walaupun ada beberapa jendela IDE terbuka.

## Keamanan

- **Tanpa dependency runtime.** `.vsix` hanya berisi JavaScript hasil kompilasi dari kode di repo ini.
- **Hanya 2 devDependency** untuk build, dikunci ke versi persis: `typescript` dan `@types/vscode`, keduanya resmi dari Microsoft dan tanpa dependency turunan. `.npmrc` mematikan skrip install (`ignore-scripts=true`).
- **Tanpa internet.** Jadwal dihitung di lokal, dan kalender Hijriah memakai `Intl` bawaan. Webview memakai Content Security Policy ketat tanpa resource eksternal.

## Build & install ke Antigravity IDE

```sh
npm ci                 # install typescript + @types/vscode (tanpa skrip install)
npm run package        # build TypeScript lalu membuat pray-reminder-<versi>.vsix
"/Applications/Antigravity IDE.app/Contents/Resources/app/bin/antigravity-ide" --install-extension pray-reminder-0.3.0.vsix --force
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

Jam ditampilkan sesuai timezone sistem. Jadwal hasil perhitungan bisa selisih ±1–2 menit dari jadwal resmi. Tanggal Ramadhan adalah perkiraan, sedangkan tanggal resmi mengikuti sidang isbat.

## Development

- `npm test` membuild lalu menjalankan test.
- Tekan F5 untuk membuka Extension Development Host (otomatis menjalankan `npm: build`).
