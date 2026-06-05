import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PortfolioAI — Autonomous DeFi Agent',
  description: 'Set once. Rebalance forever. Powered by MetaMask Smart Accounts, Venice AI, and 1Shot.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&family=JetBrains+Mono:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-text font-body antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}