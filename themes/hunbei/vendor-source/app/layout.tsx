import type { Metadata } from 'next';
import './globals.css';
import './cover.css';
import './correspondence.css';
import './image-save.css';
import './arrows.css';
import './red-thread.css';
import './fusion.css';
import './thread-path.css';
import './dusk-ring.css';
import { wedding } from '@/lib/wedding';
export const metadata: Metadata = {
  icons: { icon: '/wedding2/favicon.svg' },
  title: '一线 · 同心｜汪家喆 & 朱敏的婚礼请柬',
  description: `把往后的日子，写成我们。${wedding.dateLong}，${wedding.lunar}，${wedding.welcome} 到场，${wedding.ceremony} 仪式。${wedding.address}。汪家喆与朱敏，诚邀你见证。`,
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
