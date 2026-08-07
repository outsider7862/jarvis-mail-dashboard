import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Jarvis Mail',
  description: 'AI email assistant for service businesses',
}

// Runs before first paint so a light-mode user never flashes the dark default.
// Dark stays the default (no attribute); only light gets stamped on <html>.
const themeScript = `(function(){try{if(localStorage.getItem('jm-theme')==='light'){document.documentElement.setAttribute('data-theme','light')}}catch(e){}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
