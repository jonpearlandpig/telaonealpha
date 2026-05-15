import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'ShowTELA',
  description: 'Operational continuity feed for live productions',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang='en'><body className={geist.variable}>{children}</body></html>
}
