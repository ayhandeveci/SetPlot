# SetPlot V10 Final

Bu paket baştan temiz kurulmuş final yapıdır.

## Açılış davranışı

İlk açılışta sadece Drive session ekranı görünür:

- Google OAuth Client ID
- Google Drive Folder ID
- Google Mail

OpenAI API yoktur.

## Drive izinleri

Scope:
- drive.file: uygulamanın oluşturduğu CSV'leri yazmak/güncellemek için
- drive.readonly: Drive klasörüne manuel koyduğun eski CSV loglarını okuyabilmek için

## Çalışma mantığı

1. Session bilgilerini gir.
2. Connect Drive & Open App.
3. Uygulama Drive klasöründeki CSV'leri okur.
4. Workout seç.
5. Prepare Workout.
6. Öneriler eski loglardan hesaplanır.
7. Save Set & Next her basıldığında:
   - o güne ait dosya yoksa oluşturulur
   - varsa aynı dosya güncellenir

Dosya adı:
Day_B_YYYY-MM-DD_log.csv

## Örnek loglar

`sample_logs/` içindeki CSV'leri Google Drive klasörüne yükle.
