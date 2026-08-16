import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Extraordinary CV — Every job deserves its own CV.',
  description: 'AI-powered CV builder for Ghanaian professionals. Generate, edit and download a professional CV in seconds.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
