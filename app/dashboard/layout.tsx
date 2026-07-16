import { AuthGuard } from '@/components/AuthGuard'
import { ProfileGate } from '@/components/ProfileGate'
import { DashboardShell } from '@/components/DashboardShell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ProfileGate>
        <DashboardShell>{children}</DashboardShell>
      </ProfileGate>
    </AuthGuard>
  )
}
