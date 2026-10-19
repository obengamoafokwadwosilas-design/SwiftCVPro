import type { Metadata } from 'next'
import './globals.css'
import { SITE_URL } from '@/lib/site'
import { UI_FONTS_HREF } from '@/lib/fonts'
import FontStylesheet from '@/components/FontStylesheet'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Remarkable CV — Every job deserves its own CV.',
  description: 'AI-powered CV builder for Ghanaian professionals. Generate, edit and download a professional CV in seconds.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preload" as="style" href={UI_FONTS_HREF} />
      </head>
      <body>
        <FontStylesheet />
        {children}
      </body>
    </html>
  )
}
