'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TopBar } from '@/components/TopBar'
import { User, Mail } from 'lucide-react'

export default function SettingsPage() {
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email)
    })
  }, [])

  return (
    <>
      <TopBar title="Settings" />
      <div style={{ padding: '28px', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Account info */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Account</h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, color: '#fff',
            }}>
              {email ? email[0].toUpperCase() : '?'}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {email || 'Loading...'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Supabase Auth</p>
            </div>
          </div>
        </div>

        {/* Placeholder for connected inboxes — Phase 5 */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Connected Inboxes</h3>
          <div style={{
            padding: '20px', textAlign: 'center', borderRadius: 8,
            background: 'var(--bg-elevated)', border: '1px dashed var(--border)',
          }}>
            <Mail size={24} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Gmail/Outlook connection coming in the next phase.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
