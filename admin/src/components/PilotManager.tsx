import { useState } from 'react';
import { api } from '@/lib/api';
import type { Pilot } from '@/types';
import { Plus, X, Users } from 'lucide-react';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f43f5e'];

interface Props {
  streamId: string;
  pilots: Pilot[];
  onUpdate: () => void;
}

export function PilotManager({ streamId, pilots, onUpdate }: Props) {
  const [adding, setAdding] = useState(false);
  const [carNumber, setCarNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  const handleAdd = async () => {
    if (!carNumber.trim()) return;
    await api.pilots.add(streamId, { car_number: carNumber, driver_name: driverName || undefined, color });
    setCarNumber('');
    setDriverName('');
    setColor(COLORS[(pilots.length + 1) % COLORS.length]);
    setAdding(false);
    onUpdate();
  };

  const handleRemove = async (carNumber: string) => {
    await api.pilots.remove(streamId, carNumber);
    onUpdate();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Users size={16} />
          Pilotos ({pilots.length})
        </h3>
        <button
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-1 text-beto-red hover:text-red-400 text-sm transition-colors"
        >
          <Plus size={14} />
          Agregar
        </button>
      </div>

      {adding && (
        <div className="flex items-center gap-2 mb-4 bg-secondary border border-border rounded-lg p-3">
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
          />
          <input
            type="text"
            value={carNumber}
            onChange={e => setCarNumber(e.target.value)}
            placeholder="#"
            className="w-16 bg-background border border-border rounded px-2 py-1.5 text-foreground text-center text-sm focus:outline-none focus:border-beto-red"
            autoFocus
          />
          <input
            type="text"
            value={driverName}
            onChange={e => setDriverName(e.target.value)}
            placeholder="Nombre"
            className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-beto-red"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
            <button onClick={handleAdd} className="bg-beto-red hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors">
            OK
          </button>
        </div>
      )}

      <div className="space-y-1">
        {pilots.map(p => (
          <div key={p.car_number} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors group">
            <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
            <span className="font-mono font-semibold text-sm">#{p.car_number}</span>
            <span className="text-sm text-muted-foreground flex-1">{p.driver_name || 'Sin nombre'}</span>
            <button
              onClick={() => handleRemove(p.car_number)}
              className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {pilots.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No hay pilotos registrados</p>
        )}
      </div>
    </div>
  );
}
