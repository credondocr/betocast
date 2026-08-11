import { Router } from 'express';
import { config } from '../config.js';
import * as voteService from '../services/vote.service.js';
import * as predictionService from '../services/prediction.service.js';
import { parseVote, parsePrediction } from '../services/chat-parser.js';
import { MockChatService } from '../services/mock-chat.service.js';
import { getLiveChatId, getChatMessages } from '../services/youtube-chat.service.js';
import { getIo } from '../websocket/index.js';
import { logger } from '../logger.js';

export const syncRouter = Router();

const mockServices = new Map<string, MockChatService>();

const youtubeTokens = new Map<string, string | undefined>();

const liveChatIdCache = new Map<string, { id: string; expiresAt: number }>();
const LIVE_CHAT_ID_TTL_MS = 60_000;
const MAX_CACHE_SIZE = 100;

function getCachedLiveChatId(videoId: string): string | null | undefined {
  const cached = liveChatIdCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) return cached.id;
  return undefined;
}

async function getLiveChatIdCached(videoId: string): Promise<string | null> {
  const cached = getCachedLiveChatId(videoId);
  if (cached !== undefined) return cached;

  const id = await getLiveChatId(videoId);
  
  // Limpiar caché si crece demasiado
  if (liveChatIdCache.size >= MAX_CACHE_SIZE) {
    const now = Date.now();
    for (const [key, value] of liveChatIdCache.entries()) {
      if (value.expiresAt < now) {
        liveChatIdCache.delete(key);
      }
    }
  }
  
  liveChatIdCache.set(videoId, {
    id: id ?? '',
    expiresAt: Date.now() + LIVE_CHAT_ID_TTL_MS,
  });
  return id;
}

export function cleanupStreamState(streamId: string): void {
  youtubeTokens.delete(streamId);

  const mock = mockServices.get(streamId);
  if (mock) {
    mock.stop();
    mock.removeAllListeners();
    mockServices.delete(streamId);
  }
  
  logger.info('Stream state cleaned up', { streamId });
}

syncRouter.get('/:id/sync', async (req, res) => {
  const stream = voteService.getStream(req.params.id);
  if (!stream) return res.status(404).json({ error: 'Stream no encontrado' });

  // Try YouTube first if we have a video_id and API key
  if (stream.video_id && config.youtubeApiKey) {
    try {
      const result = await syncYouTubeChat(req.params.id, stream.video_id);
      return res.json(result);
    } catch (err: any) {
      logger.error('YouTube sync error', { streamId: req.params.id, error: err.message });
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
  logger.debug('Iniciando sync YouTube', { streamId, videoId });

  const liveChatId = await getLiveChatIdCached(videoId);
  if (!liveChatId) {
    logger.info('Stream sin chat activo', { streamId, videoId });
    return {
      success: false,
      message: 'El stream no tiene chat activo o no es una transmisión en vivo.',
      newVotes: 0,
      total: voteService.getVoteStats(streamId),
    };
  }

  const pageToken = youtubeTokens.get(streamId);
  const { messages, nextPageToken, pollingInterval } = await getChatMessages(liveChatId, pageToken);

  logger.debug('Mensajes obtenidos', { streamId, count: messages.length, hasToken: !!nextPageToken });

  // Validar stream una sola vez fuera del loop
  const stream = voteService.getStream(streamId);
  if (!stream) {
    return {
      success: false,
      message: 'Stream no encontrado',
      newVotes: 0,
      total: { totalVotes: 0, totalVoters: 0 },
    };
  }

  let newVotes = 0;
  let newPredictions = 0;
  let processed = 0;

  for (const msg of messages) {
    const isVote = parseVote(msg.message);
    const isPrediction = parsePrediction(msg.message);
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
    }

    if (isPrediction) {
      const result = predictionService.registerPrediction(streamId, msg.userId, msg.userName, isPrediction);
      if (result.success) {
        newPredictions++;
        const io = getIo();
        const predResults = predictionService.getPredictionResults(streamId);
        const predStats = predictionService.getPredictionStats(streamId);
        io.to(`stream:${streamId}`).emit('prediction-update', { streamId, results: predResults });
        io.to(`stream:${streamId}`).emit('prediction-stats-update', { streamId, stats: predStats });
      }
    }

    if (!isVote) {
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

  // Store the next page token
  if (nextPageToken) {
    youtubeTokens.set(streamId, nextPageToken);
  } else {
    youtubeTokens.delete(streamId);
  }

  if (processed > 0 || newVotes > 0) {
    logger.info('Sync completado', { streamId, processed, newVotes, newPredictions, totalMessages: messages.length });
  }

  return {
    success: true,
    message: `Procesados ${processed} mensajes, ${newVotes} votos nuevos, ${newPredictions} predicciones nuevas`,
    newVotes,
    newPredictions,
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
    const isPrediction = parsePrediction(msg.message);
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
    }

    if (isPrediction) {
      const result = predictionService.registerPrediction(req.params.id, msg.userId, msg.userName, isPrediction);
      if (result.success) {
        const io = getIo();
        const predResults = predictionService.getPredictionResults(req.params.id);
        const predStats = predictionService.getPredictionStats(req.params.id);
        io.to(`stream:${req.params.id}`).emit('prediction-update', { streamId: req.params.id, results: predResults });
        io.to(`stream:${req.params.id}`).emit('prediction-stats-update', { streamId: req.params.id, stats: predStats });
      }
    }

    if (!isVote) {
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

  logger.info('Mock chat iniciado', { streamId: req.params.id, intervalMs, voteProbability });

  res.json({ message: 'Mock iniciado', streamId: req.params.id });
});

syncRouter.post('/:id/mock/stop', (req, res) => {
  const mock = mockServices.get(req.params.id);
  if (!mock) return res.json({ message: 'No hay mock corriendo' });

  mock.stop();
  mockServices.delete(req.params.id);

  logger.info('Mock chat detenido', { streamId: req.params.id });

  res.json({ message: 'Mock detenido' });
});
