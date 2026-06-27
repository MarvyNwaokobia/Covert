import type { Metadata } from 'next'
import '@rainbow-me/rainbowkit/styles.css'
import './globals.css'
import { Providers } from '@/providers/Providers'
import { Navbar } from '@/components/layout/Navbar'

export const metadata: Metadata = {
  title: 'Covert — Confidential Payroll',
  description: 'FHE-powered compensation infrastructure for DAOs and crypto-native teams.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-bg-base text-text-primary flex flex-col">
        <Providers>
          <Navbar />
          <div className="flex-1">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
