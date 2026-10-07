'use client';

import React from 'react';
import {
  Send,
  ExternalLink,
  Eye,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Mail,
  Filter,
} from 'lucide-react';
import type { SentEmailRecord } from '@/lib/types';

interface SentEmailsTableProps {
  emails: SentEmailRecord[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenCompose: () => void;
  onViewEmail: (email: SentEmailRecord) => void;
}

export function SentEmailsTable({
  emails,
  isLoading,
  onRefresh,
  onOpenCompose,
  onViewEmail,
}: SentEmailsTableProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

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
              <option value="all">All Delivery States</option>
              <option value="sent">Delivered (Sent)</option>
              <option value="failed">Failed Delivery</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-slate-400">
            {filteredEmails.length} of {emails.length} delivered
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
              <th className="py-3 px-4 font-medium">Sent Timestamp</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium">Ethereal SMTP Preview</th>
              <th className="py-3 px-4 font-medium text-right">View</th>
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
                  <td className="py-3.5 px-4"><div className="h-4 w-16 bg-slate-800 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 w-32 bg-slate-800 rounded" /></td>
                  <td className="py-3.5 px-4 text-right"><div className="h-4 w-10 bg-slate-800 rounded ml-auto" /></td>
                </tr>
              ))
            ) : filteredEmails.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={7} className="py-12 px-4 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/80 text-slate-400 mb-3">
                    <Send className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">No sent emails yet</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {searchQuery
                      ? 'No sent records match your current search query.'
                      : 'Scheduled emails will appear here once processed and dispatched via Ethereal SMTP.'}
                  </p>
                  <button
                    onClick={onOpenCompose}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Send Test Campaign</span>
                  </button>
                </td>
              </tr>
            ) : (
              filteredEmails.map((item) => {
                const formattedSentTime = new Date(item.sent_at).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

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

                    {/* Sent Time */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-300 font-mono tabular-nums">
                      {formattedSentTime}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.status === 'sent' ? (
                        <div className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Sent</span>
                        </div>
                      ) : (
                        <div
                          className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[11px] font-medium text-rose-300"
                          title={item.error_message || 'Delivery error'}
                        >
                          <XCircle className="h-3 w-3" />
                          <span>Failed</span>
                        </div>
                      )}
                    </td>

                    {/* Ethereal SMTP Link */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.ethereal_preview_url ? (
                        <a
                          href={item.ethereal_preview_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
                        >
                          <span>Open in Ethereal</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-500">Local SMTP mock</span>
                      )}
                    </td>

                    {/* View Action */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => onViewEmail(item)}
                        className="rounded p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="View Delivered Email"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
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
