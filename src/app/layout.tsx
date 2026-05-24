import type { Metadata } from 'next'
import './globals.css'
import { ScrollToTopOnRouteChange } from '@/components/ScrollToTopOnRouteChange'

export const metadata: Metadata = {
  title: 'ShowTELA',
  description: 'Operational continuity feed for live productions',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang='en'><body><ScrollToTopOnRouteChange />{children}</body></html>
}
