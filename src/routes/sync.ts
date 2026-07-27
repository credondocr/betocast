import { Router } from 'express';
import { config } from '../config.js';
import * as voteService from '../services/vote.service.js';
import { parseVote } from '../services/chat-parser.js';
import { MockChatService } from '../services/mock-chat.service.js';
import { getLiveChatId, getChatMessages } from '../services/youtube-chat.service.js';
import { getIo } from '../websocket/index.js';

export const syncRouter = Router();

const mockServices = new Map<string, MockChatService>();

// Track next page tokens for each stream
const youtubeTokens = new Map<string, string | undefined>();

syncRouter.get('/:id/sync', async (req, res) => {
  const stream = voteService.getStream(req.params.id);
  if (!stream) return res.status(404).json({ error: 'Stream no encontrado' });

  // Try YouTube first if we have a video_id and API key
  if (stream.video_id && config.youtubeApiKey) {
    try {
      const result = await syncYouTubeChat(req.params.id, stream.video_id);
      return res.json(result);
    } catch (err: any) {
      console.error('[Sync] YouTube error:', err.message || err);
      return res.json({
        success: false,
        message: `YouTube sync error: ${err.message || 'Error desconocido'}`,
        newVotes: 0,
        total: voteService.getVoteStats(req.params.id),
      });
    }
  }

  // Fallback: no YouTube configured
  const mockService = mockServices.get(req.params.id);
  if (!mockService) {
    return res.json({
      success: false,
      message: 'No hay fuente de chat activa. Configura YOUTUBE_API_KEY o inicia mock.',
      newVotes: 0,
      total: voteService.getVoteStats(req.params.id),
    });
  }

  res.json({
    success: true,
    message: 'Mock activo',
    newVotes: 0,
    total: voteService.getVoteStats(req.params.id),
  });
});

async function syncYouTubeChat(streamId: string, videoId: string) {
  const liveChatId = await getLiveChatId(videoId);
  if (!liveChatId) {
    return {
      success: false,
      message: 'El stream no tiene chat activo o no es una transmisión en vivo.',
      newVotes: 0,
      total: voteService.getVoteStats(streamId),
    };
  }

  const pageToken = youtubeTokens.get(streamId);
  const { messages, nextPageToken, pollingInterval } = await getChatMessages(liveChatId, pageToken);

  let newVotes = 0;
  let processed = 0;

  for (const msg of messages) {
    // Skip already processed messages
    const existing = voteService.getStream(streamId);
    if (existing) {
      // Log the message
      const isVote = parseVote(msg.message);
      voteService.logChatMessage(
        streamId, msg.messageId, msg.userId, msg.userName, msg.message, !!isVote, isVote
      );

      if (isVote) {
        const result = voteService.registerVote(streamId, msg.userId, msg.userName, isVote);
        if (result.success) {
          newVotes++;
          const io = getIo();
          const results = voteService.getVoteResults(streamId);
          const stats = voteService.getVoteStats(streamId);
          io.to(`stream:${streamId}`).emit('vote-update', { streamId, results });
          io.to(`stream:${streamId}`).emit('stats-update', { streamId, stats });
          io.to(`stream:${streamId}`).emit('chat-message', {
            streamId,
            userName: msg.userName,
            message: msg.message,
            isVote: true,
            carNumber: isVote,
          });
        }
      } else {
        const io = getIo();
        io.to(`stream:${streamId}`).emit('chat-message', {
          streamId,
          userName: msg.userName,
          message: msg.message,
          isVote: false,
          carNumber: null,
        });
      }
      processed++;
    }
  }

  // Store the next page token
  if (nextPageToken) {
    youtubeTokens.set(streamId, nextPageToken);
  } else {
    youtubeTokens.delete(streamId);
  }

  return {
    success: true,
    message: `Procesados ${processed} mensajes, ${newVotes} votos nuevos`,
    newVotes,
    totalMessages: messages.length,
    total: voteService.getVoteStats(streamId),
    pollingInterval,
  };
}

syncRouter.post('/:id/mock/start', (req, res) => {
  const stream = voteService.getStream(req.params.id);
  if (!stream) return res.status(404).json({ error: 'Stream no encontrado' });

  if (mockServices.has(req.params.id)) {
    return res.json({ message: 'Mock ya está corriendo' });
  }

  const { intervalMs, voteProbability } = req.body || {};
  const mock = new MockChatService(req.params.id, intervalMs || 2000, voteProbability || 0.6);

  mock.on('message', (msg) => {
    const isVote = parseVote(msg.message);
    voteService.logChatMessage(
      req.params.id, msg.id, msg.userId, msg.userName, msg.message, !!isVote, isVote
    );

    if (isVote) {
      const result = voteService.registerVote(req.params.id, msg.userId, msg.userName, isVote);
      if (result.success) {
        const io = getIo();
        const results = voteService.getVoteResults(req.params.id);
        const stats = voteService.getVoteStats(req.params.id);
        io.to(`stream:${req.params.id}`).emit('vote-update', { streamId: req.params.id, results });
        io.to(`stream:${req.params.id}`).emit('stats-update', { streamId: req.params.id, stats });
        io.to(`stream:${req.params.id}`).emit('chat-message', {
          streamId: req.params.id,
          userName: msg.userName,
          message: msg.message,
          isVote: true,
          carNumber: isVote,
        });
      }
    } else {
      const io = getIo();
      io.to(`stream:${req.params.id}`).emit('chat-message', {
        streamId: req.params.id,
        userName: msg.userName,
        message: msg.message,
        isVote: false,
        carNumber: null,
      });
    }
  });

  mock.start();
  mockServices.set(req.params.id, mock);

  res.json({ message: 'Mock iniciado', streamId: req.params.id });
});

syncRouter.post('/:id/mock/stop', (req, res) => {
  const mock = mockServices.get(req.params.id);
  if (!mock) return res.json({ message: 'No hay mock corriendo' });

  mock.stop();
  mockServices.delete(req.params.id);
  res.json({ message: 'Mock detenido' });
});
