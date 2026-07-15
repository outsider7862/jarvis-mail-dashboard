export type Category =
  | 'business_lead' | 'invoice' | 'meeting'
  | 'customer_support' | 'newsletter' | 'spam'
  | 'phishing' | 'personal' | 'other'

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
  confidence: number
  status: 'new' | 'read' | 'actioned' | 'dismissed'
  should_notify: boolean
  created_at: string
  received_at: string | null
}

export interface RawEmail {
  sender: string | null
  subject: string | null
  body_text: string | null
  received_at: string | null
}

export interface ConnectedAccountInfo {
  provider: string
  email_address: string
  active: boolean
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
}

export interface MorningBrief {
  business_leads: number
  invoices: number
  meetings_today: number
  follow_ups: number
  possible_phishing: number
  estimated_minutes: number
}
