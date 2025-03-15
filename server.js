// Bu dosya Render platformunda Node.js dağıtımını yönetmek için oluşturuldu
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Sanal ortam dizini
const venvDir = path.join(__dirname, 'venv');
const isWindows = process.platform === 'win32';
const pythonBin = path.join(venvDir, isWindows ? 'Scripts' : 'bin', 'python');
const pipBin = path.join(venvDir, isWindows ? 'Scripts' : 'bin', 'pip');

// Sanal ortam oluşturma ve bağımlılıkları yükleme fonksiyonu
function setupVirtualEnv() {
  try {
    console.log('Python sanal ortamı oluşturuluyor...');
    
    // Eğer sanal ortam zaten varsa tekrar oluşturmaya gerek yok
    if (!fs.existsSync(venvDir)) {
      execSync('python3 -m venv venv', { stdio: 'inherit' });
    }
    
    console.log('Python bağımlılıkları yükleniyor...');
    execSync(`${pipBin} install -r requirements.txt`, { stdio: 'inherit' });
    
    return true;
  } catch (error) {
    console.error('Sanal ortam oluşturma veya bağımlılık yükleme hatası:', error.message);
    return false;
  }
}

// Uygulamayı başlatma fonksiyonu
function startApp() {
  console.log('Python uygulaması başlatılıyor...');
  
  // Render'ın beklediği portu çevre değişkeni olarak ayarla
  const env = { ...process.env };
  if (!env.PORT) {
    env.PORT = '10000'; // Render için varsayılan port
  }
  
  const python = spawn(pythonBin, ['app.py'], { env });

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
}

// Ana işlem
console.log('Node.js sunucusu çalışıyor...');

// Sanal ortamı kur ve uygulamayı başlat
if (setupVirtualEnv()) {
  startApp();
} else {
  console.error('Python ortamı hazırlanamadı, uygulama başlatılamıyor.');
} 