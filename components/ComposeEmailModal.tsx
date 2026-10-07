'use client';

import React from 'react';
import {
  X,
  Upload,
  Calendar,
  Clock,
  Zap,
  Shield,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users,
} from 'lucide-react';

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduledSuccess: () => void;
}

const DEFAULT_SENDERS = [
  'outreach@reachinbox.ai',
  'growth@reachinbox.ai',
  'mitrajit@reachinbox.ai',
  'sales@reachinbox.ai',
];

export function ComposeEmailModal({
  isOpen,
  onClose,
  onScheduledSuccess,
}: ComposeEmailModalProps) {
  const [senderEmail, setSenderEmail] = React.useState(DEFAULT_SENDERS[0]);
  const [customSender, setCustomSender] = React.useState('');
  const [subject, setSubject] = React.useState('Accelerating outbound pipeline with ReachInbox AI');
  const [body, setBody] = React.useState(
    `Hi {{first_name}},\n\nI noticed your team is scaling lead generation. ReachInbox automates cold outreach scheduling with persistent BullMQ job queues, provider throttling, and real-time deliverability tracking.\n\nWould you have 10 minutes this week for a brief walkthrough?\n\nBest regards,\nNikhil\nReachInbox Team`
  );

  const [leadInputMethod, setLeadInputMethod] = React.useState<'paste' | 'file'>('paste');
  const [rawLeadsText, setRawLeadsText] = React.useState(
    'alex.chen@stripe.com, sarah.miller@datadoghq.com, david.kumar@snowflake.com'
  );
  const [fileName, setFileName] = React.useState<string | null>(null);

  // Scheduling timing controls
  const [startTimeType, setStartTimeType] = React.useState<'now' | '2min' | '5min' | 'custom'>('now');
  const [customStartTime, setCustomStartTime] = React.useState('');
  const [delaySeconds, setDelaySeconds] = React.useState(2);
  const [hourlyLimit, setHourlyLimit] = React.useState(200);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Extracted emails
  const detectedEmails = React.useMemo(() => {
    const text = rawLeadsText;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex) || [];
    // Deduplicate and normalize
    return Array.from(new Set(matches.map((e) => e.toLowerCase().trim())));
  }, [rawLeadsText]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawLeadsText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleQuickPreset = (preset: 'standard' | 'rate_limit_demo') => {
    if (preset === 'standard') {
      setSenderEmail('outreach@reachinbox.ai');
      setRawLeadsText(
        'alex.chen@stripe.com\nsarah.miller@datadoghq.com\ndavid.kumar@snowflake.com'
      );
      setDelaySeconds(2);
      setHourlyLimit(200);
      setStartTimeType('now');
    } else if (preset === 'rate_limit_demo') {
      // 6 leads with a cap of 3/hour on purpose: first 3 send, next 3 get delayed to next hour and fire Slack notification!
      setSenderEmail('outreach@reachinbox.ai');
      setRawLeadsText(
        'lead1.acme@example.com\nlead2.orbit@example.com\nlead3.vanguard@example.com\nlead4.hyper@example.com\nlead5.apex@example.com\nlead6.nexus@example.com'
      );
      setDelaySeconds(1);
      setHourlyLimit(3); // Cap at 3 per hour!
      setStartTimeType('now');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (detectedEmails.length === 0) {
      setErrorMsg('Please provide at least one valid recipient email address.');
      return;
    }

    const effectiveSender = senderEmail === 'custom' ? customSender : senderEmail;
    if (!effectiveSender || !effectiveSender.includes('@')) {
      setErrorMsg('Please specify a valid sender email address.');
      return;
    }

    let calculatedStartTime = new Date().toISOString();
    if (startTimeType === '2min') {
      calculatedStartTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    } else if (startTimeType === '5min') {
      calculatedStartTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    } else if (startTimeType === 'custom' && customStartTime) {
      calculatedStartTime = new Date(customStartTime).toISOString();
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/emails/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail: effectiveSender,
          subject,
          body,
          recipients: detectedEmails,
          startTime: calculatedStartTime,
          delaySeconds: Number(delaySeconds),
          hourlyLimit: Number(hourlyLimit),
          campaignTitle: `Campaign · ${subject.slice(0, 30)}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to schedule campaign');
      }

      onScheduledSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/50">
          <div>
            <h2 className="text-base font-bold text-white">Compose New Outreach Campaign</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure delayed BullMQ job scheduler, throttle delays, and recipient leads.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Demo Presets */}
          <div className="flex flex-wrap items-center gap-2 pb-1 border-b border-slate-800/60">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>Quick Presets:</span>
            </span>
            <button
              type="button"
              onClick={() => handleQuickPreset('standard')}
              className="rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Standard 3 Leads (2s delay)
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset('rate_limit_demo')}
              className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300 hover:bg-amber-500/20 transition-colors"
            >
              Rate Limit Demo (6 leads, 3/hr limit → triggers Slack!)
            </button>
          </div>

          {/* Sender Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Sender Account (Multi-Sender Support)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                {DEFAULT_SENDERS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="custom">Custom sender address...</option>
              </select>

              {senderEmail === 'custom' && (
                <input
                  type="email"
                  placeholder="custom.sender@company.com"
                  value={customSender}
                  onChange={(e) => setCustomSender(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email Subject Line
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email Body (Supports {'{{first_name}}'} tokens)
            </label>
            <textarea
              required
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono leading-relaxed"
            />
          </div>

          {/* Lead List Input / File Upload */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-indigo-400" />
                <span>Recipient Leads (CSV or Text)</span>
              </label>

              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setLeadInputMethod('paste')}
                  className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${
                    leadInputMethod === 'paste'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Paste Text
                </button>
                <button
                  type="button"
                  onClick={() => setLeadInputMethod('file')}
                  className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${
                    leadInputMethod === 'file'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Upload CSV / TXT
                </button>
              </div>
            </div>

            {leadInputMethod === 'paste' ? (
              <textarea
                rows={3}
                placeholder="Paste emails separated by commas, spaces, or newlines..."
                value={rawLeadsText}
                onChange={(e) => setRawLeadsText(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
              />
            ) : (
              <div className="border border-dashed border-slate-700 rounded-lg p-5 text-center bg-slate-950/50 hover:border-indigo-500 transition-colors">
                <Upload className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                <label className="cursor-pointer text-xs text-indigo-400 hover:underline font-medium">
                  <span>Click to choose CSV or TXT lead file</span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {fileName ? (
                  <p className="text-xs text-emerald-400 mt-2 font-mono flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Loaded {fileName}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Accepts exported CRM CSVs, lead sheets, or plain text lists
                  </p>
                )}
              </div>
            )}

            {/* Detected Emails Indicator */}
            <div className="mt-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-emerald-400 font-mono tabular-nums">
                  {detectedEmails.length}
                </span>
                <span className="text-slate-400">valid email addresses detected</span>
              </div>
              {detectedEmails.length > 0 && (
                <span className="text-[11px] text-slate-500 truncate max-w-[220px]">
                  First: {detectedEmails[0]}
                </span>
              )}
            </div>
          </div>

          {/* Scheduler Timing & Throttle Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Start Time */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                <span>Start Time</span>
              </label>
              <select
                value={startTimeType}
                onChange={(e) => setStartTimeType(e.target.value as any)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="now">Immediately</option>
                <option value="2min">In 2 Minutes</option>
                <option value="5min">In 5 Minutes</option>
                <option value="custom">Custom Date & Time</option>
              </select>

              {startTimeType === 'custom' && (
                <input
                  type="datetime-local"
                  value={customStartTime}
                  onChange={(e) => setCustomStartTime(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              )}
            </div>

            {/* Delay Between Sends */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>Min Delay (seconds)</span>
              </label>
              <input
                type="number"
                min={0}
                max={300}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Provider throttle interval
              </span>
            </div>

            {/* Hourly Rate Limit */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                <span>Hourly Limit (per sender)</span>
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Delays excess to next hour
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || detectedEmails.length === 0}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>
                {isSubmitting
                  ? 'Scheduling in BullMQ...'
                  : `Schedule ${detectedEmails.length} Email(s)`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
