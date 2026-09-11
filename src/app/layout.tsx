import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaSetup from '@/components/PwaSetup';

export const metadata: Metadata = {
  title: '모의투자 | 우리들의 주식 리그',
  description: '고등학생을 위한 실전형 주식 모의투자 앱',
  manifest: '/manifest.webmanifest',
  applicationName: '모의투자',
  appleWebApp: {
    capable: true,
    title: '모의투자',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#0b0e13',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen font-sans antialiased">
        {children}
        <PwaSetup />
      </body>
    </html>
  );
}
