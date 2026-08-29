# FullShot Pro — AI İyileştirme Görevi

Sen, **FullShot Pro** Chrome uzantısının (Manifest V3) bu depoda çalışan kıdemli bir mühendissin. Aşağıdaki 4 iş paketini sırayla, mevcut mimariyi bozmadan tamamla. Hiçbir adımda mevcut özelliklerin davranışı değişmemeli — sadece iç kalite, güvenlik ve uluslararası hazırlık iyileştirilecek.

---

## Bağlam ve Kısıtlar (her iş paketi için geçerli)

- Mimarî harita için `AGENTS.md`'yi ve `ARCHITECTURE.md`'yi önce oku. Dosya sorumlulukları orada tanımlı; yeni dosya açarsan haritayı da güncelle.
- Tasarım sistemi kurallarına uy: `#4A4A4A` / `#CBCBCB` / `#FFFFE3` / `#6D8196` 4-renk paleti, 12/16px köşe yarıçapı, zero-scrollbar.
- Kritik guardrail'ler aynen korunacak: capture öncesi çift rAF + 50ms gecikme, canvas 16384px limiti, Shadow DOM `:host { all: initial !important; }` izolasyonu, offscreen keep-alive heartbeat.
- Her iş paketi bitiminde `npm test` çalıştır ve **144+ kontrolün tümü yeşil** olduğunu doğrula. Yeşil değilse devam etme, önce kırılan şeyi düzelt.
- Geriye dönük uyumluluk: `FullShotMediaDB` v2 şeması, IndexedDB'deki mevcut kayıtlar ve `chrome.storage.session` anahtar isimleri **değişmeyecek**.
- Commit'leri iş paketi başına ayrı ve anlamlı mesajlarla yap (öğe: `feat(...)`, `fix(...)`, `refactor(...)`, `test(...)`, `chore(...)`).

---

## İş Paketi 1 — İzin ve web_accessible_resources Daraltma (öncelik: yüksek)

Hedef: Chrome Web Store inceleme sürtünmesini azaltmak, saldırı yüzeyini küçültmek.

1. `manifest.json` içindeki `web_accessible_resources` listesini gerçekten content script'lerin sayfa içinde yüklediği kaynaklarla sınırla. Şu an `src/pages/*`, `src/offscreen/*`, `src/shared/*` gibi tüm dizinler `<all_urls>`'e açık; bunlar sayfa içinden erişilebilir olmak zorunda değil.
2. Önce `src/content/content.js` ve `src/content/hud/*` içindeki tüm `chrome.runtime.getURL` çağrılarını tarayıp sayfa içine gerçekten enjekte edilen kaynakların listesini çıkar. Yalnızca bu dosyalar (ve gerçekten ihtiyaç duyan varlıklar: `assets/branding/*` vb.) WAR'da kalmalı.
3. `chrome.runtime.getURL(...)` kullanan her kod yolunu kontrol et: eğer bir kaynak yalnızca uzantı sayfalarından (popup, studio, offscreen) kullanılıyorsa WAR'dan çıkar.
4. `permissions` listesini gözden geçir: her izin için tek cümlelik gerekçe belgele. Kaldırılabilecek bir izin varsa (ör. `unlimitedStorage` gerçekten gerekli mi, karar verip gerekçelendir) kaldır; gerekliyse dokunma.
5. Değişiklik sonrası tüm yakalama akışlarını elle doğrula: tam sayfa kaydırma, görünür alan, seçili alan, öğe yakalama, kayıt, pin-to-screen, quick bar — hepsi çalışmalı.

Kabul kriteri: WAR listesi taranan `getURL` sonuçlarıyla birebir örtüşüyor; `npm test` yeşil; işlevsel regresyon yok.

---

## İş Paketi 2 — i18n ve Mağaza Kimliği (öncelik: yüksek)

Hedef: Uluslararası dağıtıma hazır olmak, Türkçe/İngilizce karışıklığını bitirmek.

1. Chrome'un `_locales` altyapısını kur: `_locales/en/messages.json` (varsayılan) ve `_locales/tr/messages.json`.
2. `manifest.json`'daki `name`, `description` ve tüm `commands[].description` alanlarını `__MSG_...__` yer tutucularına çevir; `default_locale: "en"` ekle.
3. Kullanıcıya görünen TÜM metinleri topla: popup, Image Studio araç çubuğu/modalları, Video Studio, tüm content HUD'ları (toast, recording bar, quick bar, progress, countdown vb.). Bunları message key'lerine taşı.
4. Content script'lerde ve HUD'larda mesaj çözümlemesi için paylaşılan bir yardımcı ekle (ör. `window.FullShotDB` modeline uygun olarak `src/shared/i18n.js` içinde `FullShotI18N.t(key)`), `chrome.i18n.getMessage` üzerine ince bir sarmalayıcı olsun.
5. Kod içi `_()` yardımcılarında ve `innerHTML` ile basılan statik etiketlerde Türkçe/İngilizce karışıklığını temizle. Turkish mesajlar `tr` paketine, İngilizceler `en` paketine gitsin.
6. Store listeleme metni (mağaza açıklaması) İngilizce yazılsın; `README.md`'ye iki dilli kısa bir özellik özeti ekle.

Kabul kriteri: Kod tabanında kullanıcıya görünen sert kodlanmış Türkçe string kalmadı; `en` ve `tr` paketlerindeki key setleri birebir aynı; `npm test` yeşil.

---

## İş Paketi 3 — `image-studio.js` Koordinatör Refactoring (öncelik: orta)

Hedef: 2.200 satırlık koordinatör dosyasını sürdürülebilir katmanlara ayırmak.

1. Önce mevcut sorumlulukları envanterle: olay bağlama (event binding), araç durumu (active tool, color, size), katman/render orkestrasyonu, zoom/pan, kısayol yönetimi, modal yönetimi, dışa aktarma tetikleme.
2. Önerilen bölünme (`src/pages/image-studio/` altında):
   - `studio-state.js` — aktif araç, renk, kalınlık, katman durumu; tek doğruluk kaynağı (pub/sub veya basit store deseni).
   - `studio-events.js` — canvas/mouse/keyboard olay bağlamaları; yalnızca duruma ve araç dispatcher'a delegation.
   - `studio-modals.js` — 3D mockup, watermark, shortcuts modal yönetimi.
   - `image-studio.js` — ince koordinatör kalsın: modülleri kur, araç dispatcher'ını besle, `window.FullShotCanvas` API yüzeyini koru.
3. Kısayollar (I, Shift+B, F, Z, E, K vb.) tek bir yerde toplansın; mevcut global namespace'ler (`window.FullShotCanvas.*`) ve fonksiyon imzaları **değişmeyecek** — `tools/` altındaki dosyaların dışa açtığı API'lere dokunma.
4. Davranışsal eşdeğerlik şart: refactoring sırasında hiçbir araç (pen, arrow, blur, spotlight, magnifier, stamp, text, auto-censor, eyedropper) davranışını değiştirmemeli. History stack ve undo/redo akışı aynen korunacak.

Kabul kriteri: `image-studio.js` ≤ ~600 satır; tüm araçlar elle test edildi ve davranış aynı; `npm test` yeşil.

---

## İş Paketi 4 — Davranışsal Testlerin Güçlendirilmesi (öncelik: orta)

Hedef: Statik doğrulamanın ötesine geçip kritik akışları otomatik doğrulamak.

1. `scripts/browser-test.js`'i (headless Chromium) şu kritik akışları kapsayacak şekilde genişlet:
   - Eklenti yükleme + service worker başlatma + `initServiceWorkerState()` kurtarma senaryosu.
   - Popup'un açılması ve yakalama komutlarının mesaj yolunun (background'a `capture-*` aksiyonları) doğru söküldüğü.
   - Image Studio'nun açılması, temiz bir resim yüklemesi, bir araçla çizim yapılması, undo/redo ve dışa aktarmanın (PNG) hatasız dönmesi.
   - `FullShotMediaDB` aç/kayit/okut/sil döngüsü.
2. Testler deterministik olsun: ağ ve zamanlamaya dayanan adımlarda açık bekleme/timeout stratejisi kullan; `npm test` içinde çalışabilir hale getir (ör. `npm test` = validate + browser-test zinciri, başarısızlıkta non-zero exit).
3. `README.md` ve `AGENTS.md`'deki test bölümünü yeni akışlarla senkronize et.

Kabul kriteri: `npm test` tek komutla statik + davranışsal testleri çalıştırıyor; CI'da (gelecekte) çalıştırılabilir durumda; hiçbir test flaky değil.

---

## Yürütme Sırası ve Raporlama

1 → 2 → 3 → 4 sırasını izle (izin/i18n mağaza sunumunu etkilerken refactoring riskli olanı, testleri en sona bırak).

Her iş paketi bitiminde kısa rapor ver: neler değişti, hangi dosyalar etkilendi, `npm test` sonucu, elle doğrulanan akışlar. Belirsiz bir durumla karşılaşırsan varsayım yapma; depodaki `AGENTS.md` kurallarıyla çelişen hiçbir değişikliği yapmadan önce gerekçesini yaz.
