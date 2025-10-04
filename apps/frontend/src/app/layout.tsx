import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { SocketProvider } from '@/lib/contexts/SocketContext';
import { ToastProvider } from '@/lib/contexts/ToastContext';

export const metadata: Metadata = {
  title: 'Livestream Platform',
  description: 'Professional livestreaming platform with real-time chat and analytics',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <ToastProvider>
          <AuthProvider>
            <SocketProvider>
              {children}
            </SocketProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
