export type Category =
  | 'business_lead' | 'invoice' | 'meeting'
  | 'customer_support' | 'newsletter' | 'spam'
  | 'phishing' | 'personal' | 'order' | 'otp'
  | 'security_alert' | 'other'

export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface EmailAnalysis {
  id: string
  category: Category
  priority: Priority
  summary: string
  action_required: string | null
  deadline: string | null
  is_business_lead: boolean
  is_invoice: boolean
  is_meeting: boolean
  is_customer_support: boolean
  is_newsletter: boolean
  is_spam: boolean
  is_phishing: boolean
  is_order: boolean
  is_otp: boolean
  is_security_alert: boolean
  confidence: number
  status: 'new' | 'read' | 'actioned' | 'dismissed'
  should_notify: boolean
  created_at: string
  received_at: string | null
  sender: string | null
  subject: string | null
}

export interface Attachment {
  name: string | null
  mime_type: string | null
  size: number | null
}

export interface RawEmail {
  sender: string | null
  subject: string | null
  body_text: string | null
  received_at: string | null
  thread_id: string | null
  message_id: string | null
  connected_email: string | null
  attachments: Attachment[]
}

export interface ConnectedAccountInfo {
  provider: string
  email_address: string
  active: boolean
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface DecisionAssistance {
  what_sender_wants: string
  available_options: string[]
  recommendation: string
  reasoning: string
  risks: string[] | null
}

export interface ReplyDraft {
  subject: string
  body: string
}

export interface UserProfile {
  display_name: string | null
  work_type: string | null
  email_use: string | null
  preferred_tone: string | null
  custom_instructions: string | null
  onboarding_complete: boolean
}

export interface Lead {
  id: string
  email_analysis_id: string
  client_name: string | null
  client_company: string | null
  contact_email: string | null
  service_requested: string | null
  budget_mentioned: string | null
  status: 'pending' | 'confirmed' | 'rejected'
  created_at: string
}

export interface MorningBrief {
  business_leads: number
  invoices: number
  meetings_today: number
  follow_ups: number
  possible_phishing: number
  personal: number
  estimated_minutes: number
}
