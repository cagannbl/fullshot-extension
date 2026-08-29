# FullShot Pro - Profesyonel Chrome Ekran Alıntısı & Video Kayıt Stüdyosu 📸🎥

<p align="center">
  <img src="assets/branding/fullshot-header-logo.png" alt="FullShot Pro Logo" width="560">
</p>

<p align="center">
  <strong>Gelişmiş 2D/3D Canvas düzenleyici, piksel cetveli, optik karakter tanıma (OCR), akıllı veri sansürleme (DLP) ve donanım hızlandırmalı video/GIF kayıt özellikleriyle donatılmış yeni nesil Manifest V3 Chrome eklentisi.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Manifest-V3-6D8196?style=flat-square" alt="Manifest V3">
  <img src="https://img.shields.io/badge/Status-100%25%20Tested%20(130%2B%20Checks)-00E676?style=flat-square" alt="Test Status">
  <img src="https://img.shields.io/badge/License-MIT-FFFFE3?style=flat-square&logoColor=black" alt="License">
  <img src="https://img.shields.io/badge/Zero--Dependency-Pure%20JS-CBCBCB?style=flat-square" alt="Pure JS">
</p>

---

## 🌟 Öne Çıkan Özellikler

### 📸 1. Akıllı Ekran Yakalama & Dikişleme Motoru
- **📜 Tam Sayfa Dikişleme (Full-Page Stitching - `Alt + Shift + F`)**: Sonsuz kaydırma ve dinamik DOM yapılarında sabit menüleri (`sticky/fixed navbar`) akıllıca filtreleyerek piksel kayıpsız dikey dikişleme yapar.
- **🖥️ Görünür Alan Yakalama (`Alt + Shift + V`)**: O an ekranda görünen pencereyi GPU çift rAF senkronizasyonuyla anında yakalar.
- **🎯 Etkileşimli Öğe Yakalama (`Alt + Shift + E`)**: Fareyle üzerine gelinen DOM elemanını (kart, buton, tablo vb.) otomatik çerçeveleyip tek tıkla kaydeder.
- **✂️ Hassas Alan Seçimi (`Alt + Shift + S`)**: Serbest dikdörtgen kırpma alanı.
- **🔍 8x Büyüteç & Piksel Renk Seçici**: Seçim anında 8x yakınlaştırma loupe'u ve <kbd>C</kbd> tuşu ile anlık HEX/RGB renk kodunu panoya kopyalama.
- **⚡ Yüzen Hızlı Eylem Çubuğu (Quick Bar HUD)**: Çekim sonrası sayfa sınırlarına duyarlı mini bar ile tek tıkla Kopyala, İndir, OCR veya Stüdyoya Aktar.

---

### 🎨 2. Gelişmiş 2D/3D Görsel Düzenleme Stüdyosu (Image Studio)
- **📐 3D İzometrik Eğim & Mockup Görselleştirici**:
  - Yatay ve dikey -25°..+25° serbest 3D eğim açısı (2D Affine Projeksiyon & Biliyer İnterpolasyon).
  - **Cihaz Çerçeveleri**: iPhone 16 Pro, Safari Penceresi, macOS Terminal ve Düz kart görünümleri.
  - **6 Mesh Degrade Teması**: Modern siber, günbatımı, mor aura, karanlık şıklık gibi hazır zeminler.
- **🛡️ Akıllı Otomatik Sansür (DLP / Auto-Censor - `Shift + B`)**:
  - Regex ve Luhn Mod-10 algoritmalarıyla Kredi Kartları, E-postalar, API Key'ler, IP adresleri ve TC Kimlik Numaralarını otomatik tespit edip sansürler.
- **🔦 Spotlight Odak Vurgusu (`F`)**: Görselin istenen bölgesini net bırakıp geri kalanını %65 karartarak dikkat çeker.
- **🔍 Cam Büyüteç Merceği (`Z`)**: 1.5x - 4.0x optik yakınlaştırma sağlayan 3D cam efektli büyüteç merceği.
- **🏷️ QA Damgaları & 3D Klavye Tuşları (`E`)**: `[APPROVED]`, `[REJECTED]`, `[BUG]`, `[WIP]` kalite mühürleri ve `[Ctrl]`, `[Cmd]`, `[Shift]` 3D klavye tuş başlıkları.
- **🧽 Akıllı Nesne Silgisi (`Silgi / Delete / Backspace`)**: Eklenen ok, metin, şekil veya damgaları tek tıkla sahneden kaldırır.
- **🎨 2D HSV Profesyonel Renk Paleti**: Dahili tarayıcı pipeti (EyeDropper), 2 satırlı renk kütüphanesi ve HEX/RGB seçici popover.
- **✏️ Vektörel Çizim Araçları**: Kaligrafi düzgünleştirmeli fırça, fosforlu vurgulayıcı, çift yönlü kavisli Bézier okları, otomatik artan adım rozetleri (#1, #2, #3...) ve konuşma balonları.
- **🖨️ Çoklu Format İhracı**: PNG HD (Retina 1:1), JPEG, WebP, Panoya Kopyalama ve Türkçe UTF-8 destekli sıfır bağımlılıklı PDF 1.4 üretimi.

---

### 🎥 3. Ekran & Sekme Video Kayıt Stüdyosu (Video Studio)
- **🎬 Esnek Kayıt Modları**: Mevcut sekme veya tüm ekran/uygulama penceresi kaydı.
- **🎙️ Web Audio Mikseri & DSP Gürültü Filtreleri**:
  - Sistem sesi ve mikrofonu canlı miksleme.
  - 85Hz High-Pass filtre ile dip gürültü kesme + 50Hz/60Hz elektrik vızıltısı giderici Notch filtre.
- **🎛️ Canlı Kayıt Araçları**:
  - **Kamera Baloncuğu**: Boyutu ayarlanabilir (S/M/L), ayna modlu ve sese duyarlı neon halolu (Audio Halo) web kamerası bindirmesi.
  - **Fare Efektleri (`Alt + Shift + S`)**: Sol ve sağ tık şok dalgaları (mavi/kırmızı) ve sunum spot ışığı.
  - **Yüzen Kayıt Çubuğu**: Sürüklenebilir mini süre sayacı ve anında durdurma HUD'ı.
- **🎞️ Video Kırpma & GIF İhracı**:
  - Video stüdyosunda timeline üzerinden In/Out kırpma noktaları belirleme.
  - Saf JS Median-Cut + LZW renk paletiyle optimize edilmiş **Animasyonlu GIF** çıktısı veya WebM/MP4 indirme.
- **⏱️ WebM Süre Başlığı Kurtarma (Duration Fixer)**: EBML segment başlığını düzelterek ileri/geri sarma sorununu çözer.

---

### 🛠️ 4. Sayfa İçi Geliştirici & Tasarımcı Araçları
- **📏 Figma Tarzı Piksel Cetveli (`Alt + Shift + R`)**: Sayfadaki tüm DOM öğelerinin genişlik, yükseklik ve aralarındaki piksel mesafesini gerçek zamanlı ölçer.
- **📌 Ekrana Sabitle (Pin to Screen / Document PiP)**: Alınan ekran alıntısını sayfa üzerinde %10-%100 saydamlık ayarıyla yüzen bir pencereye sabitler.
- **🔤 Sayfa İçi OCR (Optik Karakter Tanıma)**: Ekrandaki görsel veya tablodan tek tıkla doğrudan metin ayıklar ve panoya kopyalar.

---

## ⌨️ Klavye Kısayolları

| Kısayol | İşlev |
|---|---|
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd> | 📜 Tam Sayfa Ekran Görüntüsü Yakala |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>V</kbd> | 🖥️ Görünür Alanı Yakala |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd> | 🎯 Seçilen DOM Öğesini Yakala |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> | ✂️ Serbest Dikdörtgen Alan Kırp |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> | 📏 Figma Piksel Cetvelini Aç / Kapat |
| <kbd>C</kbd> (Kırpma anında) | 🔍 Büyüteç altındaki pikselin HEX rengini kopyala |
| <kbd>Shift</kbd> + <kbd>B</kbd> (Stüdyoda) | 🛡️ Otomatik Hassas Veri Sansürleme (DLP) |
| <kbd>F</kbd> (Stüdyoda) | 🔦 Spotlight Odak Aracı |
| <kbd>Z</kbd> (Stüdyoda) | 🔍 Cam Büyüteç Merceği |
| <kbd>E</kbd> (Stüdyoda) | 🏷️ QA Damgası & Tuş Başlığı Ekle |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> / <kbd>Y</kbd> | ↩️ Geri Al / İleri Al |
| <kbd>Space</kbd> + <kbd>Sürükle</kbd> | ✋ Tuvalde Serbest Kaydırma (Pan) |

---

## 📁 Proje Dizin Yapısı

```
chrome ss/
├── manifest.json                            # Manifest V3 ana yapılandırması
├── package.json                             # Test ve derleme komutları
├── README.md                                # Kullanıcı ve tanıtım dokümantasyonu
├── AGENTS.md                                # AI & Geliştirici mimari rehberi
├── ARCHITECTURE.md                          # Detaylı akış ve sistem diyagramları
│
├── assets/                                  # Statik marka ve ikon varlıkları
│   ├── branding/                            # SVG ve PNG logolar
│   │   ├── fullshot-logo.svg
│   │   └── fullshot-header-logo.png
│   └── icons/                               # 16, 32, 48, 128px PNG ikonlar
│
├── scripts/                                 # Test ve CI/CD otomasyon betikleri
│   ├── validate.js                          # 130+ kontrollü sözdizimi ve link denetleyicisi
│   ├── browser-test.js                      # DOM & tarayıcı çalışma zamanı test paketi
│   └── package-zip.js                       # Dağıtım paketi oluşturucu
│
└── src/                                     # Modüler kaynak kodlar
    ├── background/                          # MV3 Service Worker & Durum Makinesi
    │   └── background.js
    │
    ├── content/                             # Sayfa içi betikler ve Shadow DOM HUD'ları
    │   ├── content.js                       # Ana koordinatör ve mesaj yönlendirici
    │   ├── capture/                         # DOM ölçümü ve dikişleme motoru
    │   │   ├── dom-measurer.js              # Gerçek scrollHeight, DPR ve boyut ölçümleri
    │   │   ├── scroll-stitcher.js           # Çok adımlı kaydırmalı dikişleme motoru
    │   │   └── sticky-filter.js             # Sabit üst menü (sticky navbar) filtresi
    │   └── hud/                             # İzole Shadow DOM v1 Arayüz Bileşenleri
    │       ├── area-selector.js             # Kırpma alanı, 8x loupe ve renk seçici
    │       ├── camera-bubble.js             # Sürüklenebilir web kamerası & Audio Halo
    │       ├── countdown-hud.js             # 3.. 2.. 1.. Geri sayım sayacı
    │       ├── cursor-effects.js            # Tıklama dalgaları ve sunum spotu
    │       ├── element-picker.js            # Hover outline ve tek tıkla öğe yakalama
    │       ├── pin-window.js                # Ekrana sabitleme & Document PiP
    │       ├── pixel-ruler.js               # Figma tarzı CSS piksel cetveli
    │       ├── progress-hud.js              # Dikişleme yüzde ilerleme çubuğu
    │       ├── quick-bar-hud.js             # Yüzen hızlı aksiyon çubuğu (OCR, İndir, Stüdyo)
    │       ├── recording-bar.js             # Sürüklenebilir video kayıt kontrol paneli
    │       └── toast-hud.js                 # Sayfa içi bildirim baloncukları
    │
    ├── offscreen/                           # Arka plan medya işleme konteyneri
    │   ├── offscreen.html
    │   └── offscreen.js                     # MediaRecorder, Web Audio DSP mikseri, OCR
    │
    ├── pages/                               # Eklenti Arayüz Sayfaları
    │   ├── popup/                           # Eklenti açılır menüsü
    │   │   ├── popup.html
    │   │   ├── popup.css
    │   │   └── popup.js
    │   ├── image-studio/                    # 2D/3D Görsel Düzenleme Stüdyosu
    │   │   ├── image-studio.html
    │   │   ├── image-studio.css
    │   │   ├── image-studio.js
    │   │   ├── engine/                      # Tuval mikro motorları (DLP, Renderer, Zoom, History)
    │   │   ├── export/                      # Mockup, PDF, Watermark ve Resim İhracı
    │   │   └── tools/                       # Çizim, Silgi, Damga, Spot, Büyüteç araçları
    │   └── video-studio/                    # Video Stüdyosu & Oynatıcı
    │       ├── video-studio.html
    │       ├── video-studio.css
    │       ├── video-studio.js
    │       └── export/                      # Saf JS GIF Kodlayıcı (gif-exporter.js)
    │
    └── shared/                              # Ortak kütüphaneler
        ├── constants.js                     # Mesajlaşma protokolleri ve eylem sabitleri
        └── db.js                            # FullShotMediaDB v2 (IndexedDB veritabanı)
```

---

## 🚀 Kurulum (Geliştirici Modu)

1. Google Chrome tarayıcınızda adres çubuğuna `chrome://extensions` yazıp gidin.
2. Sağ üst köşedeki **Geliştirici modu** (Developer mode) anahtarını açık konuma getirin.
3. Sol üstteki **Paketlenmemiş öğe yükle** (Load unpacked) butonuna tıklayın.
4. Bu proje klasörünü (`c:\Users\cagan\Desktop\chrome ss`) seçin.
5. Eklenti simgesini tarayıcı araç çubuğuna sabitleyerek kullanmaya başlayabilirsiniz!

---

## 🧪 Test & Otomasyon

Projede sözdizimi, MV3 izinleri, Keep-Alive yaşam döngüsü, DOM bağlamları ve link bütünlüğü için sıfır bağımlılıklı otomatik doğrulama paketi bulunmaktadır:

```bash
# Tüm mimari & sözdizimi testlerini çalıştır (130+ kontrol)
npm test

# Derin tarayıcı & DOM bağlam testlerini çalıştır
npm run test:browser

# Chrome Web Store için üretim zip paketini derle (dist/FullShot-Pro-Extension.zip)
npm run build:zip
```

---

## 📄 Lisans

Bu proje **MIT** lisansı ile lisanslanmıştır.
