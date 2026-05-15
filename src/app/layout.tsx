import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'QDS API - Vivo Docs Reader',
  description: 'API service for reading vivo documents',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}