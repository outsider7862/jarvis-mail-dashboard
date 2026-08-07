import { AuthGuard } from '@/components/AuthGuard'
import { ProfileGate } from '@/components/ProfileGate'
import { DashboardShell } from '@/components/DashboardShell'
import { ToastProvider } from '@/components/ui/Toast'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ProfileGate>
        <ToastProvider>
          <DashboardShell>{children}</DashboardShell>
        </ToastProvider>
      </ProfileGate>
    </AuthGuard>
  )
}
