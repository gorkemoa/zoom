# Python Zoom Klonu

Bu proje, Python Flask ve WebRTC teknolojileri kullanılarak oluşturulmuş basit bir video konferans uygulamasıdır.

## Özellikler

- Gerçek zamanlı video ve ses iletişimi
- Ekran paylaşımı
- Oda oluşturma ve katılma
- Mikrofon ve kamera kontrolü
- Duyarlı arayüz tasarımı

## Gereksinimler

- Python 3.6+
- Flask
- Flask-SocketIO
- Modern bir web tarayıcısı (Chrome, Firefox, Edge, Safari)

## Kurulum

1. Projeyi klonlayın veya indirin
2. Terminal/komut isteminde proje dizinine gidin
3. Gerekli paketleri yükleyin:

```bash
pip install -r requirements.txt
```

4. Uygulamayı başlatın:

```bash
python app.py
```

5. Tarayıcınızda `http://localhost:5000` adresine gidin

## Kullanım

1. Ana sayfada, yeni bir toplantı oluşturmak için "Yeni Toplantı Oluştur" düğmesine tıklayın
2. Var olan bir toplantıya katılmak için, toplantı ID'sini girin ve "Katıl" düğmesine tıklayın
3. Kamera ve mikrofon izinleri istendiğinde izin verin
4. Kontrol panelindeki düğmeler ile mikrofonunuzu ve kameranızı açıp kapatabilir, ekranınızı paylaşabilir veya toplantıdan ayrılabilirsiniz

## Teknolojiler

- Python Flask: Web uygulaması çatısı
- Flask-SocketIO: Gerçek zamanlı iletişim için Socket.IO entegrasyonu
- WebRTC: Tarayıcılar arası doğrudan medya iletişimi
- JavaScript: İstemci tarafı mantığı
- Bootstrap: Duyarlı tasarım için

## Lisans

Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır. 