import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'ReachInbox Email Scheduler · BullMQ & Ethereal SMTP',
  description: 'Production-grade distributed email job scheduler powered by BullMQ, Redis, Ethereal SMTP, rate limiting, and real-time dashboard.',
  openGraph: {
    title: 'ReachInbox Email Scheduler · BullMQ & Ethereal SMTP',
    description: 'Production-grade distributed email job scheduler powered by BullMQ, Redis, Ethereal SMTP, rate limiting, and real-time dashboard.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReachInbox Email Scheduler · BullMQ & Ethereal SMTP',
    description: 'Production-grade distributed email job scheduler powered by BullMQ, Redis, Ethereal SMTP, rate limiting, and real-time dashboard.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
