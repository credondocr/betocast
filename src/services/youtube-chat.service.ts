import { config } from '../config.js';

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';

interface LiveChatMessage {
  id: string;
  snippet: {
    displayMessage: string;
    publishedAt: string;
    authorChannelId: string;
  };
  authorDetails: {
    displayName: string;
    channelId: string;
  };
}

interface ChatMessagesResponse {
  items: LiveChatMessage[];
  nextPageToken?: string;
  pollingIntervalMillis?: number;
  error?: { code: number; message: string; errors: any[] };
}

export interface YouTubeChatMessage {
  messageId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}

async function handleYouTubeError(res: Response, context: string): Promise<never> {
  const body = await res.json().catch(() => null) as any;
  const msg = body?.error?.message || res.statusText;
  const code = body?.error?.code || res.status;

  if (res.status === 403) {
    if (msg.toLowerCase().includes('quota')) {
      throw new Error(`YouTube API: Cuota agotada (403). Intenta de mañana o usa una API key diferente.`);
    }
    throw new Error(`YouTube API: Acceso denegado (403) - ${msg}`);
  }

  if (res.status === 404) {
    throw new Error(`YouTube API: ${context} no encontrado (404)`);
  }

  throw new Error(`YouTube API: ${msg} (${res.status})`);
}

export async function getLiveChatId(videoId: string): Promise<string | null> {
  if (!config.youtubeApiKey) {
    throw new Error('YOUTUBE_API_KEY no configurada en .env');
  }

  if (!videoId || typeof videoId !== 'string') {
    throw new Error('videoId inválido');
  }

  const url = `${YOUTUBE_API}/videos?part=liveStreamingDetails&id=${videoId}&key=${config.youtubeApiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    await handleYouTubeError(res, 'Video');
  }

  const data = await res.json() as any;

  if (data.error) {
    throw new Error(`YouTube API: ${data.error.message}`);
  }

  const video = data.items?.[0];
  if (!video) {
    throw new Error('Video no encontrado o no es una transmisión en vivo');
  }

  return video?.liveStreamingDetails?.activeLiveChatId || null;
}

export async function getChatMessages(
  liveChatId: string,
  pageToken?: string
): Promise<{ messages: YouTubeChatMessage[]; nextPageToken?: string; pollingInterval?: number }> {
  if (!config.youtubeApiKey) {
    throw new Error('YOUTUBE_API_KEY no configurada en .env');
  }

  if (!liveChatId || typeof liveChatId !== 'string') {
    throw new Error('liveChatId inválido');
  }

  let url = `${YOUTUBE_API}/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&key=${config.youtubeApiKey}&maxResults=200`;
  if (pageToken) {
    url += `&pageToken=${pageToken}`;
  }

  const res = await fetch(url);

  if (!res.ok) {
    await handleYouTubeError(res, 'Chat messages');
  }

  const data = await res.json() as ChatMessagesResponse;

  if (data.error) {
    throw new Error(`YouTube API: ${data.error.message}`);
  }

  const messages: YouTubeChatMessage[] = (data.items || []).map(item => ({
    messageId: item.id,
    userId: item.authorDetails?.channelId || 'unknown',
    userName: item.authorDetails?.displayName || 'Anónimo',
    message: item.snippet?.displayMessage || '',
    timestamp: item.snippet?.publishedAt || new Date().toISOString(),
  }));

  return {
    messages,
    nextPageToken: data.nextPageToken,
    pollingInterval: data.pollingIntervalMillis,
  };
}
