import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { VoteBarChart } from '@/components/VoteBarChart';
import { ChatPreview } from '@/components/ChatPreview';
import { PilotManager } from '@/components/PilotManager';
import type { Stream, Pilot } from '@/types';
import { ArrowLeft, Copy, Play, Square, RefreshCw, Settings, ExternalLink, Check, AlertCircle } from 'lucide-react';

export function StreamLive() {
  const { id } = useParams<{ id: string }>();
  const [stream, setStream] = useState<Stream | null>(null);
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [copied, setCopied] = useState(false);
  const [mockRunning, setMockRunning] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [chromaKey, setChromaKey] = useState(true);
  const [autoSync, setAutoSync] = useState(false);
  const autoSyncRef = useRef(autoSync);
  autoSyncRef.current = autoSync;
  const { voteResults, stats, chatMessages, connected } = useSocket(id || null);

  useEffect(() => {
    if (!id) return;
    api.streams.get(id).then(setStream).catch(console.error);
    api.pilots.list(id).then(setPilots).catch(console.error);
  }, [id]);

  useEffect(() => {
    if (!syncMessage) return;
    const t = setTimeout(() => setSyncMessage(null), 4000);
    return () => clearTimeout(t);
  }, [syncMessage]);

  useEffect(() => {
    if (!autoSync || !id) return;

    const doSync = async () => {
      try {
        const result = await api.sync.pull(id);
        if (result.success) {
          setSyncMessage({ type: 'ok', text: result.message || 'Sync OK' });
        }
      } catch {}
    };

    doSync();
    const interval = setInterval(doSync, 5000);
    return () => clearInterval(interval);
  }, [autoSync, id]);

  const overlayUrl = `${window.location.origin}/overlay/${id}${chromaKey ? '?chromaKey=true' : ''}`;

  const copyOverlayUrl = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openOverlay = () => {
    window.open(overlayUrl, 'betocast-overlay', 'width=600,height=500,menubar=no,toolbar=no,location=no,status=no');
  };

  const toggleMock = async () => {
    if (!id) return;
    if (mockRunning) {
      await api.mock.stop(id);
      setMockRunning(false);
    } else {
      await api.mock.start(id, { intervalMs: 1500, voteProbability: 0.65 });
      setMockRunning(true);
    }
  };

  const handleSync = async () => {
    if (!id || syncing) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await api.sync.pull(id);
      if (result.success) {
        setSyncMessage({ type: 'ok', text: result.message || 'Sync completado' });
      } else {
        setSyncMessage({ type: 'error', text: result.message || 'Error en sync' });
      }
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err.message || 'Error de conexión' });
    } finally {
      setSyncing(false);
    }
  };

  const updateMaxDisplay = async (val: number) => {
    if (!id || !stream) return;
    await api.streams.update(id, { max_pilots_display: val });
    setStream({ ...stream, max_pilots_display: val });
  };

  if (!stream) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors text-sm">
          <ArrowLeft size={14} />
          Dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Beto Casting" className="h-10 w-10" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{stream.title || 'Stream'}</h1>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-muted-foreground">{connected ? 'Conectado' : 'Desconectado'}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">ID: {stream.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing || autoSync}
              className="flex items-center gap-1.5 bg-secondary hover:bg-accent disabled:opacity-50 text-foreground px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              Sync
            </button>
            <button
              onClick={() => setAutoSync(!autoSync)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                autoSync ? 'bg-beto-blue text-white ring-1 ring-beto-red/50' : 'bg-secondary hover:bg-accent text-foreground'
              }`}
            >
              <RefreshCw size={14} className={autoSync ? 'animate-spin' : ''} />
              {autoSync ? 'Auto Sync ON' : 'Auto Sync'}
            </button>
            <button
              onClick={toggleMock}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mockRunning ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              }`}
            >
              {mockRunning ? <Square size={14} /> : <Play size={14} />}
              {mockRunning ? 'Detener Mock' : 'Iniciar Mock'}
            </button>
            <button
              onClick={openOverlay}
              className="flex items-center gap-1.5 bg-secondary hover:bg-accent text-foreground px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              <ExternalLink size={14} />
              Abrir Overlay
            </button>
            <label className="flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-lg text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={chromaKey}
                onChange={e => setChromaKey(e.target.checked)}
                className="rounded border-border accent-beto-red"
              />
              <span className="text-muted-foreground">Croma Key</span>
            </label>
            <button
              onClick={copyOverlayUrl}
              className="flex items-center gap-1.5 bg-beto-red hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Copy size={14} />
              {copied ? '¡Copiado!' : 'Overlay URL'}
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Resultados de votación</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Settings size={14} />
                  <span>Mostrar top</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={stream.max_pilots_display}
                    onChange={e => updateMaxDisplay(parseInt(e.target.value) || 10)}
                    className="w-14 bg-secondary border border-border rounded px-2 py-0.5 text-foreground text-center text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <VoteBarChart results={voteResults} maxDisplay={stream.max_pilots_display} />
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
                <span><strong className="text-foreground">{stats.totalVotes}</strong> votos</span>
                <span><strong className="text-foreground">{stats.totalVoters}</strong> participantes</span>
              </div>
            </div>

            <PilotManager streamId={stream.id} pilots={pilots} onUpdate={() => api.pilots.list(stream.id).then(setPilots)} />
          </div>

          <div>
            <ChatPreview messages={chatMessages} />
          </div>
        </div>

        {syncMessage && (
          <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg text-sm shadow-lg backdrop-blur-sm ${
            syncMessage.type === 'ok'
              ? 'bg-green-500/90 text-white'
              : 'bg-red-500/90 text-white'
          }`}>
            {syncMessage.type === 'ok' ? <Check size={14} /> : <AlertCircle size={14} />}
            {syncMessage.text}
          </div>
        )}
      </div>
    </div>
  );
}
