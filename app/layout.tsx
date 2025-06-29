import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Data Alchemist - AI Resource Allocation Configurator',
  description: 'Transform your messy spreadsheets into clean, validated data with AI-powered insights and business rules configuration.',
  keywords: ['data processing', 'AI', 'resource allocation', 'spreadsheet', 'validation'],
  authors: [{ name: 'Data Alchemist Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3B82F6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-inter antialiased bg-gradient-to-br from-gray-50 via-white to-blue-50/30 min-h-screen">
        <div className="relative">
          {/* Background gradient overlay */}
          <div className="fixed inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-indigo-50/20 pointer-events-none" />
          
          {/* Content */}
          <div className="relative z-10">
            {children}
          </div>
        </div>
        
        <Toaster 
          position="bottom-right" 
          toastOptions={{
            style: {
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(229, 231, 235, 0.6)',
              borderRadius: '12px',
            },
          }}
        />
      </body>
    </html>
  );
}