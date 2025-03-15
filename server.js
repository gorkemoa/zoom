const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { PeerServer } = require('peer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Alternatif portlar tanımla
const PORT = process.env.PORT || 3000;
const PEER_PORT = process.env.PEER_PORT || 3001;

// PeerJS sunucusu
let peerServer;
try {
  // Üretim ortamında (Render.com) PeerJS sunucusunu Express üzerinden çalıştır
  if (process.env.NODE_ENV === 'production') {
    // Main Express uygulaması üzerinde PeerJS sunucusunu çalıştır
    app.use('/peerjs', require('peer').ExpressPeerServer(server, {
      debug: true,
      path: '/'
    }));
    console.log('PeerJS sunucusu Express üzerinde /peerjs path ile çalışıyor');
  } else {
    // Geliştirme ortamında ayrı bir port üzerinde çalıştır
    peerServer = PeerServer({ port: PEER_PORT, path: '/' });
    console.log(`PeerJS sunucusu port ${PEER_PORT}'de çalışıyor`);
  }
} catch (err) {
  console.error('PeerJS port hatası, alternatif port deneniyor:', err.message);
  // Alternatif port dene
  try {
    if (process.env.NODE_ENV === 'production') {
      // Üretim ortamında hata olursa log kaydet
      console.error('PeerJS Express üzerinde başlatılamadı:', err.message);
    } else {
      peerServer = PeerServer({ port: PEER_PORT + 1, path: '/' });
      console.log(`PeerJS sunucusu alternatif port ${PEER_PORT + 1}'de çalışıyor`);
    }
  } catch (err2) {
    console.error('PeerJS sunucusu başlatılamadı:', err2.message);
  }
}

// Statik dosyaları sunma
app.use(express.static('public'));

// Aktif odalar
const rooms = {};

// Yardımcı fonksiyonlar
function isValidRoomId(roomId) {
  // Temel bir UUID/rastgele ID kontrolü
  return roomId && typeof roomId === 'string' && roomId.length >= 8 && !roomId.includes('/');
}

function cleanRoomId(dirtyRoomId) {
  // URL parçalarını temizle
  if (typeof dirtyRoomId !== 'string') return '';
  
  // URL formatındaysa sadece son kısmı al
  if (dirtyRoomId.includes('/room/')) {
    return dirtyRoomId.split('/room/').pop();
  }
  
  // http:// veya https:// içeriyorsa temizle
  if (dirtyRoomId.includes('://')) {
    const urlParts = dirtyRoomId.split('/');
    return urlParts[urlParts.length - 1];
  }
  
  return dirtyRoomId;
}

// Ana sayfa yönlendirmesi
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Yeni oda oluşturma
app.get('/room', (req, res) => {
  const roomId = uuidv4();
  res.redirect(`/room/${roomId}`);
});

// Belirli bir odaya katılma
app.get('/room/:roomId', (req, res) => {
  let { roomId } = req.params;
  
  // Oda ID'sini temizle
  roomId = cleanRoomId(roomId);
  
  // Geçersiz oda ID'si kontrolü
  if (!isValidRoomId(roomId)) {
    return res.redirect('/?error=invalid-room-id');
  }
  
  // Oda yoksa bile HTML'i gönder, client tarafında kontrol edilecek
  res.sendFile(path.join(__dirname, 'public', 'room.html'));
});

// Oda var mı kontrol etme (AJAX ile kontrol için)
app.get('/api/check-room/:roomId', (req, res) => {
  const { roomId } = req.params;
  
  if (!isValidRoomId(roomId)) {
    return res.json({ exists: false, error: 'invalid-id' });
  }
  
  const roomExists = !!rooms[roomId];
  res.json({ exists: roomExists });
});

// Hatalı URL'leri ana sayfaya yönlendir
app.get('/room/*', (req, res) => {
  res.redirect('/?error=invalid-url');
});

// Socket.io bağlantıları
io.on('connection', (socket) => {
  console.log('Yeni bir kullanıcı bağlandı:', socket.id);

  // Odaya katılma
  socket.on('join-room', (roomId, userId) => {
    // Oda ID'sini temizle ve kontrol et
    roomId = cleanRoomId(roomId);
    
    if (!isValidRoomId(roomId)) {
      socket.emit('room-error', { error: 'invalid-room-id' });
      return;
    }
    
    console.log(`Kullanıcı ${userId} odaya katıldı: ${roomId}`);
    
    // Oda yoksa oluştur
    if (!rooms[roomId]) {
      rooms[roomId] = { users: [] };
    }
    
    // Kullanıcıyı odaya ekle
    rooms[roomId].users.push(userId);
    socket.join(roomId);
    
    // Odadaki diğer kullanıcılara yeni kullanıcı bilgisini gönder
    socket.to(roomId).emit('user-connected', userId);
    
    // Odadaki mevcut kullanıcıları yeni katılana bildir
    socket.emit('room-users', rooms[roomId].users.filter(id => id !== userId));

    // Kullanıcı mesaj gönderdiğinde
    socket.on('message', (message) => {
      io.to(roomId).emit('message', { userId, message });
    });

    // Kullanıcı ayrıldığında
    socket.on('disconnect', () => {
      console.log(`Kullanıcı ${userId} ayrıldı`);
      
      if (rooms[roomId]) {
        rooms[roomId].users = rooms[roomId].users.filter(id => id !== userId);
        
        // Oda boşsa sil
        if (rooms[roomId].users.length === 0) {
          delete rooms[roomId];
        } else {
          socket.to(roomId).emit('user-disconnected', userId);
        }
      }
    });
  });
});

// 404 sayfası
app.use((req, res) => {
  res.status(404).send(`
    <html>
      <head>
        <title>Sayfa Bulunamadı</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          h1 { color: #2d8cff; }
          .btn { display: inline-block; padding: 10px 20px; background-color: #2d8cff; color: white; 
                text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>404 - Sayfa Bulunamadı</h1>
        <p>Aradığınız sayfa bulunamadı veya URL formatında bir hata var.</p>
        <a href="/" class="btn">Ana Sayfaya Dön</a>
      </body>
    </html>
  `);
});

// Express sunucusunu başlat
try {
  server.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
  });
} catch (err) {
  console.error('Sunucu başlatılamadı, alternatif port deneniyor:', err.message);
  // Alternatif port dene
  server.listen(PORT + 1, () => {
    console.log(`Sunucu alternatif port http://localhost:${PORT + 1} adresinde çalışıyor`);
  });
} 