'use client';

import React from 'react';
import {
  Clock,
  Trash2,
  Eye,
  Search,
  Filter,
  AlertTriangle,
  RefreshCw,
  Mail,
  Calendar,
  Send,
  Zap,
} from 'lucide-react';
import type { ScheduledEmailRecord } from '@/lib/types';

interface ScheduledEmailsTableProps {
  emails: ScheduledEmailRecord[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenCompose: () => void;
  onCancelEmail: (id: string) => void;
  onViewEmail: (email: ScheduledEmailRecord) => void;
}

function formatScheduledTime(isoString: string, currentNowMs: number) {
  const target = new Date(isoString).getTime();
  const diffMs = currentNowMs > 0 ? target - currentNowMs : 0;

  const formattedDate = new Date(isoString).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  if (diffMs <= 0 && currentNowMs > 0) {
    return { text: formattedDate, badge: 'Ready to send', urgent: true };
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  let relative = '';
  if (diffHours > 0) {
    relative = `in ${diffHours}h ${diffMin % 60}m`;
  } else if (diffMin > 0) {
    relative = `in ${diffMin}m ${diffSec % 60}s`;
  } else {
    relative = `in ${Math.max(0, diffSec)}s`;
  }

  return { text: formattedDate, badge: relative, urgent: diffMin < 5 };
}

export function ScheduledEmailsTable({
  emails,
  isLoading,
  onRefresh,
  onOpenCompose,
  onCancelEmail,
  onViewEmail,
}: ScheduledEmailsTableProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);

  const filteredEmails = React.useMemo(() => {
    return emails.filter((item) => {
      const matchesSearch =
        item.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sender_email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [emails, searchQuery, statusFilter]);

  const [nowMs, setNowMs] = React.useState<number>(0);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setNowMs(Date.now());
    }, 0);
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 5000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await onCancelEmail(id);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search recipient, subject, or sender..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 py-2 px-2.5 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="delayed">Delayed (Rate Limited)</option>
              <option value="processing">Processing</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-slate-400">
            {filteredEmails.length} of {emails.length} queued
          </span>
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white transition-colors"
            title="Refresh Table"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
              <th className="py-3 px-4 font-medium">Recipient</th>
              <th className="py-3 px-4 font-medium">Sender Account</th>
              <th className="py-3 px-4 font-medium">Subject</th>
              <th className="py-3 px-4 font-medium">Scheduled Time</th>
              <th className="py-3 px-4 font-medium">Limits & Delays</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {isLoading && emails.length === 0 ? (
              // Loading Skeleton
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3.5 px-4"><div className="h-4 w-36 bg-slate-800 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 w-32 bg-slate-800 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 w-48 bg-slate-800 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 w-28 bg-slate-800 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 w-20 bg-slate-800 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 w-16 bg-slate-800 rounded" /></td>
                  <td className="py-3.5 px-4 text-right"><div className="h-4 w-12 bg-slate-800 rounded ml-auto" /></td>
                </tr>
              ))
            ) : filteredEmails.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={7} className="py-12 px-4 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/80 text-slate-400 mb-3">
                    <Clock className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">No scheduled emails found</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {searchQuery
                      ? 'No scheduled jobs match your current search criteria.'
                      : 'You currently have no cold outreach emails waiting in the BullMQ schedule queue.'}
                  </p>
                  <button
                    onClick={onOpenCompose}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Schedule New Emails</span>
                  </button>
                </td>
              </tr>
            ) : (
              filteredEmails.map((item) => {
                const timeInfo = formatScheduledTime(item.scheduled_at, nowMs);
                return (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                    {/* Recipient */}
                    <td className="py-3 px-4 font-mono font-medium text-white truncate max-w-[180px]">
                      {item.recipient_email}
                    </td>

                    {/* Sender */}
                    <td className="py-3 px-4 text-slate-400 truncate max-w-[150px]">
                      {item.sender_email}
                    </td>

                    {/* Subject */}
                    <td className="py-3 px-4 truncate max-w-[220px]" title={item.subject}>
                      <span className="text-slate-200">{item.subject}</span>
                    </td>

                    {/* Scheduled Time */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-slate-200 font-mono tabular-nums">{timeInfo.text}</span>
                        <span
                          className={`text-[10px] font-medium ${
                            timeInfo.urgent ? 'text-amber-400' : 'text-indigo-400'
                          }`}
                        >
                          {timeInfo.badge}
                        </span>
                      </div>
                    </td>

                    {/* Limits & Delays */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span>{item.delay_seconds}s delay</span>
                        <span>·</span>
                        <span>{item.hourly_limit}/hr</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.status === 'delayed' ? (
                        <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-300" title={item.error_message || 'Rate limit deferred'}>
                          <AlertTriangle className="h-3 w-3" />
                          <span>Delayed (Rate Limit)</span>
                        </div>
                      ) : item.status === 'processing' ? (
                        <div className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[11px] font-medium text-indigo-300 animate-pulse">
                          <Zap className="h-3 w-3" />
                          <span>Processing</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>Scheduled</span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onViewEmail(item)}
                          className="rounded p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="View Email Payload"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleCancel(item.id)}
                          disabled={cancellingId === item.id}
                          className="rounded p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                          title="Cancel Scheduled Job"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
