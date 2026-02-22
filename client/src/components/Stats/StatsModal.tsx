import { useMemo } from 'react';
import { X, Clock, BookOpen, Flame, BarChart2 } from 'lucide-react';
import type { GlobalStats } from '../../types';

interface StatsModalProps {
  onClose: () => void;
  getGlobalStats: () => GlobalStats;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getPagesThisWeek(): number {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('bookreader_stats_') || key === 'bookreader_stats_global') continue;
    try {
      const sessions = JSON.parse(localStorage.getItem(key) ?? '[]');
      for (const s of sessions) {
        if (new Date(s.date) >= oneWeekAgo) {
          total += Math.abs(s.endPage - s.startPage);
        }
      }
    } catch { /* skip */ }
  }
  return total;
}

export function StatsModal({ onClose, getGlobalStats }: StatsModalProps) {
  const global = useMemo(() => getGlobalStats(), [getGlobalStats]);
  const pagesThisWeek = useMemo(() => getPagesThisWeek(), []);

  const stats = [
    {
      icon: <Clock className="w-6 h-6 text-blue-400" aria-hidden="true" />,
      label: 'Total Reading Time',
      value: formatDuration(global.totalMs),
    },
    {
      icon: <BookOpen className="w-6 h-6 text-green-400" aria-hidden="true" />,
      label: 'Pages This Week',
      value: String(pagesThisWeek),
    },
    {
      icon: <Flame className="w-6 h-6 text-orange-400" aria-hidden="true" />,
      label: 'Current Streak',
      value: `${global.streak} day${global.streak !== 1 ? 's' : ''}`,
    },
    {
      icon: <BarChart2 className="w-6 h-6 text-purple-400" aria-hidden="true" />,
      label: 'Total Pages Read',
      value: String(global.totalPages),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Reading statistics"
    >
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-purple-400" aria-hidden="true" />
            Reading Stats
          </h2>
          <button
            onClick={onClose}
            aria-label="Close stats"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-slate-700/50 rounded-xl p-4">
              <div className="mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold text-slate-100">{stat.value}</div>
              <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {global.totalSessions === 0 && (
          <p className="text-center text-slate-400 text-sm pb-5 px-5">
            No reading sessions recorded yet. Start reading to see your stats!
          </p>
        )}
      </div>
    </div>
  );
}
