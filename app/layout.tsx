import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Content Gift — 特典コンテンツAI設計ツール',
  description: 'リスト獲得・セミナー特典の高品質コンテンツをAIで自動生成',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
