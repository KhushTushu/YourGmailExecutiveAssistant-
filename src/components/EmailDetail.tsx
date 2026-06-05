/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, User, Clock, AlertCircle, FileText, CheckCircle2, 
  Sparkles, RefreshCw, PenSquare, Eye, Save, HelpCircle, Flame, Check, AlertTriangle 
} from 'lucide-react';
import { EmailMessage, EmailAnalysis, AttachmentAnalysis } from '../types';

interface EmailDetailProps {
  email: EmailMessage | null;
  analysis: EmailAnalysis | null;
  onSaveDraft: (to: string, subject: string, body: string, threadId: string) => Promise<boolean>;
  isSavingDraft: boolean;
  onReanalyze: (email: EmailMessage) => void;
  isReanalyzing: boolean;
}

export function EmailDetail({
  email,
  analysis,
  onSaveDraft,
  isSavingDraft,
  onReanalyze,
  isReanalyzing,
}: EmailDetailProps) {
  const [draftReplyBody, setDraftReplyBody] = useState('');
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [isDraftSavedSuccessfully, setIsDraftSavedSuccessfully] = useState(false);

  useEffect(() => {
    if (analysis) {
      setDraftReplyBody(analysis.suggestedReply || '');
      setIsDraftSavedSuccessfully(analysis.draftStatus === 'Created in Gmail Drafts');
    }
  }, [analysis]);

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center text-white/40 font-mono text-xs">
        <Sparkles className="h-8 w-8 text-[#C5A059]/40 mb-4 animate-pulse" />
        <p>Please select an email thread from feed to begin executive analysis</p>
      </div>
    );
  }

  const handleCreateDraftClick = async () => {
    const success = await onSaveDraft(
      email.fromEmail,
      `Re: ${email.subject}`,
      draftReplyBody,
      email.id
    );
    if (success) {
      setIsDraftSavedSuccessfully(true);
      setIsEditingDraft(false);
    }
  };

  return (
    <div className="space-y-6 max-h-[calc(100vh-140px)] overflow-y-auto pr-2 pb-12">
      {/* Thread Header Info */}
      <div className="rounded-xl border border-white/10 bg-[#0D0D0D] p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h2 className="font-serif text-lg font-bold text-white pr-12 leading-snug">
              {email.subject}
            </h2>
            <div className="flex items-center space-x-2 pt-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/60 select-none font-semibold text-xs border border-white/10">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="text-xs">
                <span className="font-semibold text-white/80">{email.fromName}</span>{' '}
                <span className="text-white/40 font-mono">&lt;{email.fromEmail}&gt;</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id={`reanalyze-btn-${email.id}`}
              onClick={() => onReanalyze(email)}
              disabled={isReanalyzing}
              title="Rerun executive analysis with fresh context"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#0F0F0F] text-white/40 hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isReanalyzing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Inner Collapsible Original Message Content */}
        <div className="rounded-xl border border-white/5 bg-white/5 p-4">
          <p className="text-xs font-semibold text-white/40 font-mono pb-2 border-b border-white/5 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#C5A059]" /> Received at: {new Date(email.date).toLocaleString()}
          </p>
          <div className="mt-3 text-[12px] text-white/70 leading-relaxed max-h-[220px] overflow-y-auto whitespace-pre-line font-sans scrollbar-thin">
            {email.body ? email.body : <span className="text-white/45 italic">No message body payload extraction returned.</span>}
          </div>
        </div>
      </div>

      {isReanalyzing || !analysis ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-[#C5A059]" />
          <p className="font-mono text-xs text-white/40 animate-pulse">Scanning email content structure & attachments...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Executive Summary Block */}
          <div className="rounded-xl border border-white/10 bg-[#121212] overflow-hidden relative shadow-2xl">
            <div className="bg-[#181818] border-b border-white/10 px-5 py-3 flex items-center justify-between">
              <span className="font-serif text-xs font-bold text-[#C5A059] uppercase tracking-[0.15em] flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[#C5A059]" /> EXECUTIVE INTELLIGENCE SUMMARY
              </span>
              <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase font-mono ${
                analysis.priority === 'Critical'
                  ? 'bg-red-500/20 border-red-500/30 text-red-400'
                  : 'bg-[#C5A059]/10 border-[#C5A059]/20 text-[#C5A059]'
              }`}>
                {analysis.priority}
              </span>
            </div>

            <div className="p-5 space-y-4.5">
              {/* Category & Deadlines row */}
              <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-3">
                <div>
                  <span className="text-[10px] font-semibold text-white/40 block uppercase font-mono tracking-wider">Assigned Category</span>
                  <span className="text-sm font-semibold text-white mt-0.5 block">{analysis.category}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-white/40 block uppercase font-mono tracking-wider">Deadline Target</span>
                  <span className={`text-sm font-semibold mt-0.5 block font-mono ${analysis.deadline ? 'text-[#C5A059]' : 'text-white/40'}`}>
                    {analysis.deadline || 'None detected'}
                  </span>
                </div>
              </div>

              {/* Purpose sentence */}
              <div>
                <span className="text-[10px] font-semibold text-white/40 block uppercase font-mono tracking-wider font-bold">Purpose Summary</span>
                <p className="text-sm text-white/90 italic leading-snug mt-1 pt-1.5 border-l-2 border-[#C5A059] pl-3">
                  "{analysis.purpose}"
                </p>
              </div>

              {/* Key points bullets */}
              <div>
                <span className="text-[10px] font-semibold text-white/40 block uppercase font-mono tracking-wider mb-2 font-bold">Key Takeaways</span>
                <ul className="space-y-1.5">
                  {analysis.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start space-x-2 text-xs text-white/70 pointer-events-none">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C5A059]" />
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Required */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <span className="text-[10px] font-semibold text-[#C5A059] block uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mandated Action
                </span>
                <p className="text-xs text-white mt-1 leading-relaxed">
                  {analysis.actionRequired}
                </p>
              </div>
            </div>
          </div>

          {/* Attachment Analysis section if attachments exist */}
          {analysis.attachments && analysis.attachments.length > 0 && (
            <div className="rounded-xl border border-white/10 p-5 space-y-4 bg-[#121212]">
              <h3 className="font-serif text-sm font-bold text-white flex items-center gap-1.5 border-b border-white/10 pb-2">
                <FileText className="h-4.5 w-4.5 text-[#C5A059]" /> ENCLOSED ATTACHMENTS ({analysis.attachments.length})
              </h3>
              <div className="space-y-3">
                {analysis.attachments.map((attach, idx) => (
                  <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#C5A059]/20 text-[#C5A059] flex items-center justify-center rounded text-xs font-bold font-mono">PDF</div>
                      <div>
                        <p className="text-[11px] font-medium text-white">{attach.name}</p>
                        <p className="text-[9px] text-[#C5A059] font-mono select-none uppercase font-bold tracking-[0.05em]">{attach.documentType}</p>
                      </div>
                    </div>
                    <div className="text-right sm:max-w-xs">
                      <p className="text-[11px] font-semibold text-white/50">{attach.summary}</p>
                      <p className="text-[10px] text-white/70 italic">{attach.requiredAction}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Reply Drafting Console */}
          <div className="rounded-xl border border-white/10 bg-[#151515] p-5 space-y-4 relative">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="space-y-0.5">
                <h3 className="font-serif text-sm font-bold text-white flex items-center gap-1.5">
                  <Send className="h-4.5 w-4.5 text-[#C5A059]" /> Executive Draft Composer
                </h3>
                <p className="text-[10px] text-white/40 font-mono">
                  DECISION: {analysis.replyNeeded ? (
                    <span className="text-[#C5A059] font-bold">REPLY RECOMMENDED</span>
                  ) : (
                    <span className="text-white/30 font-bold">NO REPLY REQUIRED</span>
                  )} — {analysis.replyRationale}
                </p>
              </div>

              {/* Edit Mode toggler button */}
              <button
                id="edit-draft-btn"
                onClick={() => setIsEditingDraft(!isEditingDraft)}
                className="flex items-center space-x-1 px-4 py-1.5 text-xs font-bold tracking-wider uppercase rounded-full border border-white/20 text-white/60 hover:bg-white/5 transition-all cursor-pointer"
              >
                {isEditingDraft ? (
                  <>
                    <Eye className="h-3 w-3" />
                    <span>Preview</span>
                  </>
                ) : (
                  <>
                    <PenSquare className="h-3 w-3" />
                    <span>Edit Draft</span>
                  </>
                )}
              </button>
            </div>

            {/* Custom Draft Editor / Preview */}
            <div className="space-y-4">
              {isEditingDraft ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-semibold text-white/40 uppercase tracking-widest">EDIT SUGGESTED MAIL BODY (HTML / TEXT)</label>
                  <textarea
                    id="draft-reply-textarea"
                    rows={8}
                    value={draftReplyBody}
                    onChange={(e) => setDraftReplyBody(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] p-4 font-mono text-xs text-white focus:border-[#C5A059] focus:outline-none"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                  <div className="text-[10px] font-semibold font-mono text-white/40 border-b border-white/5 pb-2 flex items-center justify-between">
                    <span>TO: {email.fromEmail}</span>
                    <span>SUBJECT: Re: {email.subject}</span>
                  </div>
                  <div 
                    id="draft-html-preview"
                    className="mt-3 text-[12px] font-serif text-white/80 space-y-2 whitespace-pre-wrap leading-relaxed min-h-[140px] max-h-[300px] overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: draftReplyBody.replace(/\n/g, '<br/>') }}
                  />
                </div>
              )}

              {/* Creation Action button block */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-mono text-white/40 flex items-center gap-1">
                  Status:{' '}
                  {isDraftSavedSuccessfully ? (
                    <span className="text-emerald-400 font-bold bg-[#C5A059]/10 px-1.5 py-0.5 rounded border border-[#C5A059]/20">
                      Created in Gmail Drafts
                    </span>
                  ) : (
                    <span className="text-[#C5A059] font-bold bg-[#C5A059]/10 px-1.5 py-0.5 rounded border border-[#C5A059]/20">
                      Ready for Review
                    </span>
                  )}
                </span>

                <button
                  id="confirm-save-draft-btn"
                  onClick={handleCreateDraftClick}
                  disabled={isSavingDraft || isDraftSavedSuccessfully || !draftReplyBody.trim()}
                  className="flex items-center space-x-1.5 rounded-full bg-white text-black hover:bg-gray-200 transition-colors px-5 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-45 cursor-pointer shadow-xl"
                >
                  {isSavingDraft ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Writing Draft to Gmail...</span>
                    </>
                  ) : isDraftSavedSuccessfully ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Saved in Gmail Drafts</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Draft to Gmail</span>
                    </>
                  )}
                </button>
              </div>

              {/* Warning label constraint display */}
              <p className="text-[10px] text-white/30 italic mt-2 leading-snug font-mono">
                * Gmail Assistant Agent will only stage replies under your draft tab. 
                Auto-sending is deactivated for your approval and absolute privacy.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
