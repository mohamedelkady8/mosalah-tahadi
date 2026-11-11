import type { Metadata } from 'next';
import { PRIVATE_META } from '@/lib/site';
import { QuickView } from './QuickView';

export const metadata: Metadata = { title: 'ع السريع', ...PRIVATE_META };

export default function QuickPage() {
  return <QuickView />;
}
