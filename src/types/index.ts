export type MainTab = 'home' | 'opportunities' | 'chats' | 'profile';
export type TopTab = 'opportunities' | 'help' | 'academy';
export type AcademyTab = 'schedules' | 'payslips' | 'calendar' | 'student-card' | 'leave' | 'learning';

export interface Post {
  id: string;
  author: string;
  avatar: string;
  role: string;
  content: string;
  time: string;
  likes: number;
  comments: number;
  liked: boolean;
}

export interface Opportunity {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  stipend: string;
  deadline: string;
  tags: string[];
  logo: string;
  salary?: string;
  closing_date?: string;
  description?: string;
  image?: string;
  company_name?: string;
  province?: { id: number; name: string; code?: string };
  has_applied?: boolean;
  opportunity_type_id?: number;
}

export interface Schedule {
  id: string;
  subject: string;
  facilitator: string;
  date: string;
  time: string;
  venue: string;
  status: 'upcoming' | 'today' | 'completed';
}

export interface Payslip {
  id: string;
  month: string;
  gross: number;
  deductions: number;
  net: number;
  paid: boolean;
}

export interface LeaveRequest {
  id: string;
  type: string;
  from: string;
  to: string;
  days: number;
  status: 'approved' | 'pending' | 'rejected';
  reason: string;
}

export interface ChatThread {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
}
