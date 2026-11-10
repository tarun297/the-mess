import '@fontsource/archivo-black/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata = {
  title: 'THE MESS. · IIIT Bhubaneswar',
  description: 'Menus, weekly coupons, check-in and feedback for the IIIT Bhubaneswar messes.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'THE MESS.', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/app-180.png' },
};
export const viewport = { themeColor: '#FBF3E6', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
