import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { VoteResult, VoteStats, ChatMessage } from '@/types';

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
    socket = io(apiUrl, { path: '/socket.io' });
  }
  return socket;
}

export function useSocket(streamId: string | null) {
  const [voteResults, setVoteResults] = useState<VoteResult[]>([]);
  const [stats, setStats] = useState<VoteStats>({ totalVotes: 0, totalVoters: 0 });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = getSocket();

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    return () => {
      s.off('connect');
      s.off('disconnect');
    };
  }, []);

  useEffect(() => {
    if (!streamId) return;

    const s = getSocket();
    s.emit('join-stream', streamId);

    const apiUrl = import.meta.env.VITE_API_URL || '';
    fetch(`${apiUrl}/api/streams/${streamId}/votes`)
      .then(r => r.json())
      .then((data: any) => {
        if (data.results) setVoteResults(data.results);
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {});

    const handleVoteUpdate = (data: { streamId: string; results: VoteResult[] }) => {
      if (data.streamId === streamId) setVoteResults(data.results);
    };

    const handleStatsUpdate = (data: { streamId: string; stats: VoteStats }) => {
      if (data.streamId === streamId) setStats(data.stats);
    };

    const handleChatMessage = (msg: ChatMessage) => {
      if (msg.streamId === streamId) {
        setChatMessages(prev => [...prev.slice(-50), msg]);
      }
    };

    s.on('vote-update', handleVoteUpdate);
    s.on('stats-update', handleStatsUpdate);
    s.on('chat-message', handleChatMessage);

    return () => {
      s.emit('leave-stream', streamId);
      s.off('vote-update', handleVoteUpdate);
      s.off('stats-update', handleStatsUpdate);
      s.off('chat-message', handleChatMessage);
    };
  }, [streamId]);

  const resetChat = useCallback(() => setChatMessages([]), []);

  return { voteResults, stats, chatMessages, connected, resetChat };
}
