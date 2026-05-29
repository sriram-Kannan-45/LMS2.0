/**
 * ParticipantMonitorCard — single tile in the trainer dashboard grid.
 *
 * Theme: white surface, slate borders, blue accents.
 */
import { motion } from 'framer-motion';
import { Clock, Download, Power } from 'lucide-react';

import { proctorApi } from '../api';
import { GlassCard, StatusDot } from './ui';

function timeAgo(d) {
  if (!d) return '—';
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 5_000) return 'just now';
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
}

function statusColor(status) {
  switch (status) {
    case 'ACTIVE':     return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'PENDING':    return 'bg-blue-50 text-blue-700 ring-blue-200';
    case 'SUBMITTED':  return 'bg-sky-50 text-sky-700 ring-sky-200';
    case 'TERMINATED': return 'bg-rose-50 text-rose-700 ring-rose-200';
    case 'EXPIRED':    return 'bg-amber-50 text-amber-700 ring-amber-200';
    default:           return 'bg-slate-50 text-slate-600 ring-slate-200';
  }
}

export default function ParticipantMonitorCard({ session, onTerminate }) {
  const p = session.participant || {};
  const warningPct = Math.min(100, ((session.warningsCount || 0) / 5) * 100);
  const exitsPct = Math.min(100, ((session.fullscreenExits || 0) / 3) * 100);
  const liveDanger = session.warningsCount >= 4 || session.fullscreenExits >= 2;

  return (
    <GlassCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-sky-400 text-sm font-bold text-white shadow-sm">
              {p.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{p.name || 'Unknown'}</p>
              <p className="truncate text-[11px] text-slate-500">{p.email}</p>
            </div>
          </div>
        </div>
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${statusColor(session.status)}`}>
          {session.status}
        </span>
      </div>

      {/* status pills */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px]">
        <StatusDot ok={session.isOnline} label={session.isOnline ? 'Online' : 'Offline'} />
        <StatusDot ok={session.isFullscreen} label="FS" />
        <StatusDot ok={session.isScreenSharing} label="Share" />
      </div>

      {/* meters */}
      <div className="mt-3 space-y-2">
        <Meter label="Warnings" value={session.warningsCount || 0} max={5} pct={warningPct} />
        <Meter label="FS exits" value={session.fullscreenExits || 0} max={3} pct={exitsPct} danger />
      </div>

      {/* footer */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeAgo(session.lastHeartbeatAt || session.startedAt)}
        </span>
        <div className="flex gap-1.5">
          <a
            href={proctorApi.exportLogsUrl(session.sessionId)}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 transition hover:bg-slate-50 hover:border-slate-300"
            title="Export session logs"
          >
            <Download className="h-3 w-3" /> Logs
          </a>
          {(session.status === 'ACTIVE' || session.status === 'PENDING') && (
            <button
              onClick={() => onTerminate?.(session)}
              className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700 transition hover:bg-rose-100"
              title="Force terminate"
            >
              <Power className="h-3 w-3" /> End
            </button>
          )}
        </div>
      </div>

      {/* danger flash */}
      {liveDanger && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.0, 0.5, 0.0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-rose-300"
        />
      )}
    </GlassCard>
  );
}

function Meter({ label, value, max, pct, danger }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500">
        <span className="uppercase tracking-wider">{label}</span>
        <span className="font-mono">{value}/{max}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
          className={
            'h-full rounded-full ' +
            (danger
              ? 'bg-gradient-to-r from-amber-400 to-rose-500'
              : 'bg-gradient-to-r from-blue-500 to-sky-400')
          }
        />
      </div>
    </div>
  );
}
