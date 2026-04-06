const io = require('socket.io-client');

const socket = io('http://localhost:3001', {
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log('Socket ID:', socket.id);

  // Try to join as a screen (use a real screen ID from your database)
  socket.emit('screen:join', {
    pairingCode: 'VSVXBP', // Use the code we generated earlier
  });
});

socket.on('screen:joined', (data) => {
  console.log('✅ Screen joined:', data);
});

socket.on('error', (data) => {
  console.log('❌ Error:', data);
});

socket.on('playlist:update', (data) => {
  console.log('📋 Playlist update received:', data);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected');
});

// Keep script running
setTimeout(() => {
  console.log('Sending heartbeat...');
  socket.emit('screen:heartbeat', {
    screenId: 'test',
    timestamp: new Date().toISOString(),
  });
}, 3000);
