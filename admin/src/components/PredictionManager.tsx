import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { PredictionResult, PredictionResolveResponse } from '@/types';
import { Trophy, Users, Target } from 'lucide-react';

interface PredictionManagerProps {
  streamId: string;
}

export function PredictionManager({ streamId }: PredictionManagerProps) {
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [totalPredictions, setTotalPredictions] = useState(0);
  const [totalPredictors, setTotalPredictors] = useState(0);
  const [resolving, setResolving] = useState(false);
  const [resolveResult, setResolveResult] = useState<PredictionResolveResponse | null>(null);

  useEffect(() => {
    loadPredictions();
  }, [streamId]);

  const loadPredictions = async () => {
    try {
      const data = await api.predictions.get(streamId);
      setPredictions(data.results);
      setTotalPredictions(data.stats.totalPredictions);
      setTotalPredictors(data.stats.totalPredictors);
    } catch (err) {
      console.error('Error loading predictions:', err);
    }
  };

  const handleResolve = async (carNumber: string) => {
    if (resolving) return;
    setResolving(true);
    try {
      const result = await api.predictions.resolve(streamId, carNumber);
      setResolveResult(result);
    } catch (err) {
      console.error('Error resolving predictions:', err);
    } finally {
      setResolving(false);
    }
  };

  const resetResolve = () => {
    setResolveResult(null);
  };

  if (resolveResult) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Trophy size={18} className="text-yellow-500" />
            Predicciones resueltas
          </h2>
          <button
            onClick={resetResolve}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Volver
          </button>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{resolveResult.message}</p>
          {resolveResult.winners.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Ganadores:</p>
              <div className="flex flex-wrap gap-2">
                {resolveResult.winners.map((winner) => (
                  <span
                    key={winner.user_id}
                    className="inline-flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm"
                  >
                    <Trophy size={12} />
                    {winner.user_name || winner.user_id}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nadie acertó la predicción.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Target size={18} className="text-purple-500" />
          Predicciones
        </h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users size={14} />
          <span><strong className="text-foreground">{totalPredictors}</strong> participantes</span>
        </div>
      </div>

      {predictions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No hay predicciones aún. Los usuarios pueden predecir con <code className="bg-secondary px-1 rounded">!predict #numero</code>
        </p>
      ) : (
        <div className="space-y-3">
          {predictions.map((pred) => (
            <div key={pred.car_number} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: pred.color }}
                >
                  #{pred.car_number}
                </div>
                <div>
                  <p className="font-medium">{pred.driver_name || `Piloto #${pred.car_number}`}</p>
                  <p className="text-xs text-muted-foreground">
                    {pred.count} {pred.count === 1 ? 'predicción' : 'predicciones'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleResolve(pred.car_number)}
                disabled={resolving}
                className="flex items-center gap-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Trophy size={14} />
                Marcar ganador
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
        <span><strong className="text-foreground">{totalPredictions}</strong> predicciones totales</span>
      </div>
    </div>
  );
}
