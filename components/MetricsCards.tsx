'use client';

import React from 'react';
import { Clock, CheckCircle2, ShieldAlert, Cpu, Server, ExternalLink } from 'lucide-react';
import type { QueueStats } from '@/lib/types';

interface MetricsCardsProps {
  queueStats: QueueStats | null;
  scheduledCount: number;
  sentCount: number;
  rescheduledCount: number;
  etherealUser?: string;
  onViewQueue: () => void;
}

export function MetricsCards({
  queueStats,
  scheduledCount,
  sentCount,
  rescheduledCount,
  etherealUser,
  onViewQueue,
}: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Scheduled Jobs */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Scheduled in BullMQ</span>
          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
            {scheduledCount}
          </span>
          <span className="text-xs text-slate-400">pending delivery</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
          <span>Delayed Redis jobs ({queueStats?.delayed || 0})</span>
        </div>
      </div>

      {/* 2. Sent Emails */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Delivered via Ethereal</span>
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
            {sentCount}
          </span>
          <span className="text-xs text-emerald-400">verified SMTP</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
          <span className="truncate max-w-[170px]" title={etherealUser || 'Ethereal Test SMTP'}>
            {etherealUser ? `SMTP: ${etherealUser}` : 'Fake SMTP Ready'}
          </span>
          <a
            href="https://ethereal.email/messages"
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 hover:text-indigo-400 transition-colors"
            title="Ethereal Inbox"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* 3. Rate Limit / Rescheduled Protection */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Rate Limit Protection</span>
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <ShieldAlert className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
            {rescheduledCount}
          </span>
          <span className="text-xs text-slate-400">delayed to next window</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span>Zero-drop quota preservation</span>
        </div>
      </div>

      {/* 4. BullMQ Worker Engine */}
      <div
        onClick={onViewQueue}
        className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 relative overflow-hidden group hover:border-slate-700 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">BullMQ Worker Concurrency</span>
          <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Cpu className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
            {queueStats?.concurrency || 5}x
          </span>
          <span className="text-xs text-purple-300">parallel threads</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1">
            <Server className="h-3 w-3 text-emerald-400" />
            <span>Redis 7.0 (Active)</span>
          </div>
          <span className="text-indigo-400 hover:underline">Inspect →</span>
        </div>
      </div>
    </div>
  );
}
