/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));

// Initialise Gemini SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper: Get Gmail auth header
const getGmailAuthHeaders = (req: express.Request) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }
  return { Authorization: authHeader };
};

// Help parsing base64 url
function decodeBase64Url(base64Url: string): string {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  try {
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch (e) {
    console.error('Failed to decode base64 body', e);
    return '';
  }
}

// Help parsing message body recursively
function findPartByMimeType(parts: any[], mimeType: string): any {
  for (const part of parts) {
    if (part.mimeType === mimeType) {
      return part;
    }
    if (part.parts) {
      const subPart = findPartByMimeType(part.parts, mimeType);
      if (subPart) return subPart;
    }
  }
  return null;
}

function getMessageBody(payload: any): string {
  if (!payload) return '';
  if (payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    const htmlPart = findPartByMimeType(payload.parts, 'text/html');
    if (htmlPart && htmlPart.body && htmlPart.body.data) {
      return decodeBase64Url(htmlPart.body.data);
    }
    const plainPart = findPartByMimeType(payload.parts, 'text/plain');
    if (plainPart && plainPart.body && plainPart.body.data) {
      return decodeBase64Url(plainPart.body.data);
    }
    for (const part of payload.parts) {
      const body = getMessageBody(part);
      if (body) return body;
    }
  }
  return '';
}

// Help extracting attachments
function getAttachments(payload: any): any[] {
  const list: any[] = [];
  function traverse(part: any) {
    if (part.filename && part.body && part.body.attachmentId) {
      list.push({
        id: part.body.attachmentId,
        name: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0,
      });
    }
    if (part.parts) {
      for (const sub of part.parts) {
        traverse(sub);
      }
    }
  }
  if (payload) {
    traverse(payload);
  }
  return list;
}

// REST endpoints
// 1. Fetch user profile from Google / Gmail
app.get('/api/gmail/profile', async (req, res) => {
  try {
    const headers = getGmailAuthHeaders(req);
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers,
    });
    if (!response.ok) {
      throw new Error(`Gmail API returned status ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching Gmail profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Fetch list of recent email messages
app.get('/api/gmail/messages', async (req, res) => {
  try {
    const headers = getGmailAuthHeaders(req);
    const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string) : 20;
    
    // Fetch individual messages list
    const listResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=label:INBOX`,
      { headers }
    );
    if (!listResponse.ok) {
      throw new Error(`Gmail API messages list returned status ${listResponse.status}`);
    }
    const listData = await listResponse.json();
    
    if (!listData.messages || listData.messages.length === 0) {
      return res.json({ messages: [] });
    }

    // Resolve detailed message contents in parallel
    const detailPromises = listData.messages.map(async (msg: { id: string }) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          { headers }
        );
        if (!detailRes.ok) return null;
        const detail = await detailRes.json();
        
        // Parse headers
        const headersList = detail.payload?.headers || [];
        const subject = headersList.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
        const fromRaw = headersList.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
        const date = headersList.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';
        
        let fromName = fromRaw;
        let fromEmail = fromRaw;
        const match = fromRaw.match(/(.*)<(.*)>/);
        if (match) {
          fromName = match[1].trim().replace(/^["']|["']$/g, '');
          fromEmail = match[2].trim();
        }

        const body = getMessageBody(detail.payload);
        const attachments = getAttachments(detail.payload);

        return {
          id: detail.id,
          threadId: detail.threadId,
          subject,
          from: fromRaw,
          fromName,
          fromEmail,
          date,
          snippet: detail.snippet || '',
          body,
          attachments,
        };
      } catch (err) {
        console.error(`Error resolving message ${msg.id}:`, err);
        return null;
      }
    });

    const detailedMessages = (await Promise.all(detailPromises)).filter(Boolean);
    res.json({ messages: detailedMessages });
  } catch (error: any) {
    console.error('Error listing Gmail messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Create Draft in Gmail
app.post('/api/gmail/drafts', async (req, res) => {
  try {
    const headers = getGmailAuthHeaders(req);
    const { to, subject, body, threadId } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Missing to, subject or body in draft creation request' });
    }

    // Build RFC 2822 email message
    let rawMessage = `To: ${to}\r\n`;
    rawMessage += `Subject: ${subject}\r\n`;
    if (threadId) {
      rawMessage += `In-Reply-To: ${threadId}\r\n`;
      rawMessage += `References: ${threadId}\r\n`;
    }
    rawMessage += `Content-Type: text/html; charset=utf-8\r\n\r\n`;
    
    // Replace newlines with <br/> for html formatting, matching standard editor format
    const htmlBody = body.replace(/\n/g, '<br/>');
    rawMessage += htmlBody;

    // Base64URL encode raw message
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const draftResource: any = {
      message: {
        raw: encodedMessage,
      },
    };

    if (threadId) {
      draftResource.message.threadId = threadId;
    }

    const draftResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(draftResource),
    });

    if (!draftResponse.ok) {
      const errText = await draftResponse.text();
      throw new Error(`Gmail API Draft creation failed with status ${draftResponse.status}: ${errText}`);
    }

    const draftData = await draftResponse.json();
    res.json(draftData);
  } catch (error: any) {
    console.error('Error creating Gmail draft:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Analyze email using Gemini API
app.post('/api/analyze-email', async (req, res) => {
  try {
    const { from, subject, date, snippet, body, attachments } = req.body;

    if (!from || !subject) {
      return res.status(400).json({ error: 'Missing required email detail for analysis' });
    }

    const systemPrompt = `You are an advanced, context-aware Gmail Executive Assistant AI Agent. 
Your objective is to analyze incoming emails, understand context, prioritize, summarize, detect tasks/deadlines, and generate high-quality drafts.
You must return your response in direct JSON format matching the schema rules requested. Do not wrap in markdown or anything.

Rules:
1. Categorization:
   - Client communication, contracts, invoices, partnerships -> 'Business'
   - Job apps, interviews, internships -> 'Career'
   - Universities, admissions, visas, tuition, scholarships -> 'Education'
   - Payments, banking, invoices, taxes -> 'Finance'
   - Friends, family, social -> 'Personal'
   - Promotions, newsletters, ads -> 'Marketing'
   - Low relevance, spam, unwanted -> 'Spam'

2. Priority Score:
   - Critical: deadlines within 48h, client complaints, urgent admissions demands, interview invitations.
   - High: business contracts, partnership bids, scholarship opportunities, education (visas, admissions, missing registration sheets). Essential rule: ALL Education emails (except general ads) must be 'High' priority.
   - Medium: general enquiries, standard communication.
   - Low: marketing, digests, alerts.

3. Executive Summary Format:
   - Keep "purpose" strictly as a single sentence describing the key reason the email was sent.
   - Provide 2-3 precise bullet points for "keyPoints".
   - Under "actionRequired" describe precisely what the user must do.
   - Detect "deadline" in ISO or human format (like "2026-06-15" or "ASAP" or "None"). If no deadline is detected, return null.

4. Deciding Reply:
   - Decide if replyNeeded is true or false. Under replyRationale explain in short sentences why.
   - If replyNeeded is true, generate a professional, context-aware, concise suggestedReply draft. If not needed, write a warm optional acknowledgement draft just in case.

5. Attachment Analysis:
   - If attachments exist, generate detailed analysis array with fields: name, documentType (e.g. Invoice, Contract, University Letter, Visa Notice, ID Certificate), summary, requiredAction.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Please analyze the following incoming email:
      
Sender: ${from}
Subject: ${subject}
Date: ${date}
Snippet: ${snippet}
Body: 
${body}

Attachments List: ${JSON.stringify(attachments || [])}
`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { 
              type: Type.STRING, 
              description: 'Must stand as: Business, Career, Education, Finance, Personal, Marketing, or Spam' 
            },
            priority: { 
              type: Type.STRING, 
              description: 'Must stand as: Critical, High, Medium, or Low' 
            },
            purpose: { type: Type.STRING, description: 'Single sentence overview' },
            keyPoints: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: 'Array of key takeaway bullet points'
            },
            actionRequired: { type: Type.STRING },
            deadline: { type: Type.STRING, description: 'Detected deadline or empty string if none' },
            replyNeeded: { type: Type.BOOLEAN },
            replyRationale: { type: Type.STRING },
            suggestedReply: { type: Type.STRING, description: 'Ready-to-use mail reply body in HTML format' },
            attachments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  documentType: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  requiredAction: { type: Type.STRING },
                },
                required: ['name', 'documentType', 'summary', 'requiredAction'],
              },
            },
          },
          required: [
            'category',
            'priority',
            'purpose',
            'keyPoints',
            'actionRequired',
            'replyNeeded',
            'replyRationale',
            'suggestedReply',
            'attachments',
          ],
        },
      },
    });

    const contentText = response.text || '{}';
    res.json(JSON.parse(contentText));
  } catch (error: any) {
    console.error('Error in agent analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Build Daily Report from analyzed emails
app.post('/api/daily-report', async (req, res) => {
  try {
    const { analyzedEmails } = req.body;

    if (!analyzedEmails || !Array.isArray(analyzedEmails)) {
      return res.status(400).json({ error: 'Missing analyzed emails array' });
    }

    const sysPrompt = `You are a professional executive chief-of-staff AI. 
Assemble a concise, neat daily email report from the provided email summaries. 
Return as a strict JSON structure matching the requested schema.`;

    const summaryData = analyzedEmails.map((email: any) => ({
      from: email.from,
      subject: email.subject,
      category: email.category,
      priority: email.priority,
      purpose: email.purpose,
      deadline: email.deadline,
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Generate a Daily Email Report for the following processed items:
${JSON.stringify(summaryData)}
`,
      config: {
        systemInstruction: sysPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            totalEmails: { type: Type.INTEGER },
            importantEmails: { type: Type.INTEGER },
            pendingReplies: { type: Type.INTEGER },
            newOpportunities: { type: Type.INTEGER },
            upcomingDeadlines: { type: Type.INTEGER },
            criticalTasks: { type: Type.INTEGER },
            recommendedActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Numbered action items'
            },
          },
          required: [
            'totalEmails',
            'importantEmails',
            'pendingReplies',
            'newOpportunities',
            'upcomingDeadlines',
            'criticalTasks',
            'recommendedActions',
          ],
        },
      },
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error('Error compiling daily report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Vite server integration in dev or static files serving in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
