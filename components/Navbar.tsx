'use client';

import React from 'react';
import {
  Mail,
  Send,
  Zap,
  Radio,
  LogOut,
  ChevronDown,
  Plus,
  RefreshCw,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import type { UserProfile, QueueStats } from '@/lib/types';

interface NavbarProps {
  user: UserProfile | null;
  queueStats: QueueStats | null;
  isSlackConnected: boolean;
  onOpenCompose: () => void;
  onOpenSlack: () => void;
  onRefresh: () => void;
  onLogout: () => void;
  onLogin: () => void;
  activeTab: 'scheduled' | 'sent' | 'queue';
  setActiveTab: (tab: 'scheduled' | 'sent' | 'queue') => void;
  scheduledCount: number;
  sentCount: number;
}

export function Navbar({
  user,
  queueStats,
  isSlackConnected,
  onOpenCompose,
  onOpenSlack,
  onRefresh,
  onLogout,
  onLogin,
  activeTab,
  setActiveTab,
  scheduledCount,
  sentCount,
}: NavbarProps) {
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
      {/* Top Bar Zone 1, 2, 3 */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Mark */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-500/20">
              <Mail className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white">ReachInbox</span>
              <span className="text-[11px] font-medium text-slate-400">Email Scheduler</span>
            </div>
          </div>

          {/* Navigation Tabs (Zone 2) */}
          <nav className="hidden md:flex items-center gap-1 rounded-lg bg-slate-900/80 p-1 border border-slate-800">
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'scheduled'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Scheduled Emails</span>
              <span className="rounded-full bg-indigo-500/20 px-1.5 py-0.2 text-[10px] font-mono text-indigo-300">
                {scheduledCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('sent')}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'sent'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              <span>Sent Emails</span>
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-mono text-emerald-300">
                {sentCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'queue'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>BullMQ Queue</span>
              {queueStats?.active ? (
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              ) : null}
            </button>
          </nav>
        </div>

        {/* Zone 3: Actions & Google User Profile */}
        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            title="Refresh Status"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {/* Slack Connection Pill / Button */}
          <button
            onClick={onOpenSlack}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              isSlackConnected
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Radio className={`h-3.5 w-3.5 ${isSlackConnected ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Slack</span>
            <span className={`h-1.5 w-1.5 rounded-full ${isSlackConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          </button>

          {/* Compose New Email Primary Action */}
          <button
            onClick={onOpenCompose}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-indigo-600/30 hover:bg-indigo-500 transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Compose Email</span>
          </button>

          {/* Google User Profile */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900/60 p-1.5 pr-2.5 text-left hover:border-slate-700 transition-colors"
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm ring-1 ring-white/10 overflow-hidden font-mono">
                  <span>
                    {user.name
                      ? user.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                      : 'U'}
                  </span>
                </div>
                <div className="hidden lg:flex flex-col">
                  <span className="text-xs font-medium text-slate-200 leading-tight">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight truncate max-w-[120px]">
                    {user.email}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-xl shadow-black/50 z-50"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <div className="border-b border-slate-800 px-3 py-2 text-xs">
                    <p className="font-semibold text-white">{user.name}</p>
                    <p className="text-slate-400 truncate">{user.email}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Google Account Connected</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={onOpenSlack}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      <Radio className="h-3.5 w-3.5 text-slate-400" />
                      <span>Slack Alerts Config</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('queue')}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      <Sliders className="h-3.5 w-3.5 text-slate-400" />
                      <span>Worker & Queue Settings</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-800 pt-1">
                    <button
                      onClick={onLogout}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
            >
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
