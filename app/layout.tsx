import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Passive Biometric Auth Prototype',
  description: 'Real-time security verification with Supabase & Vercel'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
