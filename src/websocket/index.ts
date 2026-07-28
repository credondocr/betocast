import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    console.log(`[WS] Cliente conectado: ${socket.id}`);

    socket.on('join-stream', (streamId: string) => {
      socket.join(`stream:${streamId}`);
      console.log(`[WS] ${socket.id} se unió a stream:${streamId}`);
    });

    socket.on('leave-stream', (streamId: string) => {
      socket.leave(`stream:${streamId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[WS] Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
}

export function getIo(): Server {
  if (!io) throw new Error('Socket.io no inicializado');
  return io;
}
