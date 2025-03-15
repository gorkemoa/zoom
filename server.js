// Bu dosya Render platformunda Node.js dağıtımını yönetmek için oluşturuldu
const { spawn } = require('child_process');
const path = require('path');

// Önce Python bağımlılıklarını yükleyelim
console.log('Python bağımlılıkları yükleniyor...');
const pip = spawn('pip', ['install', '-r', 'requirements.txt']);

pip.stdout.on('data', (data) => {
  console.log(`Pip çıktısı: ${data}`);
});

pip.stderr.on('data', (data) => {
  console.error(`Pip hatası: ${data}`);
});

pip.on('close', (code) => {
  console.log(`Pip işlemi ${code} koduyla sonlandı`);
  
  if (code === 0) {
    // Bağımlılıklar başarıyla yüklendiyse Python uygulamasını başlat
    console.log('Python uygulaması başlatılıyor...');
    
    // Render'ın beklediği portu çevre değişkeni olarak ayarla
    const env = { ...process.env };
    if (!env.PORT) {
      env.PORT = '10000'; // Render için varsayılan port
    }
    
    const python = spawn('python', ['app.py'], { env });

    // Standart çıktıyı konsola yönlendirme
    python.stdout.on('data', (data) => {
      console.log(`Python çıktısı: ${data}`);
    });

    // Hata çıktısını konsola yönlendirme
    python.stderr.on('data', (data) => {
      console.error(`Python hatası: ${data}`);
    });

    python.on('close', (code) => {
      console.log(`Python işlemi ${code} koduyla sonlandı`);
    });
  } else {
    console.error('Python bağımlılıkları yüklenemedi, uygulama başlatılamıyor.');
  }
});

console.log('Node.js sunucusu çalışıyor...'); 