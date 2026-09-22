import { io, Socket } from 'socket.io-client';
import { ref } from 'vue';

let socketInstance: Socket | null = null;
export const isSocketConnected = ref(false);

/**
 * Obtiene o inicializa la instancia singleton de Socket.IO conectada al servidor
 */
export function getSocket(): Socket {
  if (!socketInstance) {
    const host = window.location.origin;
    socketInstance = io(host, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
    });

    socketInstance.on('connect', () => {
      isSocketConnected.value = true;
    });

    socketInstance.on('disconnect', () => {
      isSocketConnected.value = false;
    });

    socketInstance.on('connect_error', (error) => {
      console.warn('Socket.IO connection warning:', error.message);
      isSocketConnected.value = false;
    });
  }

  return socketInstance;
}

/**
 * Desconecta la instancia activa de Socket.IO
 */
export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    isSocketConnected.value = false;
  }
}
