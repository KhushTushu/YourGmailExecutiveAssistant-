/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EmailCategory =
  | 'Business'
  | 'Career'
  | 'Education'
  | 'Finance'
  | 'Personal'
  | 'Marketing'
  | 'Spam';

export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export interface AttachmentInfo {
  name: string;
  mimeType: string;
  size: number;
  id: string;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromName: string;
  fromEmail: string;
  date: string;
  snippet: string;
  body: string;
  attachments: AttachmentInfo[];
}

export interface AttachmentAnalysis {
  name: string;
  documentType: string;
  summary: string;
  requiredAction: string;
}

export interface EmailAnalysis {
  messageId: string;
  category: EmailCategory;
  priority: PriorityLevel;
  purpose: string;
  keyPoints: string[];
  actionRequired: string;
  deadline: string | null;
  replyNeeded: boolean;
  replyRationale: string;
  suggestedReply: string;
  draftStatus: 'Ready for Review' | 'Created in Gmail Drafts';
  draftId?: string | null;
  attachments: AttachmentAnalysis[];
}

export interface DetectedTask {
  id: string;
  task: string;
  deadline: string;
  priority: PriorityLevel;
  suggestedAction: string;
  sourceMessageId: string;
  sourceSubject: string;
  completed: boolean;
}

export interface FollowUpThread {
  threadId: string;
  subject: string;
  recipient: string;
  lastMessageDate: string;
  elapsedDays: number;
  status: 'Pending 2 Days Follow-Up' | 'Pending 5 Days Follow-Up' | 'Alert User (7+ Days)';
  draftCreated: boolean;
}

export interface DailyDigest {
  totalEmails: number;
  importantEmails: number;
  pendingReplies: number;
  newOpportunities: number;
  upcomingDeadlines: number;
  criticalTasks: number;
  recommendedActions: string[];
}
