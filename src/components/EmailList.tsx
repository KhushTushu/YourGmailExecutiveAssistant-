/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Mail, AlertCircle, Clock, Star, Flame, Calendar, Tag } from 'lucide-react';
import { EmailMessage, EmailAnalysis, EmailCategory, PriorityLevel } from '../types';

interface EmailListProps {
  emails: EmailMessage[];
  selectedId: string | null;
  onSelect: (email: EmailMessage) => void;
  analyses: Record<string, EmailAnalysis>;
  isLoading: boolean;
}

export function EmailList({ emails, selectedId, onSelect, analyses, isLoading }: EmailListProps) {
  const getCategoryStyles = (category: EmailCategory) => {
    switch (category) {
      case 'Business':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'Career':
        return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-455';
      case 'Education':
        return 'bg-[#C5A059]/10 border-[#C5A059]/20 text-[#C5A059]';
      case 'Finance':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      case 'Personal':
        return 'bg-sky-500/10 border-sky-500/20 text-sky-400';
      case 'Marketing':
        return 'bg-rose-500/10 border-rose-500/20 text-rose-400';
      case 'Spam':
      default:
        return 'bg-white/5 border-white/10 text-white/40';
    }
  };

  const getPriorityStyles = (priority: PriorityLevel) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-500/20 border-red-500/30 text-red-400 font-bold';
      case 'High':
        return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
      case 'Medium':
        return 'bg-white/5 border-white/15 text-white/70';
      case 'Low':
      default:
        return 'bg-white/5 border-white/10 text-white/40';
    }
  };

  const formatEmailDate = (dateStr: string) => {
    try {
      const dateObj = new Date(dateStr);
      // If date is today, show time, else show short date
      const today = new Date();
      if (dateObj.toDateString() === today.toDateString()) {
        return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#C5A059]" />
        <p className="font-mono text-xs text-white/40">Checking your inbox feed...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/20 mb-4">
          <Mail className="h-6 w-6" />
        </div>
        <p className="font-display font-medium text-white/60">Your Inbox is completely clear</p>
        <p className="text-xs text-white/40 mt-1">No incoming messages requiring processing found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[calc(100vh-140px)] overflow-y-auto pr-2">
      {emails.map((email) => {
        const isSelected = email.id === selectedId;
        const analysis = analyses[email.id];

        return (
          <motion.div
            id={`email-card-${email.id}`}
            key={email.id}
            onClick={() => onSelect(email)}
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.15 }}
            className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 relative overflow-hidden ${
              isSelected
                ? 'bg-[#181818] border-[#C5A059]/40 shadow-xl shadow-black/80'
                : 'bg-[#121212]/40 border-white/5 hover:bg-[#151515] hover:border-white/10'
            }`}
          >
            {/* Ambient left highlight based on priority */}
            {analysis && (
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  analysis.priority === 'Critical'
                    ? 'bg-red-500'
                    : analysis.priority === 'High'
                    ? 'bg-orange-550'
                    : 'bg-transparent'
                }`}
              />
            )}

            {/* Top row: Sender Name and Date */}
            <div className="flex items-center justify-between">
              <span className="font-serif text-sm font-semibold text-white/95 truncate max-w-[180px]">
                {email.fromName || 'Unknown Sender'}
              </span>
              <span className="font-mono text-[10px] text-white/40 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-white/20" />
                {formatEmailDate(email.date)}
              </span>
            </div>

            {/* Subject */}
            <h4 className="mt-1.5 text-xs font-medium text-white/70 truncate leading-relaxed">
              {email.subject}
            </h4>

            {/* Snippet snippet */}
            <p className="mt-1 text-[11px] text-white/50 line-clamp-2 leading-relaxed font-sans">
              {email.snippet}
            </p>

            {/* Categories & Priorities Badges */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
              {analysis ? (
                <>
                  <span
                    className={`inline-flex items-center gap-1 rounded bg-transparent px-1.5 py-0.5 text-[10px] font-medium border ${getCategoryStyles(
                      analysis.category
                    )}`}
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {analysis.category}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded bg-transparent px-1.5 py-0.5 text-[10px] font-medium border ${getPriorityStyles(
                      analysis.priority
                    )}`}
                  >
                    {analysis.priority === 'Critical' && <Flame className="h-2.5 w-2.5 animate-pulse" />}
                    {analysis.priority}
                  </span>

                  {/* Draft Badge */}
                  {analysis.draftStatus === 'Created in Gmail Drafts' ? (
                    <span className="inline-flex items-center rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-mono font-medium border border-emerald-500/20 text-emerald-400 ml-auto">
                      Draft Saved
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-mono font-medium text-white/40 ml-auto border border-white/5">
                      New
                    </span>
                  )}
                </>
              ) : (
                <div className="flex items-center space-x-1 ml-auto text-[10px] font-mono text-white/30">
                  <div className="h-2 w-2 rounded-full bg-white/20 animate-pulse" />
                  <span>Awaiting analysis</span>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
