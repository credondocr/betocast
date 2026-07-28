import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Stream } from '@/types';
import { Radio, ExternalLink, Plus, Trash2, Folder } from 'lucide-react';

export function Dashboard() {
  const [streams, setStreams] = useState<Stream[]>([]);

  useEffect(() => {
    api.streams.list().then(setStreams).catch(console.error);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este stream?')) return;
    await api.streams.delete(id);
    setStreams(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <img src="/logo.svg" alt="Beto Casting" className="h-14 w-14" />
            <div>
              <h1 className="text-3xl font-black italic tracking-wide text-white">
                BETO<span className="text-beto-red">CAST</span>
              </h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Panel de administración</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/categories"
              className="flex items-center gap-2 bg-secondary hover:bg-accent text-foreground font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Folder size={18} />
              Categorias
            </Link>
            <Link
              to="/stream/new"
              className="flex items-center gap-2 bg-beto-red hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={18} />
              Nuevo Stream
            </Link>
          </div>
        </div>

        {streams.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Radio size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">No hay streams creados</p>
            <p className="text-sm mt-1">Crea tu primer stream para comenzar</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {streams.map(stream => (
              <div key={stream.id} className="bg-card border border-border rounded-xl p-5 hover:border-beto-red/40 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${stream.is_live ? 'bg-green-500 animate-pulse' : stream.status === 'paused' ? 'bg-yellow-500' : 'bg-gray-500'}`} />
                    <span className="text-xs text-muted-foreground uppercase">
                      {stream.is_live ? 'EN VIVO' : stream.status === 'paused' ? 'PAUSADO' : 'OFFLINE'}
                    </span>
                  </div>
                  <button onClick={() => handleDelete(stream.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>

                <h3 className="font-semibold text-lg mb-1">{stream.title || 'Sin título'}</h3>
                <p className="text-sm text-muted-foreground mb-4">ID: {stream.id}</p>

                <div className="flex items-center gap-2">
                  {stream.is_live ? (
                    <>
                      <Link
                        to={`/stream/${stream.id}`}
                        className="flex-1 flex items-center justify-center gap-2 bg-beto-red hover:bg-red-700 text-white font-medium py-2 rounded-lg transition-colors text-sm"
                      >
                        <Radio size={14} />
                        Ver en vivo
                      </Link>
                      <a
                        href={`/overlay/live`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 border border-border hover:border-beto-red/40 text-foreground font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center gap-2 bg-secondary text-muted-foreground font-medium py-2 rounded-lg text-sm">
                      No está en vivo
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
