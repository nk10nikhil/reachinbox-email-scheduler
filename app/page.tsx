'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MetricsCards } from '@/components/MetricsCards';
import { ScheduledEmailsTable } from '@/components/ScheduledEmailsTable';
import { SentEmailsTable } from '@/components/SentEmailsTable';
import { BullMQQueueView } from '@/components/BullMQQueueView';
import { ComposeEmailModal } from '@/components/ComposeEmailModal';
import { EmailDetailsModal } from '@/components/EmailDetailsModal';
import { SlackModal } from '@/components/SlackModal';
import { GoogleLoginModal } from '@/components/GoogleLoginModal';
import type {
  ScheduledEmailRecord,
  SentEmailRecord,
  QueueStats,
  SenderRateLimitInfo,
  SlackConfig,
  UserProfile,
} from '@/lib/types';
import { Sparkles, Mail, Send, Zap, Radio, Server } from 'lucide-react';

export default function HomePage() {
  const [activeTab, setActiveTab] = React.useState<'scheduled' | 'sent' | 'queue'>('scheduled');

  // Data states
  const [scheduledEmails, setScheduledEmails] = React.useState<ScheduledEmailRecord[]>([]);
  const [sentEmails, setSentEmails] = React.useState<SentEmailRecord[]>([]);
  const [queueStats, setQueueStats] = React.useState<QueueStats | null>(null);
  const [rateLimits, setRateLimits] = React.useState<SenderRateLimitInfo[]>([]);
  const [slackConfig, setSlackConfig] = React.useState<SlackConfig | null>(null);
  const [etherealUser, setEtherealUser] = React.useState<string | undefined>(undefined);
  const [user, setUser] = React.useState<UserProfile | null>({
    id: 'user_primary',
    name: 'Nikhil K',
    email: 'nk10nikhil@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
  });

  // UI / Modal states
  const [isLoading, setIsLoading] = React.useState(true);
  const [isComposeOpen, setIsComposeOpen] = React.useState(false);
  const [isSlackOpen, setIsSlackOpen] = React.useState(false);
  const [isLoginOpen, setIsLoginOpen] = React.useState(false);
  const [selectedEmail, setSelectedEmail] = React.useState<
    ScheduledEmailRecord | SentEmailRecord | null
  >(null);

  // Fetch all scheduler data
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [schedRes, sentRes, statsRes, slackRes] = await Promise.all([
        fetch('/api/emails/scheduled'),
        fetch('/api/emails/sent'),
        fetch('/api/queue/stats'),
        fetch('/api/slack/config'),
      ]);

      const [schedData, sentData, statsData, slackData] = await Promise.all([
        schedRes.json(),
        sentRes.json(),
        statsRes.json(),
        slackRes.json(),
      ]);

      if (schedData.emails) setScheduledEmails(schedData.emails);
      if (sentData.emails) setSentEmails(sentData.emails);
      if (statsData.queue) setQueueStats(statsData.queue);
      if (statsData.rateLimits) setRateLimits(statsData.rateLimits);
      if (statsData.ethereal?.user) setEtherealUser(statsData.ethereal.user);
      if (slackData.config) setSlackConfig(slackData.config);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Polling every 4 seconds to observe real-time job transitions from BullMQ
  React.useEffect(() => {
    let isMounted = true;
    const initialTimer = setTimeout(() => {
      if (isMounted) {
        loadData();
      }
    }, 10);
    const interval = setInterval(() => {
      if (isMounted) {
        loadData();
      }
    }, 4000);
    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [loadData]);

  // Cancel scheduled email
  const handleCancelScheduled = async (id: string) => {
    try {
      await fetch(`/api/emails/scheduled/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (err) {
      console.error('Failed to cancel email:', err);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    setUser(null);
  };

  const rescheduledCount = React.useMemo(() => {
    return rateLimits.reduce((acc, curr) => acc + (curr.rescheduledCount || 0), 0);
  }, [rateLimits]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* 1. Header with Top Bar Contract */}
      <Navbar
        user={user}
        queueStats={queueStats}
        isSlackConnected={Boolean(slackConfig?.isConnected)}
        onOpenCompose={() => setIsComposeOpen(true)}
        onOpenSlack={() => setIsSlackOpen(true)}
        onRefresh={loadData}
        onLogout={handleLogout}
        onLogin={() => setIsLoginOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        scheduledCount={scheduledEmails.length}
        sentCount={sentEmails.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Hero Section */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Distributed Email Job Scheduler</span>
              <span className="rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-xs font-mono font-medium text-indigo-300">
                BullMQ + Redis + PostgreSQL
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Accepts email scheduling requests, staggers delivery with atomic Redis rate limits, and
              preserves job state across server restarts using Ethereal fake SMTP.
            </p>
          </div>

          {/* Quick Action Badges */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSlackOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-700 transition-colors"
            >
              <Radio className={`h-3.5 w-3.5 ${slackConfig?.isConnected ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>Slack Alerts: {slackConfig?.isConnected ? 'Active' : 'Unconfigured'}</span>
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-700 transition-colors"
            >
              <Server className="h-3.5 w-3.5 text-indigo-400" />
              <span>Worker: {queueStats?.concurrency || 5}x Concurrency</span>
            </button>
          </div>
        </div>

        {/* 2. Metrics Cards */}
        <MetricsCards
          queueStats={queueStats}
          scheduledCount={scheduledEmails.length}
          sentCount={sentEmails.length}
          rescheduledCount={rescheduledCount}
          etherealUser={etherealUser}
          onViewQueue={() => setActiveTab('queue')}
        />

        {/* 3. Tab Section Navigation (Mobile visible) */}
        <div className="flex md:hidden items-center gap-1 mb-4 p-1 rounded-lg bg-slate-900 border border-slate-800">
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md text-center ${
              activeTab === 'scheduled' ? 'bg-slate-800 text-white' : 'text-slate-400'
            }`}
          >
            Scheduled ({scheduledEmails.length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md text-center ${
              activeTab === 'sent' ? 'bg-slate-800 text-white' : 'text-slate-400'
            }`}
          >
            Sent ({sentEmails.length})
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md text-center ${
              activeTab === 'queue' ? 'bg-slate-800 text-white' : 'text-slate-400'
            }`}
          >
            BullMQ
          </button>
        </div>

        {/* 4. Tab Views */}
        {activeTab === 'scheduled' && (
          <ScheduledEmailsTable
            emails={scheduledEmails}
            isLoading={isLoading}
            onRefresh={loadData}
            onOpenCompose={() => setIsComposeOpen(true)}
            onCancelEmail={handleCancelScheduled}
            onViewEmail={(e) => setSelectedEmail(e)}
          />
        )}

        {activeTab === 'sent' && (
          <SentEmailsTable
            emails={sentEmails}
            isLoading={isLoading}
            onRefresh={loadData}
            onOpenCompose={() => setIsComposeOpen(true)}
            onViewEmail={(e) => setSelectedEmail(e)}
          />
        )}

        {activeTab === 'queue' && (
          <BullMQQueueView
            stats={queueStats}
            rateLimits={rateLimits}
            isLoading={isLoading}
            onRefresh={loadData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 px-4 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ReachInbox.ai Engineering Assignment · Full-stack Email Job Scheduler</span>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>BullMQ 5.x</span>
            <span>·</span>
            <span>Redis Sorted-Set</span>
            <span>·</span>
            <span>PostgreSQL (PGlite)</span>
            <span>·</span>
            <span>Ethereal SMTP</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onScheduledSuccess={loadData}
      />

      <EmailDetailsModal
        email={selectedEmail}
        onClose={() => setSelectedEmail(null)}
      />

      <SlackModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
        config={slackConfig}
        onSaved={loadData}
      />

      <GoogleLoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(u) => setUser(u)}
      />
    </div>
  );
}
