import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Category, CategoryPilot } from '@/types';
import { ArrowLeft, Plus, Trash2, Upload, X, Users, Folder } from 'lucide-react';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f43f5e'];

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [pilots, setPilots] = useState<CategoryPilot[]>([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [addingPilot, setAddingPilot] = useState(false);
  const [carNumber, setCarNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadPilots(selectedCategory.id);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    const data = await api.categories.list();
    setCategories(data);
  };

  const loadPilots = async (categoryId: number) => {
    const data = await api.categories.pilots.list(categoryId);
    setPilots(data);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    await api.categories.create({ name: newCategoryName, description: newCategoryDesc || undefined });
    setNewCategoryName('');
    setNewCategoryDesc('');
    setShowNewCategory(false);
    loadCategories();
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('¿Eliminar esta categoria y todos sus pilotos?')) return;
    await api.categories.delete(id);
    if (selectedCategory?.id === id) {
      setSelectedCategory(null);
      setPilots([]);
    }
    loadCategories();
  };

  const handleAddPilot = async () => {
    if (!selectedCategory || !carNumber.trim()) return;
    await api.categories.pilots.add(selectedCategory.id, { car_number: carNumber, driver_name: driverName || undefined, color });
    setCarNumber('');
    setDriverName('');
    setColor(COLORS[(pilots.length + 1) % COLORS.length]);
    setAddingPilot(false);
    loadPilots(selectedCategory.id);
  };

  const handleRemovePilot = async (carNumber: string) => {
    if (!selectedCategory) return;
    await api.categories.pilots.remove(selectedCategory.id, carNumber);
    loadPilots(selectedCategory.id);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCategory || !e.target.files?.[0]) return;
    setImporting(true);

    const file = e.target.files[0];
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());

    const pilots: Array<{ car_number: string; driver_name?: string; color?: string }> = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // CSV format: car_number,driver_name or just car_number
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        pilots.push({ car_number: parts[0], driver_name: parts[1], color: COLORS[(i) % COLORS.length] });
      } else if (parts.length === 1) {
        pilots.push({ car_number: parts[0], color: COLORS[(i) % COLORS.length] });
      }
    }

    if (pilots.length > 0) {
      await api.categories.pilots.addBulk(selectedCategory.id, pilots);
      loadPilots(selectedCategory.id);
    }

    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearPilots = async () => {
    if (!selectedCategory) return;
    if (!confirm('¿Eliminar todos los pilotos de esta categoria?')) return;
    await api.categories.pilots.clear(selectedCategory.id);
    setPilots([]);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft size={16} />
          Volver al dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Categorias</h1>
            <p className="text-sm text-muted-foreground mt-1">Gestiona categorias de pilotos para reutilizar en streams</p>
          </div>
          <button
            onClick={() => setShowNewCategory(!showNewCategory)}
            className="flex items-center gap-2 bg-beto-red hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={18} />
            Nueva categoria
          </button>
        </div>

        {showNewCategory && (
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <h3 className="font-semibold mb-4">Nueva categoria</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="Nombre de la categoria"
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-beto-red transition-colors"
                autoFocus
              />
              <input
                type="text"
                value={newCategoryDesc}
                onChange={e => setNewCategoryDesc(e.target.value)}
                placeholder="Descripcion (opcional)"
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-beto-red transition-colors"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateCategory}
                  className="bg-beto-red hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Crear
                </button>
                <button
                  onClick={() => { setShowNewCategory(false); setNewCategoryName(''); setNewCategoryDesc(''); }}
                  className="bg-secondary hover:bg-accent text-foreground font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Folder size={16} />
                Categorias ({categories.length})
              </h3>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay categorias creadas</p>
              ) : (
                <div className="space-y-2">
                  {categories.map(cat => (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedCategory?.id === cat.id ? 'bg-beto-red/20 border border-beto-red/40' : 'bg-secondary hover:bg-accent'
                      }`}
                    >
                      <div>
                        <p className="font-medium">{cat.name}</p>
                        {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedCategory ? (
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Users size={16} />
                      {selectedCategory.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{pilots.length} pilotos</p>
                  </div>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1 text-orange-500 hover:text-orange-400 text-sm cursor-pointer transition-colors">
                      <Upload size={14} />
                      Importar CSV
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleImportFile}
                        className="hidden"
                        disabled={importing}
                      />
                    </label>
                    <button
                      onClick={handleClearPilots}
                      className="flex items-center gap-1 text-red-500 hover:text-red-400 text-sm transition-colors"
                    >
                      <Trash2 size={14} />
                      Limpiar
                    </button>
                    <button
                      onClick={() => setAddingPilot(!addingPilot)}
                      className="flex items-center gap-1 text-beto-red hover:text-red-400 text-sm transition-colors"
                    >
                      <Plus size={14} />
                      Agregar
                    </button>
                  </div>
                </div>

                {addingPilot && (
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
                      onKeyDown={e => e.key === 'Enter' && handleAddPilot()}
                    />
                    <button onClick={handleAddPilot} className="bg-beto-red hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors">
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
                        onClick={() => handleRemovePilot(p.car_number)}
                        className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  {pilots.length === 0 && !addingPilot && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay pilotos. Agrega uno a uno o importa un CSV.
                      <br />
                      <span className="text-xs">Formato CSV: <code className="bg-secondary px-1 rounded">numero,nombre</code></span>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
                <Folder size={48} className="mx-auto mb-4 opacity-50" />
                <p>Selecciona una categoria para ver sus pilotos</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
