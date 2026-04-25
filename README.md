#  Pomodoro Zamanlayıcı

> Odak ve verimlilik takip uygulaması — harici kütüphane kullanılmadan, saf web teknolojileriyle geliştirildi.

---

##  Proje Hakkında

Pomodoro Tekniği, çalışmayı kısa, odaklanmış aralıklara (genellikle 25–30 dakika) bölüp ardından kısa molalar vererek verimliliği artıran bir zaman yönetimi yöntemidir. Bu uygulama, söz konusu tekniği desteklemenin ötesinde; oturum geçmişi, haftalık istatistikler ve yapay zeka destekli odak skoru gibi özelliklerle gerçek bir verimlilik aracına dönüşmüştür.

---

##  Özellikler

###  Zamanlayıcı
- Özelleştirilebilir odak süresi (5–90 dk) ve mola süresi (1–30 dk)
- Başlat / Duraklat / Sıfırla / Erken Bitir kontrolleri
- SVG tabanlı animasyonlu ilerleme halkası
- Son 10 saniyede tik sesi geri sayımı
- Klavye kısayolları: `Space` (başlat/duraklat), `R` (sıfırla), `Escape` (bildirimi kapat)

###  Bildirimler
- **Web Audio API** ile sıfırdan üretilen melodiler:
  - *Ara vakti* → C5–E5–G5–C6 akordu
  - *Mola bitti* → Enerjik üçgen dalga melodisi
- **Web Speech API** ile Türkçe sesli bildirimler (`tr-TR`)
- Tarayıcı bildirimleri (izin istenirse)
- Tarayıcı sekme başlığı anlık zamanlayıcı göstergesi

### 📊 İstatistikler & Analitik
- Bugünkü oturum sayısı ve toplam dakika
- Toplam oturum ve toplam odak süresi
- Günlük ortalama hesaplama (son 7 gün)
- Gün serisi (streak) takibi
- Haftalık bar chart görselleştirmesi
- Son 15 oturumun geçmiş listesi

###  Odak Seviyesi Algoritması
Son 7 günün verilerini analiz ederek 0–100 arası bir odak skoru hesaplar:

| Faktör | Max Puan |
|--------|----------|
| Günlük ortalama dakika | 30 |
| Tamamlanan oturum sayısı | 40 |
| Toplam odak süresi | 30 |

Skora göre 4 seviye belirlenir: `🌱 Az` → `🌿 Orta` → `🌳 İyi` → `🏆 Çok İyi`. Her seviyeye özel, rastgele seçilen motivasyon önerileri sunulur.

###  Veri Kalıcılığı
- Tüm oturum verileri, ayarlar ve geçmiş `localStorage` ile saklanır
- Tarayıcı kapatılsa veya sayfa yenilense bile veriler korunur
- Kısmi oturum desteği: En az 1 dakika odaklanıldıysa oturum kayıt edilir

---

##  Kullanılan Teknolojiler

| Teknoloji | Kullanım Amacı | Neden Seçildi |
|-----------|---------------|---------------|
| **Vanilla JavaScript** | Uygulama mantığı | Framework bağımlılığı olmadan closure, module pattern ve DOM manipülasyonunu derinlemesine öğrenmek için |
| **Web Audio API** | Ses üretimi | Harici ses dosyasına gerek duymadan programatik melodi oluşturmak için |
| **Web Speech API** | Sesli bildirimler | Kullanıcı ekrana bakmasa bile Türkçe sesli uyarı sunmak için |
| **localStorage** | Veri yönetimi | Sunucu veya veritabanı gerektirmeden kalıcı durum yönetimi için |
| **SVG** | İlerleme halkası | Vektörel, piksel-bağımsız ve CSS ile animasyona uygun grafik için |
| **CSS Animations** | Arka plan efektleri, geçişler | Harici animasyon kütüphanesi kullanmadan akıcı UI için |

---

##  Dosya Yapısı

```
pomodoro-app/
├── index.html      # Uygulama yapısı ve UI bileşenleri
├── style.css       # Tüm stiller, animasyonlar ve tema
└── app.js          # Uygulama mantığı (IIFE modül yapısı)
```

### `app.js` İç Yapısı
```
AudioEngine     → Web Audio API ses motoru
State           → localStorage tabanlı durum yönetimi
Timer Core      → setInterval tabanlı zamanlayıcı çekirdeği
Timer Display   → SVG ve DOM güncelleme fonksiyonları
Timer Actions   → Başlat / Duraklat / Sıfırla / Bitir
Session Rec.    → Oturum kayıt ve geçmiş yönetimi
Notifications   → Overlay ve tarayıcı bildirimleri
Stats           → Odak skoru, streak ve haftalık grafik
Event Listeners → Klavye ve tıklama olayları
```

---

##  Kurulum & Çalıştırma

Herhangi bir kurulum gerektirmez. Dosyaları indirip `index.html` dosyasını bir tarayıcıda açmanız yeterlidir.

```bash
# Repo'yu klonla
git clone https://github.com/kullanici-adi/pomodoro-app.git

# Klasöre gir
cd pomodoro-app

# index.html'i tarayıcıda aç
open index.html
# veya
start index.html   # Windows
```

> **Not:** Web Audio API ve Speech Synthesis'in düzgün çalışması için uygulamanın bir kullanıcı etkileşimiyle (tıklama) başlatılması gerekir. Bu, tarayıcıların autoplay politikasından kaynaklanır.

---

##  Klavye Kısayolları

| Kısayol | Eylem |
|---------|-------|
| `Space` | Zamanlayıcıyı başlat / duraklat |
| `R` | Zamanlayıcıyı sıfırla |
| `Escape` | Açık bildirimi kapat |

---

##  Tarayıcı Desteği

Uygulama modern tarayıcılarda tam destek sunar. Web Audio API ve Speech Synthesis API, tüm güncel tarayıcılarda desteklenmektedir.

| Tarayıcı | Destek |
|----------|--------|
| Chrome 66+ |  Tam destek |
| Firefox 60+ |  Tam destek |
| Safari 14+ |  Tam destek |
| Edge 79+ |  Tam destek |

---

##  Geliştirici

**Burak Can İnal**  


---

##   Lisans

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.
