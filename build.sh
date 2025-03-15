#!/bin/bash

# Sanal ortamı oluştur
echo "Sanal ortam oluşturuluyor..."
python3 -m venv venv

# Sanal ortamı aktifleştir
echo "Sanal ortam aktifleştiriliyor..."
source venv/bin/activate

# Bağımlılıkları yükle
echo "Python bağımlılıklarını yükleniyor..."
pip install --upgrade pip
pip install -r requirements.txt

# Betik tamamlandı
echo "Yapılandırma tamamlandı!" 