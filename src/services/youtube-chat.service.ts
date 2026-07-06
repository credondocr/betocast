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
  error?: { code: number; message: string };
}

export interface YouTubeChatMessage {
  messageId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
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
    throw new Error(`YouTube API HTTP ${res.status}`);
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
    throw new Error(`YouTube API HTTP ${res.status}`);
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
