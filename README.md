# SetPlot V5 - Local Recommendation Engine

- Eski antrenmanlar API'ye gönderilmez.
- App eski CSV loglarını okuyacak şekilde tasarlandı.
- Bu pakette `sample_logs/` altında örnek CSV dosyaları var.
- Charge ayarları `config/charge_rules.json` içindedir.
- İlk set önerisi: `son 3 antrenmanın ortalama kg + charge`.
- Charge; ağrı/not, hedef tekrar altında kalma veya düşük RIR durumunda uygulanmaz.

Drive'a bağlayınca `sample_logs` dosyaları yerine gerçek Drive klasöründeki CSV'ler okunacak.
