import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { logger } from '../logger.js';

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    logger.info(`WS client connected: ${socket.id}`);

    socket.on('join-stream', (streamId: string) => {
      socket.join(`stream:${streamId}`);
      logger.debug(`WS ${socket.id} joined stream:${streamId}`);
    });

    socket.on('leave-stream', (streamId: string) => {
      socket.leave(`stream:${streamId}`);
      logger.debug(`WS ${socket.id} left stream:${streamId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`WS client disconnected: ${socket.id}`, { reason });
    });

    socket.on('error', (err) => {
      logger.error(`WS error for ${socket.id}`, { error: err.message });
    });
  });

  io.engine.on('connection_error', (err) => {
    logger.error('WS connection error', { error: err.message, code: err.code });
  });

  return io;
}

export function getIo(): Server {
  if (!io) throw new Error('Socket.io no inicializado');
  return io;
}
