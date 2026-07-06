import type { VoteResult } from '@/types';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface Props {
  results: VoteResult[];
  maxDisplay: number;
}

export function VoteBarChart({ results, maxDisplay }: Props) {
  const top = results.slice(0, maxDisplay);
  const maxCount = Math.max(...top.map(r => r.count), 1);

  if (top.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No hay votos aún</p>
        <p className="text-sm mt-1">Los votos aparecerán aquí en tiempo real</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {top.map((item, i) => {
        const pct = (item.count / maxCount) * 100;
        const color = item.color || `hsl(${i * 30}, 70%, 55%)`;
        return (
          <div key={item.car_number} className="flex items-center gap-3 group">
            <div className="w-16 text-right">
              <span className="font-mono font-bold text-sm" style={{ color }}>#{item.car_number}</span>
            </div>
            <div className="flex-1 h-8 bg-secondary rounded-lg overflow-hidden relative">
              <div
                className="h-full rounded-lg transition-all duration-500 ease-out flex items-center justify-end pr-3"
                style={{ width: `${Math.max(pct, 5)}%`, background: color }}
              >
                {pct > 15 && <span className="text-xs font-semibold text-white drop-shadow">{item.count}</span>}
              </div>
            </div>
            <div className="w-16 text-left">
              <span className="text-sm text-muted-foreground">{item.count} votos</span>
            </div>
            {item.driver_name && (
              <div className="hidden group-hover:block text-xs text-muted-foreground w-24 truncate">
                {item.driver_name}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
