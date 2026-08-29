# FullShot Pro - Chrome Ekran Görüntüsü & Video Kaydedici 📸🎥

**FullShot Pro**, Google Chrome üzerinde web sayfalarının tamamını, o an ekranda görünen kısmını, seçtiğiniz bir öğeyi/bölümü veya serbest dikdörtgen bir alanı piksel kaybı olmadan yüksek çözünürlükte yakalayan; ayrıca sekme ve ekran video kaydı alabilen modern, modüler ve minimalist bir **Manifest V3** tarayıcı eklentisidir.

---

## 📁 Proje Dosya Mimarisi

Proje modern Chrome Eklentisi standartlarına göre modüler olarak yapılandırılmıştır:

```
chrome ss/
├── manifest.json                  # Manifest V3 yapılandırması
├── README.md                      # Proje ve kurulum kılavuzu
│
├── assets/                        # Görsel varlıklar ve ikonlar
│   ├── branding/                  # Banner, logo ve marka görselleri
│   │   ├── fullshot-header-logo.png
│   │   ├── fullshot-logo-transparent.png
│   │   ├── fullshot-logo.png
│   │   └── logo-icon.png
│   └── icons/                     # Eklenti boyutlandırma ikonları (16, 32, 48, 128px)
│       ├── icon16.png
│       ├── icon32.png
│       ├── icon48.png
│       └── icon128.png
│
└── src/                           # Kaynak kodlar ve modüller
    ├── background/                # Service Worker ve arka plan yaşam döngüsü
    │   └── background.js
    ├── content/                   # Sayfa içi kaydırma, DOM ölçümü ve dikişleme
    │   └── content.js
    ├── offscreen/                 # MV3 Arka plan medya/kayıt motoru
    │   ├── offscreen.html
    │   └── offscreen.js
    ├── pages/                     # Kullanıcı arayüzleri ve stüdyolar
    │   ├── popup/                 # Eklenti açılır penceresi (Popup UI)
    │   │   ├── popup.html
    │   │   ├── popup.css
    │   │   └── popup.js
    │   ├── image-studio/          # Görsel düzenleme, sansür & dışa aktarma stüdyosu
    │   │   ├── image-studio.html
    │   │   ├── image-studio.css
    │   │   ├── image-studio.js
    │   │   └── pdf-generator.js
    │   └── video-studio/          # Video oynatıcı, kırpma & dışa aktarma stüdyosu
    │       ├── video-studio.html
    │       ├── video-studio.css
    │       └── video-studio.js
    └── shared/                    # Ortak veri tabanı ve yardımcılar
        └── db.js
```

---

## ✨ Çekim ve Kayıt Özellikleri

1. 📜 **Tam Sayfa Yakala (`Alt + Shift + F`)**:
   - Sayfanın tüm dikey boyutunu otomatik kaydırarak parça parça yakalar ve HTML5 Canvas üzerinde dikişler.
   - Sabit üst menülerin (sticky/fixed navbar) tekrarlamasını önler.
   - Reflow & çift rAF senkronizasyonu ile HUD öğelerinin görüntüye basılmasını engeller.

2. 🖥️ **Görünür Alanı Yakala (`Alt + Shift + V`)**:
   - Ekranda o an görünen pencereyi anında tek tıkla yakalar.

3. 🎯 **Öğe / Bölüm Yakala (`Alt + Shift + E`)**:
   - Fareyle üzerine gelinen tablo, kart veya bölümü net çerçeveyle vurgular; tek tıkla sadece o öğeyi kaydeder.

4. ✂️ **Seçili Alanı Yakala (`Alt + Shift + S`)**:
   - Sayfa üzerinde serbest dikdörtgen bölge seçimi sağlar.

5. 🎥 **Video & Ses Kaydı**:
   - Mevcut sekme veya tüm ekran / masaüstü kaydı.
   - Mikrofon ve sistem/sekme sesi miksleme desteği.
   - Kayıt durdurulduğunda otomatik Video Stüdyosu'nda açılma.

---

## 🎨 Düzenleme Stüdyoları

- **Görsel Stüdyosu**:
  - Kalem, Fosforlu Vurgulayıcı, Ok, Dikdörtgen, Daire, Metin, Adım Numaraları.
  - Sansür / Mozaik Blur aracı.
  - Panoya Kopyalama (Clipboard API).
  - PNG, JPEG ve çok sayfalı PDF dışa aktarımı.
- **Video Stüdyosu**:
  - Kare kare önizleme, kırpma (Trim / Slice), WebM / MP4 dışa aktarma.

---

## 🚀 Kurulum Adımları

1. Google Chrome'da `chrome://extensions` adresine gidin.
2. Sağ üst köşedeki **Geliştirici modu**'nu (Developer mode) açın.
3. Sol üstteki **Paketlenmemiş öğe yükle** butonuna basarak çalışma alanı klasörünü seçin:
   ```
   c:\Users\cagan\Desktop\chrome ss
   ```
4. Eklentiniz anında kullanıma hazır hale gelecektir.
