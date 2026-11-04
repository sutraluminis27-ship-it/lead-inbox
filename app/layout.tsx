import './globals.css';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-serif' });
const sans = Manrope({ subsets: ['latin'], variable: '--font-sans' });
export const metadata = { title: 'Sutra Email Tracker', description: 'Sutra Luminis lead tracking' };
export default function Root({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body className={`${serif.variable} ${sans.variable}`}>{children}</body></html>);
}
