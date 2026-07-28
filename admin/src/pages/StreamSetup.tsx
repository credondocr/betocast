import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Category } from '@/types';
import { ArrowLeft, Plus, X, Folder } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PilotInput {
  car_number: string;
  driver_name: string;
  color: string;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f43f5e'];

export function StreamSetup() {
  const navigate = useNavigate();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [pilots, setPilots] = useState<PilotInput[]>([]);
  const [maxDisplay, setMaxDisplay] = useState(10);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  useEffect(() => {
    api.categories.list().then(setCategories).catch(console.error);
  }, []);

  const addPilot = () => {
    const num = (pilots.length + 1).toString().padStart(3, '0');
    setPilots([...pilots, { car_number: num, driver_name: '', color: COLORS[pilots.length % COLORS.length] }]);
  };

  const updatePilot = (i: number, field: keyof PilotInput, value: string) => {
    const updated = [...pilots];
    updated[i] = { ...updated[i], [field]: value };
    setPilots(updated);
  };

  const removePilot = (i: number) => {
    setPilots(pilots.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;

    setLoading(true);
    try {
      // Si hay una categoria seleccionada, usar sus pilotos
      if (selectedCategoryId) {
        const stream = await api.streams.create({
          youtube_url: youtubeUrl,
          title: title || undefined,
          category_id: selectedCategoryId,
        });
        await api.streams.update(stream.id, { max_pilots_display: maxDisplay });
        navigate(`/stream/${stream.id}`);
      } else {
        // Crear stream y agregar pilotos manualmente
        const stream = await api.streams.create({ youtube_url: youtubeUrl, title: title || undefined });
        for (const p of pilots) {
          if (p.car_number.trim()) {
            await api.pilots.add(stream.id, { car_number: p.car_number, driver_name: p.driver_name || undefined, color: p.color });
          }
        }
        await api.streams.update(stream.id, { max_pilots_display: maxDisplay });
        navigate(`/stream/${stream.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft size={16} />
          Volver al dashboard
        </Link>

        <h1 className="text-2xl font-bold mb-6">Crear nuevo stream</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">URL del stream de YouTube</label>
            <input
              type="text"
              value={youtubeUrl}
              onChange={e => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-beto-red transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Titulo (opcional)</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Carrera #1 - Nombre del evento"
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-beto-red transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Maximo de pilotos en overlay</label>
            <input
              type="number"
              min={1}
              max={20}
              value={maxDisplay}
              onChange={e => setMaxDisplay(parseInt(e.target.value) || 10)}
              className="w-24 bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-beto-red transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <Folder size={14} className="inline mr-1" />
              Categoria de pilotos (opcional)
            </label>
            {categories.length > 0 ? (
              <select
                value={selectedCategoryId || ''}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedCategoryId(val ? parseInt(val) : null);
                  if (val) setPilots([]);
                }}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-beto-red transition-colors"
              >
                <option value="">Sin categoria - agregar manualmente</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            ) : (
              <div className="bg-secondary border border-border rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">No hay categorias creadas</p>
                <Link to="/categories" className="text-beto-red hover:text-red-400 text-sm font-medium transition-colors">
                  Crear categoria
                </Link>
              </div>
            )}
          </div>

          {!selectedCategoryId && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Pilotos</label>
                <button type="button" onClick={addPilot} className="flex items-center gap-1 text-orange-500 hover:text-orange-400 text-sm transition-colors">
                  <Plus size={14} />
                  Agregar piloto
                </button>
              </div>

              {pilots.length === 0 && (
                <p className="text-sm text-muted-foreground">No hay pilotos agregados. Puedes agregarlos ahora o despues.</p>
              )}

              <div className="space-y-2">
                {pilots.map((pilot, i) => (
                  <div key={i} className="flex items-center gap-2 bg-secondary border border-border rounded-lg p-3">
                    <input
                      type="color"
                      value={pilot.color}
                      onChange={e => updatePilot(i, 'color', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={pilot.car_number}
                      onChange={e => updatePilot(i, 'car_number', e.target.value)}
                      placeholder="#"
                      className="w-16 bg-background border border-border rounded px-2 py-1.5 text-foreground text-center text-sm focus:outline-none focus:border-beto-red"
                    />
                    <input
                      type="text"
                      value={pilot.driver_name}
                      onChange={e => updatePilot(i, 'driver_name', e.target.value)}
                      placeholder="Nombre del piloto"
                      className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-beto-red"
                    />
                    <button type="button" onClick={() => removePilot(i)} className="text-muted-foreground hover:text-red-500 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !youtubeUrl.trim()}
            className="w-full bg-beto-red hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Creando...' : 'Crear stream'}
          </button>
        </form>
      </div>
    </div>
  );
}
