# Görüntülü Konuşma Uygulaması

Zoom benzeri bir görüntülü konuşma uygulaması. WebRTC teknolojisi kullanılarak gerçek zamanlı video/ses iletişimi sağlar.

## Özellikler

- Gerçek zamanlı görüntülü ve sesli konuşma
- Oda oluşturma ve odaya katılma
- Ekran paylaşımı
- Metin tabanlı sohbet
- Mikrofon ve kamera kontrolü
- Duyarlı ve mobil uyumlu arayüz

## Teknolojiler

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- WebRTC: PeerJS
- Gerçek zamanlı iletişim: Socket.io

## Kurulum

1. Gereksinimleri yükleyin:
   ```bash
   npm install
   ```

2. Uygulamayı başlatın:
   ```bash
   npm start
   ```

3. Tarayıcınızda aşağıdaki adrese gidin:
   ```
   http://localhost:3000
   ```

## Nasıl Kullanılır

1. Ana sayfada "Yeni Görüşme Başlat" düğmesine tıklayarak yeni bir görüşme odası oluşturun.
2. Oluşturulan odanın bağlantısını kopyalayıp başkalarıyla paylaşın.
3. Diğer kullanıcılar, bu bağlantıyı kullanarak veya ana sayfada oda ID'sini girerek görüşmeye katılabilirler.

## Geliştirme

Geliştirme modunda çalıştırmak için:

```bash
npm run dev
```

Bu komut, dosya değişikliklerinde otomatik olarak sunucuyu yeniden başlatacaktır.

## Lisans

MIT 