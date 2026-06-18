import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

// Initialize the socket client
// Auto-connect is disabled initially so we can control connection lifecycles within our dashboard if needed,
// or we can let it auto-connect. Let's enable auto-connect for simplicity.
const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['websocket'], // Force WebSocket transport
});

export default socket;
