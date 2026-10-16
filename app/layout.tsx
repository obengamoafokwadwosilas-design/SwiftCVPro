import type { Metadata } from 'next'
import './globals.css'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Remarkable CV — Every job deserves its own CV.',
  description: 'AI-powered CV builder for Ghanaian professionals. Generate, edit and download a professional CV in seconds.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
