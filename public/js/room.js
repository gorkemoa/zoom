// Oda ve bağlantı bilgileri
const socket = io('/');
const videoContainer = document.getElementById('videoContainer');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendMsgBtn = document.getElementById('sendMsgBtn');
const muteBtn = document.getElementById('muteBtn');
const videoBtn = document.getElementById('videoBtn');
const screenShareBtn = document.getElementById('screenShareBtn');
const chatToggleBtn = document.getElementById('chatToggleBtn');
const leaveBtn = document.getElementById('leaveBtn');
const copyBtn = document.getElementById('copyBtn');
const roomIdDisplay = document.getElementById('roomId');

// URL'den oda ID'sini al
const roomId = window.location.pathname.split('/').pop();
roomIdDisplay.textContent = roomId;

// Kullanıcı ID'si
const userId = generateRandomId();

// PeerJS bağlantı ayarları
let peerConfig = {
  host: '/',
  port: 3001,  // Varsayılan port
  debug: 3,
  retryDelay: 3000,
  retry: true
};

// Alternatif port denemesi
function tryAlternativePeerPort() {
  console.log('Alternatif PeerJS portuna bağlanılıyor...');
  peerConfig.port = 3002;  // Alternatif port
  return new Peer(undefined, peerConfig);
}

// PeerJS bağlantısı
let myPeer;

try {
  myPeer = new Peer(undefined, peerConfig);
  
  // Bağlantı hatası olursa alternatif porta geç
  myPeer.on('error', (err) => {
    console.error('PeerJS bağlantı hatası:', err.type);
    
    if (err.type === 'network' || err.type === 'server-error' || err.type === 'disconnected') {
      addSystemMessage('Bağlantı hatası! Alternatif sunucuya bağlanılıyor...');
      
      // İlk denemede hata olduysa alternatif portu dene
      if (peerConfig.port === 3001) {
        myPeer = tryAlternativePeerPort();
      }
    }
    
    // Belirli hatalarda ana sayfaya yönlendir
    if (err.type === 'invalid-id' || err.type === 'unavailable-id') {
      alert('Geçersiz oda bağlantısı! Ana sayfaya yönlendiriliyorsunuz.');
      window.location.href = '/';
    }
  });
} catch (err) {
  console.error('İlk PeerJS bağlantısı başarısız, alternatif deneniyor:', err);
  myPeer = tryAlternativePeerPort();
}

// Medya durumu
let myStream;
let screenStream;
let isMuted = false;
let isVideoOff = false;
let isScreenSharing = false;
let isChatHidden = window.innerWidth <= 768 ? true : false;

// Diğer kullanıcıların bağlantıları
const peers = {};

// Görüntü düzenini optimize et
function optimizeLayout() {
  const videos = document.querySelectorAll('.video-item');
  
  // Tek bir video varsa (sadece sen) tam ekran yap
  if (videos.length === 1) {
    videos[0].style.width = '100%';
    videos[0].style.maxHeight = 'calc(100vh - 180px)';
    videoContainer.style.gridTemplateColumns = '1fr';
  } else {
    // Normal grid düzeni
    videos.forEach(video => {
      video.style.width = '';
      video.style.maxHeight = '';
    });
    videoContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
  }
}

// İlk yükleme
async function init() {
  // İlk başta sohbeti gizle/göster
  if (isChatHidden) {
    document.querySelector('.chat-container').classList.add('chat-hidden');
  }

  try {
    // Kamera ve mikrofon izni al
    myStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    
    // Kendi videosunu ekle
    addVideoStream('me', myStream, true);
    
    // Görüntü düzenini optimize et
    optimizeLayout();
    
    // Yeni bağlantılar için hazır ol
    myPeer.on('call', call => {
      call.answer(myStream);
      
      call.on('stream', userVideoStream => {
        if (!peers[call.peer]) {
          addVideoStream(call.peer, userVideoStream, false);
          optimizeLayout(); // Yeni video eklendiğinde düzeni güncelle
        }
      });
      
      call.on('error', (err) => {
        console.error('Görüşme hatası:', err);
        addSystemMessage('Bir katılımcı ile bağlantı kurulamadı.');
      });
      
      peers[call.peer] = call;
    });
    
    // Bağlantı başarılı olduğunda
    myPeer.on('open', (id) => {
      console.log('PeerJS bağlantısı başarılı, ID:', id);
      // Odaya katıl
      socket.emit('join-room', roomId, userId);
      addSystemMessage('Görüşmeye başarıyla bağlandınız!');
    });
    
  } catch (err) {
    console.error('Kamera ve mikrofon erişilemedi:', err);
    alert('Kamera ve mikrofona erişim sağlanamadı. Lütfen izinleri kontrol edin.');
    
    // Sadece sohbet modunda devam etme seçeneği sun
    if (confirm('Görüntü ve ses olmadan sadece sohbet modunda devam etmek ister misiniz?')) {
      // Sohbet-only mod
      addSystemMessage('Sadece sohbet modundasınız. Kamera ve mikrofon erişimi yok.');
      myPeer.on('open', (id) => {
        socket.emit('join-room', roomId, userId);
      });
    } else {
      window.location.href = '/';
    }
  }
}

// Yeni bir kullanıcı bağlandığında
socket.on('user-connected', (newUserId) => {
  console.log('Kullanıcı bağlandı:', newUserId);
  
  if (myStream) {
    connectToNewUser(newUserId, myStream);
    optimizeLayout(); // Yeni bağlantı olduğunda düzeni güncelle
  }
  
  // Kullanıcı katıldı bildirimi
  addSystemMessage(`Kullanıcı katıldı: ${newUserId.substring(0, 8)}`);
});

// Mevcut odadaki kullanıcılar
socket.on('room-users', (users) => {
  console.log('Odadaki diğer kullanıcılar:', users);
  
  if (myStream) {
    users.forEach(otherUserId => {
      if (otherUserId !== userId && !peers[otherUserId]) {
        connectToNewUser(otherUserId, myStream);
      }
    });
    
    // Kullanıcı sayısına göre düzeni optimize et
    optimizeLayout();
  }
});

// Kullanıcı ayrıldığında
socket.on('user-disconnected', (userId) => {
  console.log('Kullanıcı ayrıldı:', userId);
  if (peers[userId]) {
    peers[userId].close();
    delete peers[userId];
  }
  
  // Videoyu kaldır
  const videoElement = document.getElementById(`video-${userId}`);
  if (videoElement) {
    videoElement.remove();
    optimizeLayout(); // Kullanıcı ayrıldığında düzeni güncelle
  }
  
  // Kullanıcı ayrıldı bildirimi
  addSystemMessage(`Kullanıcı ayrıldı: ${userId.substring(0, 8)}`);
});

// Yeni bir mesaj geldiğinde
socket.on('message', (data) => {
  addMessage(data.userId, data.message, data.userId === userId);
});

// Hata mesajı
socket.on('room-error', (data) => {
  console.error('Oda hatası:', data.error);
  addSystemMessage(`Hata: ${data.error}`);
  
  if (data.error === 'invalid-room-id') {
    setTimeout(() => {
      alert('Geçersiz oda ID\'si! Ana sayfaya yönlendiriliyorsunuz.');
      window.location.href = '/';
    }, 2000);
  }
});

// Yeni kullanıcıya bağlan
function connectToNewUser(userId, stream) {
  try {
    const call = myPeer.call(userId, stream);
    
    call.on('stream', userVideoStream => {
      addVideoStream(userId, userVideoStream, false);
      optimizeLayout(); // Yeni video eklendiğinde düzeni güncelle
    });
    
    call.on('close', () => {
      const videoElement = document.getElementById(`video-${userId}`);
      if (videoElement) {
        videoElement.remove();
        optimizeLayout(); // Video kaldırıldığında düzeni güncelle
      }
    });
    
    call.on('error', (err) => {
      console.error('Görüşme bağlantı hatası:', err);
      addSystemMessage(`${userId.substring(0, 8)} ile bağlantı kurulamadı.`);
    });
    
    peers[userId] = call;
  } catch (err) {
    console.error('Kullanıcıya bağlanırken hata:', err);
  }
}

// Video akışını ekrana ekle
function addVideoStream(userId, stream, isMe) {
  // Eğer aynı ID'li video zaten varsa, yeniden ekleme
  if (document.getElementById(`video-${userId}`)) {
    return;
  }

  const videoItem = document.createElement('div');
  videoItem.id = `video-${userId}`;
  videoItem.className = 'video-item';
  
  const video = document.createElement('video');
  video.srcObject = stream;
  video.autoplay = true;
  
  // Kullanıcının kendisi ise
  if (isMe) {
    video.muted = true; // Kendi sesini duymamak için
    video.controls = false;
    videoItem.classList.add('my-video');
  }
  
  const nameTag = document.createElement('div');
  nameTag.className = 'participant-name';
  nameTag.textContent = isMe ? 'Sen' : `Kullanıcı ${userId.substring(0, 8)}`;
  
  // Mikrofon durumu göstergesi
  const micStatus = document.createElement('div');
  micStatus.className = 'muted-icon';
  micStatus.innerHTML = '<i class="fas fa-microphone"></i>';
  micStatus.style.display = 'none';
  
  videoItem.appendChild(video);
  videoItem.appendChild(nameTag);
  videoItem.appendChild(micStatus);
  videoContainer.appendChild(videoItem);
  
  // Video akışı hazır olduğunda oynat
  video.addEventListener('loadedmetadata', () => {
    video.play();
    optimizeLayout(); // Video hazır olduğunda düzeni güncelle
  });
  
  return videoItem;
}

// Mesaj gönderme
function sendMessage() {
  const message = messageInput.value.trim();
  if (message) {
    socket.emit('message', message);
    messageInput.value = '';
  }
}

// Mesajı ekrana ekle
function addMessage(senderId, message, isMe) {
  const messageElement = document.createElement('div');
  messageElement.className = `message ${isMe ? 'message-outgoing' : 'message-incoming'}`;
  
  const sender = document.createElement('div');
  sender.className = 'sender';
  sender.textContent = isMe ? 'Sen' : `Kullanıcı ${senderId.substring(0, 8)}`;
  
  const content = document.createElement('div');
  content.className = 'content';
  content.textContent = message;
  
  messageElement.appendChild(sender);
  messageElement.appendChild(content);
  chatMessages.appendChild(messageElement);
  
  // Otomatik kaydırma
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Sistem mesajı ekle
function addSystemMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message system-message';
  messageElement.style.alignSelf = 'center';
  messageElement.style.backgroundColor = '#f0f0f0';
  messageElement.style.color = '#666';
  messageElement.style.fontSize = '0.85rem';
  messageElement.style.padding = '5px 10px';
  messageElement.textContent = message;
  
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Rastgele ID oluştur
function generateRandomId() {
  return Math.random().toString(36).substring(2, 10);
}

// Buton olayları
muteBtn.addEventListener('click', () => {
  isMuted = !isMuted;
  myStream.getAudioTracks().forEach(track => {
    track.enabled = !isMuted;
  });
  
  muteBtn.innerHTML = isMuted ? 
    '<i class="fas fa-microphone-slash"></i>' : 
    '<i class="fas fa-microphone"></i>';
  
  muteBtn.classList.toggle('muted', isMuted);
  
  // Kendi videosunda mikrofon simgesi göster/gizle
  const myVideo = document.getElementById('video-me');
  if (myVideo) {
    const micIcon = myVideo.querySelector('.muted-icon');
    if (micIcon) {
      micIcon.style.display = isMuted ? 'block' : 'none';
      micIcon.innerHTML = isMuted ? '<i class="fas fa-microphone-slash"></i>' : '<i class="fas fa-microphone"></i>';
    }
  }
});

videoBtn.addEventListener('click', () => {
  isVideoOff = !isVideoOff;
  myStream.getVideoTracks().forEach(track => {
    track.enabled = !isVideoOff;
  });
  
  videoBtn.innerHTML = isVideoOff ? 
    '<i class="fas fa-video-slash"></i>' : 
    '<i class="fas fa-video"></i>';
  
  videoBtn.classList.toggle('muted', isVideoOff);
  
  // Video kapalıysa arka planı koyu yap
  const myVideo = document.getElementById('video-me');
  if (myVideo) {
    myVideo.style.backgroundColor = isVideoOff ? '#333' : '';
  }
});

screenShareBtn.addEventListener('click', async () => {
  try {
    if (!isScreenSharing) {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      
      // Ekran paylaşımı videosunu değiştir
      const myVideo = document.querySelector(`#video-me video`);
      const originalStream = myVideo.srcObject;
      myVideo.srcObject = screenStream;
      
      // Ekran paylaşımı bittiğinde
      screenStream.getVideoTracks()[0].onended = () => {
        myVideo.srcObject = originalStream;
        isScreenSharing = false;
        screenShareBtn.innerHTML = '<i class="fas fa-desktop"></i>';
        screenShareBtn.classList.remove('active');
      };
      
      isScreenSharing = true;
      screenShareBtn.innerHTML = '<i class="fas fa-stop-circle"></i>';
      screenShareBtn.classList.add('active');
    } else {
      // Paylaşımı durdur
      screenStream.getTracks().forEach(track => track.stop());
      const myVideo = document.querySelector(`#video-me video`);
      myVideo.srcObject = myStream;
      
      isScreenSharing = false;
      screenShareBtn.innerHTML = '<i class="fas fa-desktop"></i>';
      screenShareBtn.classList.remove('active');
    }
  } catch (err) {
    console.error('Ekran paylaşımı başlatılamadı:', err);
    addSystemMessage('Ekran paylaşımı başlatılamadı. Lütfen tekrar deneyin.');
  }
});

chatToggleBtn.addEventListener('click', () => {
  const chatContainer = document.querySelector('.chat-container');
  isChatHidden = !isChatHidden;
  
  if (isChatHidden) {
    chatContainer.classList.add('chat-hidden');
  } else {
    chatContainer.classList.remove('chat-hidden');
  }
  
  chatToggleBtn.classList.toggle('active', !isChatHidden);
  
  // Sohbet kapandığında video düzenini güncelle
  setTimeout(optimizeLayout, 300);
});

// Mesaj gönderme
sendMsgBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

// Davet bağlantısını kopyalama
copyBtn.addEventListener('click', () => {
  const roomUrl = window.location.href;
  navigator.clipboard.writeText(roomUrl).then(() => {
    alert('Davet bağlantısı panoya kopyalandı!');
  });
});

// Görüşmeden ayrılma
leaveBtn.addEventListener('click', () => {
  if (confirm('Görüşmeden ayrılmak istediğinize emin misiniz?')) {
    window.location.href = '/';
  }
});

// Pencere boyutu değiştiğinde düzeni güncelle
window.addEventListener('resize', optimizeLayout);

// Bağlantı koptuğunda otomatik yeniden bağlan
window.addEventListener('online', () => {
  addSystemMessage('İnternet bağlantınız yeniden kuruldu, görüşmeye tekrar bağlanılıyor...');
  location.reload();
});

window.addEventListener('offline', () => {
  addSystemMessage('İnternet bağlantınız kesildi. Lütfen bağlantınızı kontrol edin.');
});

// Sayfa yüklendiğinde başlat
init(); 