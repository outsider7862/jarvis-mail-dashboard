import { AuthGuard } from '@/components/AuthGuard'
import { ProfileGate } from '@/components/ProfileGate'
import { Sidebar } from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ProfileGate>
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
          <Sidebar />
          <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {children}
          </main>
        </div>
      </ProfileGate>
    </AuthGuard>
  )
}
