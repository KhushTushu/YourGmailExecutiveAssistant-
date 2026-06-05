/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { X, CheckSquare, FileText, AlertCircle, Clock, Star, Brain, Sparkles } from 'lucide-react';
import { DailyDigest } from '../types';

interface DailyDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  digest: DailyDigest | null;
  isLoading: boolean;
}

export function DailyDigestModal({ isOpen, onClose, digest, isLoading }: DailyDigestModalProps) {
  if (!isOpen) return null;

  return (
    <div id="modal-container" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        id="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />

      {/* Modal Dialog */}
      <motion.div
        id="modal-content"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0D0D0D] shadow-2xl"
      >
        {/* Decorative Top Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#C5A059]/20 via-[#C5A059] to-[#C5A059]/20" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold tracking-wide text-white flex items-center gap-1.5">
                Daily Chief-of-Staff Report <Sparkles className="h-4.5 w-4.5 text-[#C5A059]" />
              </h2>
              <p className="text-xs text-white/40">Compiled by Executive Assistant AI</p>
            </div>
          </div>
          <button
            id="close-modal-btn"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-[#C5A059]" />
              <p className="font-mono text-xs text-white/40">Synthesizing communications statistics...</p>
            </div>
          ) : digest ? (
            <>
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-white/5 bg-[#121212] p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-white/40">
                    <span className="text-xs font-semibold uppercase tracking-wider font-mono">Volumetries</span>
                    <FileText className="h-4 w-4 text-[#C5A059]" />
                  </div>
                  <div className="mt-2">
                    <span className="font-mono text-2xl font-bold text-white">{digest.totalEmails}</span>
                    <p className="text-[10px] text-white/40 font-mono">Emails analyzed</p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-[#121212] p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-white/40">
                    <span className="text-xs font-semibold uppercase tracking-wider font-mono">Important</span>
                    <Star className="h-4 w-4 text-[#C5A059]" />
                  </div>
                  <div className="mt-2">
                    <span className="font-mono text-2xl font-bold text-[#C5A059]">{digest.importantEmails}</span>
                    <p className="text-[10px] text-white/40 font-mono">High/Critical</p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-[#121212] p-4 flex flex-col justify-between col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between text-white/40">
                    <span className="text-xs font-semibold uppercase tracking-wider font-mono">Draft Actions</span>
                    <CheckSquare className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="mt-2">
                    <span className="font-mono text-2xl font-bold text-emerald-400">{digest.pendingReplies}</span>
                    <p className="text-[10px] text-white/40 font-mono font-mono">Pending reply review</p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-[#121212] p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-white/40">
                    <span className="text-xs font-semibold uppercase tracking-wider font-mono">Leads / Ops</span>
                    <Sparkles className="h-4 w-4 text-[#C5A059]" />
                  </div>
                  <div className="mt-2">
                    <span className="font-mono text-2xl font-bold text-[#C5A059]/90">{digest.newOpportunities}</span>
                    <p className="text-[10px] text-white/40 font-mono">Client opportunities</p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-[#121212] p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-white/40">
                    <span className="text-xs font-semibold uppercase tracking-wider font-mono">Deadlines</span>
                    <Clock className="h-4 w-4 text-[#C5A059]" />
                  </div>
                  <div className="mt-2">
                    <span className="font-mono text-2xl font-bold text-[#C5A059]">{digest.upcomingDeadlines}</span>
                    <p className="text-[10px] text-white/40 font-mono">Dates parsed</p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-[#121212] p-4 flex flex-col justify-between col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between text-white/40">
                    <span className="text-xs font-semibold uppercase tracking-wider font-mono">Hot Issues</span>
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                  </div>
                  <div className="mt-2">
                    <span className="font-mono text-2xl font-bold text-rose-500">{digest.criticalTasks}</span>
                    <p className="text-[10px] text-white/40 font-mono">Critical tasks</p>
                  </div>
                </div>
              </div>

              {/* Recommended Actions */}
              <div className="space-y-3">
                <h3 className="font-serif text-sm font-semibold text-white/90">Recommended Executive Tasks</h3>
                <div className="space-y-2.5">
                  {digest.recommendedActions.length > 0 ? (
                    digest.recommendedActions.map((action, i) => (
                      <div
                        id={`digest-rec-${i}`}
                        key={i}
                        className="flex items-start space-x-3 rounded-xl border border-white/5 bg-[#121212] p-4.5"
                      >
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#C5A059]/10 font-mono text-[11px] font-bold text-[#C5A059]">
                          {i + 1}
                        </div>
                        <p className="text-sm font-serif leading-relaxed text-white/80">{action}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-white/30 font-mono">No immediate pending recommended operations computed.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-white/30 font-mono text-xs">
              <p>No communications metrics detected yet.</p>
              <p className="mt-1 text-[10px] text-white/20">Please analyze an email first to form a report.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-white/10 bg-white/5 px-6 py-4">
          <button
            id="close-digest-btn"
            onClick={onClose}
            className="rounded-full bg-white text-black hover:bg-gray-200 transition-colors px-6 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xl"
          >
            Acknowledge Report
          </button>
        </div>
      </motion.div>
    </div>
  );
}
