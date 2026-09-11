import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '모의투자 | 우리들의 주식 리그',
  description: '고등학생을 위한 실전형 주식 모의투자 앱',
};

export const viewport: Viewport = {
  themeColor: '#0b0e13',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
