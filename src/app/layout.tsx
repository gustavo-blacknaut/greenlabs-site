import type { Metadata, Viewport } from 'next';
import '@/app/globals.css';
import { sans } from '@/lib/fonts';
import { cn } from '@/lib/utils';

const SITE = 'https://labs.greencodes.com.br';
const DESCRICAO =
  'Transmita sua tela e faça chamadas no seu próprio servidor. Sem conta, sem limite de tempo.';

export const metadata: Metadata = {
  title: {
    default: 'GreenLabs - sua tela ao vivo, sem conta',
    template: '%s · GreenLabs',
  },
  description: DESCRICAO,
  applicationName: 'GreenLabs',
  metadataBase: new URL(SITE),
  manifest: '/manifest.json',

  icons: {
    icon: [
      { url: '/images/logo-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/images/logo-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/images/logo-180.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/images/logo-192.png',
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GreenLabs',
  },

  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: SITE,
    siteName: 'GreenLabs',
    title: 'GreenLabs - sua tela ao vivo, sem conta',
    description: DESCRICAO,
    images: [{ url: '/images/logo-512.png', width: 512, height: 512, alt: 'GreenLabs' }],
  },

  twitter: {
    card: 'summary',
    title: 'GreenLabs',
    description: DESCRICAO,
    images: ['/images/logo-512.png'],
  },

  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#050505',
  width: 'device-width',
  initialScale: 1,
  // A chamada ocupa a tela toda; o zoom por pinça atrapalha mais do que ajuda.
  // O zoom do navegador (acessibilidade) continua funcionando.
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={cn('min-h-screen bg-background antialiased', sans.variable)}>
        {children}
      </body>
    </html>
  );
}
