from flask import Flask, render_template, request, session, redirect, url_for
from flask_socketio import SocketIO, emit, join_room, leave_room
import os
import uuid

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'varsayilangizlianahtar')
socketio = SocketIO(app, cors_allowed_origins="*")

active_rooms = {}
active_users = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/oda/<oda_id>')
def oda(oda_id):
    return render_template('oda.html', oda_id=oda_id)

@app.route('/oda-olustur', methods=['POST'])
def oda_olustur():
    oda_id = str(uuid.uuid4())[:8]  # Kısa bir oda ID'si oluştur
    active_rooms[oda_id] = {'users': []}
    return redirect(url_for('oda', oda_id=oda_id))

@socketio.on('connect')
def handle_connect():
    user_id = request.sid
    active_users[user_id] = {'oda_id': None}
    print(f"Yeni bir kullanıcı bağlandı: {user_id}")

@socketio.on('disconnect')
def handle_disconnect():
    user_id = request.sid
    if user_id in active_users:
        oda_id = active_users[user_id].get('oda_id')
        if oda_id and oda_id in active_rooms:
            if user_id in active_rooms[oda_id]['users']:
                active_rooms[oda_id]['users'].remove(user_id)
            
            # Odadaki diğer kullanıcılara bildir
            emit('user_left', {'user_id': user_id}, room=oda_id)
            
            # Oda boş ise odayı sil
            if len(active_rooms[oda_id]['users']) == 0:
                del active_rooms[oda_id]
                
        del active_users[user_id]
    print(f"Kullanıcı ayrıldı: {user_id}")

@socketio.on('join_room')
def handle_join_room(data):
    user_id = request.sid
    oda_id = data['oda_id']
    
    join_room(oda_id)
    
    # Kullanıcı bilgilerini güncelle
    active_users[user_id]['oda_id'] = oda_id
    
    # Oda yoksa oluştur
    if oda_id not in active_rooms:
        active_rooms[oda_id] = {'users': []}
    
    # Kullanıcıyı odaya ekle
    if user_id not in active_rooms[oda_id]['users']:
        active_rooms[oda_id]['users'].append(user_id)
    
    # Odadaki diğer kullanıcılara yeni kullanıcının geldiğini bildir
    emit('user_joined', {'user_id': user_id}, room=oda_id, include_self=False)
    
    # Yeni kullanıcıya odadaki diğer kullanıcıları bildir
    other_users = [u for u in active_rooms[oda_id]['users'] if u != user_id]
    emit('existing_users', {'users': other_users}, room=user_id)
    
    print(f"Kullanıcı {user_id} odaya katıldı: {oda_id}")

@socketio.on('leave_room')
def handle_leave_room(data):
    user_id = request.sid
    oda_id = data['oda_id']
    
    leave_room(oda_id)
    
    # Kullanıcı bilgilerini güncelle
    active_users[user_id]['oda_id'] = None
    
    # Kullanıcıyı odadan çıkar
    if oda_id in active_rooms and user_id in active_rooms[oda_id]['users']:
        active_rooms[oda_id]['users'].remove(user_id)
        
        # Odadaki diğer kullanıcılara bildir
        emit('user_left', {'user_id': user_id}, room=oda_id)
        
        # Oda boş ise odayı sil
        if len(active_rooms[oda_id]['users']) == 0:
            del active_rooms[oda_id]
    
    print(f"Kullanıcı {user_id} odadan ayrıldı: {oda_id}")

# WebRTC sinyal mesajlarını ilet
@socketio.on('signal')
def handle_signal(data):
    to_user = data['to']
    emit('signal', {'from': request.sid, 'signal': data['signal']}, room=to_user)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"Sunucu http://localhost:{port} adresinde çalışıyor")
    socketio.run(app, host='0.0.0.0', port=port, debug=True) 