/**
 * TrainerProctoringDashboard — full live monitoring grid for one quiz.
 *
 *   <TrainerProctoringDashboard quizId={42} quizTitle="Final Exam" />
 *
 * Theme: white surfaces, slate borders, blue accents.
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, RefreshCw, Search, Users } from 'lucide-react';

import useProctorMonitor from '../hooks/useProctorMonitor';
import ParticipantMonitorCard from './ParticipantMonitorCard';
import { GlassCard, GhostButton } from './ui';

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'PENDING', 'SUBMITTED', 'TERMINATED'];

export default function TrainerProctoringDashboard({ quizId, quizTitle }) {
  const { sessions, refresh, forceTerminate, isLoading } = useProctorMonitor(quizId);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  const filtered = useMemo(() => {
    return sessions.filter(s => {
      if (filter !== 'ALL' && s.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (s.participant?.name || '').toLowerCase();
        const email = (s.participant?.email || '').toLowerCase();
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      return true;
    });
  }, [sessions, search, filter]);

  const stats = useMemo(() => ({
    total: sessions.length,
    active: sessions.filter(s => s.status === 'ACTIVE').length,
    terminated: sessions.filter(s => s.status === 'TERMINATED').length,
    flagged: sessions.filter(s => (s.warningsCount || 0) >= 3).length,
  }), [sessions]);

  const handleTerminate = async (s) => {
    if (!window.confirm(`Force-terminate ${s.participant?.name}'s exam?`)) return;
    await forceTerminate(s.sessionId, 'Trainer terminated');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-sky-50/40 px-4 py-6 text-slate-900 sm:px-6 lg:px-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            Live Proctoring
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {quizTitle || `Quiz #${quizId}`}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <GhostButton onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </GhostButton>
        </div>
      </motion.div>

      {/* Stat row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={<Users className="h-4 w-4" />} label="Total" value={stats.total} accent="blue" />
        <StatTile icon={<Activity className="h-4 w-4" />} label="Active" value={stats.active} accent="emerald" />
        <StatTile icon={<AlertTriangle className="h-4 w-4" />} label="Flagged" value={stats.flagged} accent="amber" />
        <StatTile icon={<AlertTriangle className="h-4 w-4" />} label="Terminated" value={stats.terminated} accent="rose" />
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search participants…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:w-72"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                'rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition ' +
                (filter === f
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50')
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <p className="text-sm text-slate-500">
            {isLoading ? 'Loading sessions…' : 'No sessions match your filters.'}
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(s => (
            <ParticipantMonitorCard
              key={s.sessionId}
              session={s}
              onTerminate={handleTerminate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({ icon, label, value, accent = 'blue' }) {
  const map = {
    blue:    'from-blue-50 to-white ring-blue-200 text-blue-700',
    emerald: 'from-emerald-50 to-white ring-emerald-200 text-emerald-700',
    amber:   'from-amber-50 to-white ring-amber-200 text-amber-700',
    rose:    'from-rose-50 to-white ring-rose-200 text-rose-700',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl bg-gradient-to-br ${map[accent]} ring-1 p-4 shadow-sm`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</span>
        <span className="opacity-80">{icon}</span>
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
    </motion.div>
  );
}
