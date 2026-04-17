import { io, type Socket } from 'socket.io-client'

function socketBaseUrl(): string {
  const env = import.meta.env.VITE_API_URL
  if (env && typeof env === 'string' && env.length > 0) {
    return env.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return ''
}

let sharedSocket: Socket | null = null

/**
 * Shared Socket.IO client (path /socket.io/ matches backend mount).
 */
export function useSocket() {
  function ensureConnected(): Socket {
    if (sharedSocket?.connected) {
      return sharedSocket
    }
    if (sharedSocket && !sharedSocket.connected) {
      sharedSocket.connect()
      return sharedSocket
    }
    sharedSocket = io(socketBaseUrl(), {
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })
    return sharedSocket
  }

  function disconnect() {
    sharedSocket?.disconnect()
    sharedSocket = null
  }

  return { ensureConnected, disconnect }
}
