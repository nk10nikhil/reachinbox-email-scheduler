'use client';

import React from 'react';
import { X, Radio, Send, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import type { SlackConfig } from '@/lib/types';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SlackConfig | null;
  onSaved: () => void;
}

export function SlackModal({ isOpen, onClose, config, onSaved }: SlackModalProps) {
  const [webhookUrl, setWebhookUrl] = React.useState(config?.webhookUrl || '');
  const [channel, setChannel] = React.useState(config?.channel || '#email-alerts');
  const [isTesting, setIsTesting] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ success: boolean; message: string } | null>(
    null
  );

  React.useEffect(() => {
    if (isOpen && config) {
      const timer = setTimeout(() => {
        setWebhookUrl(config.webhookUrl || '');
        setChannel(config.channel || '#email-alerts');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleTestNotification = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || data.error || 'Test message sent',
      });
      if (data.success) {
        onSaved();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ success: false, message: msg });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/slack/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          channel,
          isConnected: Boolean(webhookUrl),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: 'Slack configuration saved successfully!',
        });
        onSaved();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ success: false, message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/slack/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: '',
          isConnected: false,
        }),
      });
      setWebhookUrl('');
      setTestResult({
        success: true,
        message: 'Slack disconnected. Rate limit events will not notify until reconnected.',
      });
      onSaved();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Slack Alert Integration</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-white font-medium">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
              <span>Real-Time Rate Limit Alert Dispatch</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              When any cold email sender reaches their configured hourly cap, ReachInbox immediately
              dispatches a formatted incident alert to this Slack channel with rescheduled job details.
            </p>
          </div>

          {testResult && (
            <div
              className={`rounded-lg p-3 text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border border-rose-500/30 bg-rose-500/10 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">
                Slack Incoming Webhook URL
              </label>
              <a
                href="https://api.slack.com/messaging/webhooks"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Slack Webhook Guide</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <input
              type="url"
              placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Example format: https://hooks.slack.com/services/...
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Channel Name
            </label>
            <input
              type="text"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {config?.lastNotifiedAt && (
            <div className="text-[11px] text-slate-500">
              Last alert delivered:{' '}
              <span className="text-slate-400 font-mono">
                {new Date(config.lastNotifiedAt).toLocaleString()}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            {config?.isConnected ? (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isSaving}
                className="text-xs text-rose-400 hover:text-rose-300 hover:underline"
              >
                Disconnect Slack
              </button>
            ) : (
              <span className="text-xs text-slate-500">Not connected</span>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestNotification}
                disabled={isTesting || !webhookUrl}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="h-3 w-3" />
                <span>{isTesting ? 'Sending...' : 'Send Live Test Alert'}</span>
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
