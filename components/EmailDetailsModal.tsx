'use client';

import React from 'react';
import { X, ExternalLink, Mail, Calendar, CheckCircle2, AlertTriangle, User } from 'lucide-react';
import type { ScheduledEmailRecord, SentEmailRecord } from '@/lib/types';

interface EmailDetailsModalProps {
  email: ScheduledEmailRecord | SentEmailRecord | null;
  onClose: () => void;
}

export function EmailDetailsModal({ email, onClose }: EmailDetailsModalProps) {
  if (!email) return null;

  const isSent = 'sent_at' in email;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Email Payload Inspector</h3>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                email.status === 'sent'
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  : email.status === 'delayed'
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                  : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
              }`}
            >
              {email.status.toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Details Content */}
        <div className="p-6 space-y-4 text-xs">
          {/* Metadata Grid */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400 font-medium">To (Recipient):</span>
              <span className="col-span-2 text-white font-mono select-all">
                {email.recipient_email}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400 font-medium">From (Sender):</span>
              <span className="col-span-2 text-slate-300 font-mono select-all">
                {email.sender_email}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400 font-medium">Scheduled Time:</span>
              <span className="col-span-2 text-slate-300 font-mono tabular-nums">
                {new Date(email.scheduled_at).toLocaleString()}
              </span>
            </div>
            {isSent && (
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-400 font-medium">Delivered At:</span>
                <span className="col-span-2 text-emerald-300 font-mono tabular-nums">
                  {new Date((email as SentEmailRecord).sent_at).toLocaleString()}
                </span>
              </div>
            )}
            {email.error_message && (
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/60">
                <span className="text-amber-400 font-medium">Schedule Note:</span>
                <span className="col-span-2 text-amber-300 leading-relaxed">
                  {email.error_message}
                </span>
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
              Subject
            </label>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-100 font-medium">
              {email.subject}
            </div>
          </div>

          {/* Body */}
          <div>
            <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
              Body Message
            </label>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-mono text-[11px]">
              {email.body}
            </div>
          </div>

          {/* Ethereal Link if sent */}
          {isSent && (email as SentEmailRecord).ethereal_preview_url && (
            <div className="pt-2">
              <a
                href={(email as SentEmailRecord).ethereal_preview_url}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
              >
                <span>Open in Official Ethereal Email Inbox</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
