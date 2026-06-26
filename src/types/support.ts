/**
 * Support Drawer Type Definitions
 * AI-powered support chat with escalation to human coordinators
 */

import type { Conversation } from './chat';

/**
 * AI chat message in the support drawer
 */
export interface AISupportMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  quickReplies?: string[];
  metadata?: {
    topic?: string;
    confidence?: number;
    suggestedEscalation?: boolean;
  };
}

/**
 * Support agent viewing the ticket
 */
export interface SupportAgent {
  id: number;
  firstName: string;
  lastName: string;
  avatar?: string;
  isViewing: boolean;
  viewingSince?: string;
}

/**
 * Quick action button in the support drawer
 */
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  message: string;
  category: 'academy' | 'opportunities' | 'profile' | 'technical' | 'leave';
}

/**
 * FAQ item for fast responses
 */
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category: string;
}

/**
 * Request to AI chat endpoint
 */
export interface AIChatRequest {
  message: string;
  session_id?: string;
}

/**
 * Response from AI chat endpoint
 */
export interface AIChatResponse {
  session_id: string;
  message: string;
  quick_replies?: string[];
  suggest_escalation?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Request to escalate to human support
 */
export interface EscalationRequest {
  session_id: string;
  summary: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * WebSocket event for support agent viewing
 */
export interface SupportViewingEvent {
  ticket_id: number;
  is_viewing: boolean;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    avatar?: string;
  } | null;
  timestamp: string;
}

/**
 * Drawer mode - AI chat or human support
 */
export type DrawerMode = 'ai' | 'human';

/**
 * Default quick actions for the support drawer
 */
export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'lms-access',
    label: 'LMS Access',
    icon: 'GraduationCap',
    message: 'How do I access the LMS and complete my courses?',
    category: 'academy',
  },
  {
    id: 'check-in',
    label: 'Check In',
    icon: 'MapPin',
    message: 'How do I check in at my training venue?',
    category: 'academy',
  },
  {
    id: 'opportunities',
    label: 'Opportunities',
    icon: 'Briefcase',
    message: 'How do I apply for job opportunities?',
    category: 'opportunities',
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: 'User',
    message: 'How do I update my profile and upload documents?',
    category: 'profile',
  },
  {
    id: 'leave',
    label: 'Leave',
    icon: 'CalendarOff',
    message: 'How do I apply for leave?',
    category: 'leave',
  },
  {
    id: 'technical',
    label: 'Technical Help',
    icon: 'Settings',
    message: "I'm having a technical issue with the app",
    category: 'technical',
  },
];
