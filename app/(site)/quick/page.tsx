import type { Metadata } from 'next';
import { QuickView } from './QuickView';

export const metadata: Metadata = { title: 'ع السريع' };

export default function QuickPage() {
  return <QuickView />;
}
