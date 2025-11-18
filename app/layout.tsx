import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Външен дълг на България в реално време',
  description: 'Проследяване на външния дълг на България с данни от World Bank Open Data',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="bg">
      <body>{children}</body>
    </html>
  )
}

