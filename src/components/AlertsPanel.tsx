/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { 
  Bell, CheckSquare, Calendar, ChevronRight, AlertTriangle, AlertCircle, Clock, Send, Sparkles, Flame 
} from 'lucide-react';
import { DetectedTask, FollowUpThread, PriorityLevel } from '../types';

interface AlertsPanelProps {
  tasks: DetectedTask[];
  onToggleTask: (taskId: string) => void;
  followUps: FollowUpThread[];
  onCreateFollowUpDraft: (thread: FollowUpThread) => void;
  isDraftingFollowUp: string | null;
}

export function AlertsPanel({
  tasks,
  onToggleTask,
  followUps,
  onCreateFollowUpDraft,
  isDraftingFollowUp,
}: AlertsPanelProps) {
  const getPriorityColor = (level: PriorityLevel) => {
    switch (level) {
      case 'Critical':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'High':
        return 'text-orange-400 bg-orange-505/10 border-orange-500/20';
      case 'Medium':
        return 'text-[#C5A059] bg-[#C5A059]/10 border-[#C5A059]/20';
      case 'Low':
      default:
        return 'text-white/40 bg-white/5 border-white/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Task Detected Timeline Checklist */}
      <div className="rounded-xl border border-white/10 bg-[#121212] p-5 space-y-4">
        <h3 className="font-serif text-sm font-bold text-white flex items-center justify-between border-b border-white/5 pb-2">
          <span className="flex items-center gap-1.5">
            <CheckSquare className="h-4.5 w-4.5 text-[#C5A059]" /> Executive Tasks
          </span>
          <span className="rounded bg-[#C5A059]/10 border border-[#C5A059]/20 px-2 py-0.5 text-[10px] font-mono font-bold text-[#C5A059]">
            {tasks.filter((t) => !t.completed).length} Pending
          </span>
        </h3>

        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <div
                id={`task-item-${task.id}`}
                key={task.id}
                className={`group flex items-start space-x-3 rounded-lg border p-3.5 transition-all relative ${
                  task.completed
                    ? 'border-white/5 bg-white/5 opacity-55'
                    : 'border-white/10 bg-[#0D0D0D]/40 hover:border-white/20'
                }`}
              >
                {/* Custom Checkbox */}
                <button
                  id={`toggle-task-btn-${task.id}`}
                  onClick={() => onToggleTask(task.id)}
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                    task.completed
                      ? 'border-[#C5A059] bg-[#C5A059] text-black'
                      : 'border-white/20 bg-[#0A0A0A] hover:border-[#C5A059]'
                  }`}
                >
                  {task.completed && (
                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <div className="space-y-1 select-none pointer-events-none">
                  <p className={`text-xs font-semibold leading-snug ${task.completed ? 'line-through text-white/40' : 'text-white/80'}`}>
                    {task.task}
                  </p>
                  
                  {/* Task Metadata */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5 text-[9px] font-mono">
                    <span className={`px-1.5 py-0.5 rounded border uppercase font-bold text-[8px] ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className="text-white/40 flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5 text-[#C5A059]" />
                      Due: {task.deadline}
                    </span>
                  </div>

                  {/* Suggeted actions */}
                  <p className="text-[10px] text-white/50 italic leading-relaxed pt-1.5 border-t border-white/5 mt-1.5">
                    Suggested Response: {task.suggestedAction}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-white/40 font-mono text-[10px]">
              <p>No operational tasks or deadlines parsed yet.</p>
              <p className="mt-1 text-[9px] text-white/25">Select high priority messages to parse mandates.</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Conversational Follow-Up Tracking */}
      <div className="rounded-xl border border-white/10 bg-[#121212] p-5 space-y-4">
        <h3 className="font-serif text-sm font-bold text-white flex items-center justify-between border-b border-white/15 pb-2">
          <span className="flex items-center gap-1.5">
            <Bell className="h-4.5 w-4.5 text-[#C5A059]" /> Follow-Up Tracking
          </span>
        </h3>

        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {followUps.length > 0 ? (
            followUps.map((item, idx) => (
              <div
                id={`follow-up-${item.threadId}`}
                key={item.threadId}
                className="rounded-lg border border-white/10 bg-[#0D0D0D]/40 p-3.5 space-y-2.5 relative overflow-hidden"
              >
                {/* Ribbon Tag status info */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-semibold text-white/80 truncate max-w-[170px] font-serif">{item.subject}</h4>
                    <p className="text-[9px] font-mono text-white/40 truncate">to {item.recipient}</p>
                  </div>
                  <span className={`inline-flex rounded-lg px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase ${
                    item.elapsedDays >= 7
                      ? 'bg-rose-500/10 border border-rose-500/20 text-rose-405'
                      : item.elapsedDays >= 5
                      ? 'bg-[#C5A059]/10 border border-[#C5A059]/20 text-[#C5A059]'
                      : 'bg-[#C5A059]/5 border border-[#C5A059]/10 text-[#C5A059]/70'
                  }`}>
                    {item.elapsedDays}d Ago
                  </span>
                </div>

                {/* Tracking Rule description label */}
                <p className="text-[10px] text-white/60 leading-relaxed font-mono">
                  {item.elapsedDays >= 7 ? (
                    <span className="text-rose-505 font-bold flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> [Critical Alert] No reply after 7 days
                    </span>
                  ) : item.elapsedDays >= 5 ? (
                    <span className="text-[#C5A059] font-semibold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Nudge recommended (No response)
                    </span>
                  ) : (
                    <span className="text-[#C5A059]/70 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Monitoring sequence engaged
                    </span>
                  )}
                </p>

                {/* Reply draft creator button */}
                <div className="pt-2 border-t border-white/5 flex justify-end">
                  <button
                    id={`create-fup-draft-btn-${item.threadId}`}
                    onClick={() => onCreateFollowUpDraft(item)}
                    disabled={item.draftCreated || isDraftingFollowUp === item.threadId}
                    className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#C5A059] hover:text-[#C5A059]/80 transition disabled:opacity-40 cursor-pointer"
                  >
                    {isDraftingFollowUp === item.threadId ? (
                      <>
                        <Clock className="h-2.5 w-2.5 animate-spin" />
                        <span>Composing...</span>
                      </>
                    ) : item.draftCreated ? (
                      <>
                        <CheckSquare className="h-2.5 w-2.5 text-emerald-400" />
                        <span className="text-emerald-400">Draft saved in Gmail</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-2.5 w-2.5" />
                        <span>Draft reminder reply</span>
                        <ChevronRight className="h-2 w-2" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-white/30 font-mono text-[10px]">
              <p>No unanswered send loops detected.</p>
              <p className="mt-1 text-[9px] text-white/20">Threads are analyzed for prompt reply tracking.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
