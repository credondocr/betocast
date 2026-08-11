import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { VoteResult, VoteStats, ChatMessage, PredictionResult, PredictionStats } from '@/types';

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, { path: '/socket.io' });
  }
  return socket;
}

export function useSocket(streamId: string | null) {
  const [voteResults, setVoteResults] = useState<VoteResult[]>([]);
  const [stats, setStats] = useState<VoteStats>({ totalVotes: 0, totalVoters: 0 });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [predictionResults, setPredictionResults] = useState<PredictionResult[]>([]);
  const [predictionStats, setPredictionStats] = useState<PredictionStats>({ totalPredictions: 0, totalPredictors: 0 });
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

    fetch(`/api/streams/${streamId}/votes`)
      .then(r => r.json())
      .then((data: any) => {
        if (data.results) setVoteResults(data.results);
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {});

    fetch(`/api/streams/${streamId}/predictions`)
      .then(r => r.json())
      .then((data: any) => {
        if (data.results) setPredictionResults(data.results);
        if (data.stats) setPredictionStats(data.stats);
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

    const handlePredictionUpdate = (data: { streamId: string; results: PredictionResult[] }) => {
      if (data.streamId === streamId) setPredictionResults(data.results);
    };

    const handlePredictionStatsUpdate = (data: { streamId: string; stats: PredictionStats }) => {
      if (data.streamId === streamId) setPredictionStats(data.stats);
    };

    s.on('vote-update', handleVoteUpdate);
    s.on('stats-update', handleStatsUpdate);
    s.on('chat-message', handleChatMessage);
    s.on('prediction-update', handlePredictionUpdate);
    s.on('prediction-stats-update', handlePredictionStatsUpdate);

    return () => {
      s.emit('leave-stream', streamId);
      s.off('vote-update', handleVoteUpdate);
      s.off('stats-update', handleStatsUpdate);
      s.off('chat-message', handleChatMessage);
      s.off('prediction-update', handlePredictionUpdate);
      s.off('prediction-stats-update', handlePredictionStatsUpdate);
    };
  }, [streamId]);

  const resetChat = useCallback(() => setChatMessages([]), []);

  return { voteResults, stats, chatMessages, predictionResults, predictionStats, connected, resetChat };
}
