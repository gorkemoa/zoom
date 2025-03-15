// Bu dosya Render platformunda Node.js dağıtımını yönetmek için oluşturuldu
const { spawn } = require('child_process');
const path = require('path');

// Python uygulamasını başlatma
const python = spawn('python', ['app.py']);

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

console.log('Node.js sunucusu Python uygulamasını başlattı'); 