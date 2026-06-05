/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, Sparkles, Mail, CheckSquare, Bell, LogOut, RefreshCw, 
  User, Shield, Laptop, ChevronRight, FileText, Star, Brain, Check, AlertTriangle 
} from 'lucide-react';
import { 
  initAuth, googleSignIn, logout, getAccessToken 
} from './lib/auth';
import { 
  EmailMessage, EmailAnalysis, DetectedTask, FollowUpThread, DailyDigest 
} from './types';

// Extract modular subcomponents
import { EmailList } from './components/EmailList';
import { EmailDetail } from './components/EmailDetail';
import { DailyDigestModal } from './components/DailyDigestModal';
import { AlertsPanel } from './components/AlertsPanel';

export default function App() {
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Email state
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Analysis & AI cache
  const [analyses, setAnalyses] = useState<Record<string, EmailAnalysis>>({});
  const [isAnalyzingId, setIsAnalyzingId] = useState<string | null>(null);

  // Tasks checklist (synced with AI outputs)
  const [tasks, setTasks] = useState<DetectedTask[]>([]);

  // Daily Digest
  const [isDigestOpen, setIsDigestOpen] = useState(false);
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [isGeneratingDigest, setIsGeneratingDigest] = useState(false);

  // Follow Up state (pre-seeded with interactive instances for tracking demo)
  const [followUps, setFollowUps] = useState<FollowUpThread[]>([
    {
      threadId: 'thread_fup_992',
      subject: 'Urgent: Scholarship Verification Details',
      recipient: 'funding-board@columbia.edu',
      lastMessageDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      elapsedDays: 3,
      status: 'Pending 2 Days Follow-Up',
      draftCreated: false,
    },
    {
      threadId: 'thread_fup_143',
      subject: 'Partnership Agreement Proposal - Bright-Cab solutions',
      recipient: 'operations@brightcab-corp.com',
      lastMessageDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      elapsedDays: 6,
      status: 'Pending 5 Days Follow-Up',
      draftCreated: false,
    }
  ]);
  const [isDraftingFollowUpId, setIsDraftingFollowUpId] = useState<string | null>(null);

  // Avoid running sync multiple times on boot
  const hasSyncedOnBoot = useRef(false);

  // On mount: initialise Auth and check cached token state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setNeedsAuth(false);
      },
      () => {
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // When access token is loaded, trigger boot sync automatically
  useEffect(() => {
    if (accessToken && !hasSyncedOnBoot.current) {
      hasSyncedOnBoot.current = true;
      syncInboxFeed();
    }
  }, [accessToken]);

  // Sync tasks checklist dynamically with incoming analyses
  useEffect(() => {
    const newTasks: DetectedTask[] = [];
    Object.entries(analyses).forEach(([id, value]) => {
      const analysis = value as EmailAnalysis;
      // If deadline or action required exists, and we don't have this task already
      if (analysis.actionRequired && !tasks.some(t => t.sourceMessageId === id)) {
        const mail = emails.find(e => e.id === id);
        newTasks.push({
          id: `task_${id}`,
          task: analysis.actionRequired,
          deadline: analysis.deadline || 'None',
          priority: analysis.priority,
          suggestedAction: analysis.purpose,
          sourceMessageId: id,
          sourceSubject: mail?.subject || 'Inbox message analysis',
          completed: false,
        });
      }
    });

    if (newTasks.length > 0) {
      setTasks(prev => [...prev, ...newTasks]);
    }
  }, [analyses, emails, tasks]);

  // Login click
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setAccessToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setAuthError(err.message || 'Verification flow crashed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Sign out click
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setEmails([]);
    setSelectedEmail(null);
    setAnalyses({});
    setTasks([]);
    setNeedsAuth(true);
    hasSyncedOnBoot.current = false;
  };

  // Sync incoming inbox feed
  const syncInboxFeed = async () => {
    if (!accessToken) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const response = await fetch('/api/gmail/messages?maxResults=10', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Proxy error listing messages: status ${response.status}`);
      }
      const data = await response.json();
      if (data.messages) {
        setEmails(data.messages);
        if (data.messages.length > 0 && !selectedEmail) {
          setSelectedEmail(data.messages[0]);
        }
        // Run background AI analyses sequentially for all loaded emails
        triggerBackgroundAnalyses(data.messages);
      }
    } catch (error: any) {
      console.error('Sync failed:', error);
      setSyncError(error.message || 'Network exception downloading feed');
    } finally {
      setIsSyncing(false);
    }
  };

  // Run analyses sequentially in background to avoid hitting system timeouts
  const triggerBackgroundAnalyses = async (messageList: EmailMessage[]) => {
    for (const mail of messageList) {
      // Skip if already analyzed
      if (analyses[mail.id]) continue;
      await runEmailAnalysis(mail);
    }
  };

  // Run Gemini analysis on an individual message
  const runEmailAnalysis = async (email: EmailMessage) => {
    setIsAnalyzingId(email.id);
    try {
      const response = await fetch('/api/analyze-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: email.from,
          subject: email.subject,
          date: email.date,
          snippet: email.snippet,
          body: email.body,
          attachments: email.attachments,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to formulate analysis: code ${response.status}`);
      }

      const result = await response.json();
      setAnalyses((prev) => ({
        ...prev,
        [email.id]: {
          ...result,
          messageId: email.id,
          draftStatus: result.draftStatus || 'Ready for Review',
        },
      }));
    } catch (err) {
      console.error(`Analysis failed for email ${email.id}:`, err);
    } finally {
      setIsAnalyzingId(null);
    }
  };

  // Create standard Email Draft inside user's Gmail box
  const handleSaveDraft = async (to: string, subject: string, body: string, threadId: string): Promise<boolean> => {
    if (!accessToken) return false;
    try {
      const response = await fetch('/api/gmail/drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          to,
          subject,
          body,
          threadId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save draft to Gmail: status ${response.status}`);
      }

      const draftResult = await response.json();

      setAnalyses((prev) => {
        if (!prev[threadId]) return prev;
        return {
          ...prev,
          [threadId]: {
            ...prev[threadId],
            draftStatus: 'Created in Gmail Drafts',
            draftId: draftResult.id,
          },
        };
      });

      return true;
    } catch (error) {
      console.error('Error saving reply draft to Gmail:', error);
      return false;
    }
  };

  // Task checklist handler
  const handleToggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  // Draft Follow Up reply using Gemini & register inside Gmail drafts
  const handleCreateFollowUpDraft = async (thread: FollowUpThread) => {
    if (!accessToken) return;
    setIsDraftingFollowUpId(thread.threadId);
    try {
      // Craft response using server endpoint
      const response = await fetch('/api/analyze-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: thread.recipient,
          subject: thread.subject,
          date: thread.lastMessageDate,
          snippet: `This is a follow up conversation track. No response has been received for ${thread.elapsedDays} days.`,
          body: `Hi there, we initiated a proposal regarding "${thread.subject}". Please craft a warm, polite and reminder follow-up email draft so we can nudge them for answers. Keep it highly professional and business oriented.`,
          attachments: [],
        }),
      });

      if (!response.ok) {
        throw new Error(`Follow-up gen failed with status ${response.status}`);
      }

      const analysisResult = await response.json();
      
      // Save it inside Gmail Draft tab automatically
      const draftResult = await handleSaveDraft(
        thread.recipient,
        `Follow-Up: ${thread.subject}`,
        analysisResult.suggestedReply,
        thread.threadId
      );

      if (draftResult) {
        setFollowUps((prev) =>
          prev.map((f) => (f.threadId === thread.threadId ? { ...f, draftCreated: true } : f))
        );
      }
    } catch (err) {
      console.error('Draft follow-up nudge failed:', err);
    } finally {
      setIsDraftingFollowUpId(null);
    }
  };

  // Trigger Daily Executive Report compilation
  const handleOpenDailyDigest = async () => {
    setIsDigestOpen(true);
    setIsGeneratingDigest(true);
    try {
      const emailSummaries = Object.values(analyses);
      const response = await fetch('/api/daily-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analyzedEmails: emailSummaries,
        }),
      });

      if (!response.ok) {
        throw new Error(`Report API failed with status ${response.status}`);
      }

      const digestResult = await response.json();
      setDigest(digestResult);
    } catch (err) {
      console.error('Failed synthesizing daily summary:', err);
    } finally {
      setIsGeneratingDigest(false);
    }
  };

  // Render gate when needs login representation
  if (needsAuth) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col justify-between p-6">
        {/* Top bar background */}
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/25">
            <Bot className="h-5 w-5" />
          </div>
          <span className="font-mono font-bold text-xs text-white/40 tracking-[0.2em]">GMAIL AGENCY FRAMEWORK</span>
        </div>

        {/* Center Grid landing banner card */}
        <div className="max-w-4xl mx-auto w-full my-12 bg-[#0D0D0D] border border-white/10 rounded-3xl p-8 sm:p-12 space-y-10 relative overflow-hidden backdrop-blur-md shadow-2xl">
          {/* Decorative gradients */}
          <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-[#C5A059]/5 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-45 -right-45 h-80 w-80 rounded-full bg-[#C5A059]/5 blur-3xl pointer-events-none" />

          {/* Heading */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#C5A059]/10 border border-[#C5A059]/20 text-[#C5A059] text-xs font-mono font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> SECURE AI WORKSPACE
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              Gmail Executive <span className="bg-gradient-to-r from-[#C5A059] to-[#E2C799] bg-clip-text text-transparent">AI Assistant</span>
            </h1>
            <p className="text-sm text-white/50 max-w-2xl mx-auto leading-relaxed font-sans">
              Formulated as an autonomous chief-of-staff connected securely to your Gmail inbox. 
              The AI reads, summarizes, highlights deadlines, decodes heavy attachment files, 
              and stages reply drafts directly in your outbox loop for review.
            </p>
          </div>

          {/* Bento feature list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/5 bg-[#121212]/30 p-6 space-y-3">
              <span className="h-8 w-8 flex items-center justify-center rounded bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 text-xs font-bold font-mono">01</span>
              <h3 className="font-serif font-bold text-sm text-white/90">Cognitive Classification</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Assigns incoming threads into Business, Finance, Education, or Career folders, instantly computing a critical triage ranking.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#121212]/30 p-6 space-y-3">
              <span className="h-8 w-8 flex items-center justify-center rounded bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 text-xs font-bold font-mono">02</span>
              <h3 className="font-serif font-bold text-sm text-white/90">Compliance & Deadlines</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Scans attachments (Invoices, Legal Documents, visa sheets) and forms an interactive checklist of parsed duties and due dates.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#121212]/30 p-6 space-y-3">
              <span className="h-8 w-8 flex items-center justify-center rounded bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 text-xs font-bold font-mono">03</span>
              <h3 className="font-serif font-bold text-sm text-white/90">Privacy-Guided Drafting</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Writes tailored response drafts with customizable inputs. Drafts write internally directly into Gmail drafts—nothing automatically sends.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#121212]/30 p-6 space-y-3">
              <span className="h-8 w-8 flex items-center justify-center rounded bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 text-xs font-bold font-mono">04</span>
              <h3 className="font-serif font-bold text-sm text-white/90">Conversation Follow-Ups</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Applies chronological surveillance on sent folders, giving prompt alerts for unanswered pitches after 2, 5, or 7 days of absence.
              </p>
            </div>
          </div>

          {/* Action Login trigger inside card */}
          <div className="flex flex-col items-center justify-center pt-4 space-y-4">
            {authError && (
              <p className="text-red-400 text-xs font-mono bg-red-500/10 border border-red-500/25 px-4 py-2 rounded-xl">
                Error: {authError}
              </p>
            )}

            {/* Styled material Google authentication button */}
            <button
              id="google-signin-btn"
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="gsi-material-button w-full sm:w-auto relative cursor-pointer flex items-center justify-center focus:outline-none"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper flex items-center px-8 py-3.5 bg-white hover:bg-gray-200 text-black font-bold rounded-full text-xs uppercase tracking-wider transition-colors shadow-2xl">
                <div className="gsi-material-button-icon mr-3">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block", width: "16px", height: "16px" }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents font-mono">
                  {isLoggingIn ? 'Establishing connection...' : 'Access via Gmail Credentials'}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Footer info text */}
        <div className="flex items-center justify-between text-white/20 font-mono text-[10px] sm:text-xs">
          <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-[#C5A059]" /> 256-bit TLS encrypted OAuth2 tunnel</span>
          <span>Google Workspace Enterprise Compliant</span>
        </div>
      </div>
    );
  }

  // Authenticated operational dashboard representation
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col justify-between text-white font-sans">
      
      {/* 1. Header Navigation block */}
      <header className="border-b border-white/10 bg-[#0F0F0F] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-serif text-base font-bold text-white tracking-widest flex items-center gap-2">
              GMAIL EXECUTIVE AI
            </h1>
            {/* Status dot flashing */}
            <div className="flex items-center space-x-1.5 mt-0.5 select-none text-[10px] font-mono text-white/40">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span>Workspace Connected</span>
            </div>
          </div>
        </div>

        {/* Synchronisation actions & user info */}
        <div className="flex items-center space-x-3">
          {/* Daily Report Trigger */}
          <button
            id="daily-digest-btn"
            onClick={handleOpenDailyDigest}
            className="flex items-center space-x-1.5 rounded-full border border-[#C5A059]/20 bg-[#C5A059]/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#C5A059] hover:bg-[#C5A059]/20 transition-all cursor-pointer"
          >
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Daily Chief-of-Staff Report</span>
          </button>

          {/* Sync inbox content */}
          <button
            id="sync-inbox-btn"
            onClick={syncInboxFeed}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 rounded-full border border-white/10 bg-[#0A0A0A] text-white/60 hover:bg-white/5 hover:text-white px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>

          {/* User badge */}
          <div className="flex items-center space-x-2 border-l border-white/10 pl-3">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="h-7 w-7 rounded-full border border-white/10" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/60 text-xs font-bold border border-white/10">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <button
              id="signout-btn"
              onClick={handleLogout}
              title="Sign out of agent session"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 hover:bg-[#0A0A0A] hover:text-red-400 transition cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Bento Grid Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
          
          {/* LEFT: Feed of incoming emails (4 col) */}
          <section className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <span className="font-serif font-bold text-xs text-[#C5A059] uppercase tracking-[0.15em]">Priority Inbox Loop</span>
              <span className="text-[10px] font-mono text-white/40">{emails.length} items logged</span>
            </div>
            
            {syncError && (
              <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-3.5 flex items-start gap-2 text-xs text-red-500">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Sync failed: {syncError}. Verify Gmail permissions.</p>
              </div>
            )}

            <EmailList 
              emails={emails}
              selectedId={selectedEmail?.id || null}
              onSelect={setSelectedEmail}
              analyses={analyses}
              isLoading={isSyncing && emails.length === 0}
            />
          </section>

          {/* MIDDLE: Advanced summary workspace (5 col) */}
          <section className="lg:col-span-4.5 xl:col-span-5 space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <span className="font-serif font-bold text-xs text-[#C5A059] uppercase tracking-[0.15em]">Executive Intelligence Workspace</span>
              {selectedEmail && (
                <span className="text-[10px] font-mono text-white/40">
                  ID: {selectedEmail.id.substring(0, 8)}
                </span>
              )}
            </div>

            <EmailDetail 
              email={selectedEmail}
              analysis={selectedEmail ? (analyses[selectedEmail.id] || null) : null}
              onSaveDraft={handleSaveDraft}
              isSavingDraft={selectedEmail ? (analyses[selectedEmail.id]?.draftStatus === 'Created in Gmail Drafts' ? false : isSyncing) : false}
              onReanalyze={runEmailAnalysis}
              isReanalyzing={selectedEmail ? isAnalyzingId === selectedEmail.id : false}
            />
          </section>

          {/* RIGHT: Tasks Detected Checklist & Alerts panel (3 col) */}
          <section className="lg:col-span-3.5 xl:col-span-3 space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <span className="font-serif font-bold text-xs text-[#C5A059] uppercase tracking-[0.15em]">Cognitive Intelligence Alerts</span>
            </div>

            <AlertsPanel 
              tasks={tasks}
              onToggleTask={handleToggleTask}
              followUps={followUps}
              onCreateFollowUpDraft={handleCreateFollowUpDraft}
              isDraftingFollowUp={isDraftingFollowUpId}
            />
          </section>

        </div>
      </main>

      {/* 3. Daily Executive Report Modal */}
      <AnimatePresence>
        {isDigestOpen && (
          <DailyDigestModal 
            isOpen={isDigestOpen}
            onClose={() => setIsDigestOpen(false)}
            digest={digest}
            isLoading={isGeneratingDigest}
          />
        )}
      </AnimatePresence>

      {/* Footer credits bar */}
      <footer className="border-t border-white/10 bg-[#0F0F0F] py-3.5 px-6 flex items-center justify-between text-[10px] text-white/30 font-mono select-none">
        <span>GMAIL CHIEF-OF-STAFF V2.5</span>
        <span className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-[#C5A059]" /> solankisideline@gmail.com
        </span>
      </footer>

    </div>
  );
}
