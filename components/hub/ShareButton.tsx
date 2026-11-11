'use client';

import { CopyIcon, ShareIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';

/** Opens the phone's share sheet when there is one, otherwise copies the text. `copy` always copies. */
export function ShareButton({
  text,
  label,
  copy = false,
  className = 'btn btn-ghost',
  title,
}: {
  text: string;
  label: string;
  copy?: boolean;
  className?: string;
  /** For an icon-only button with no label. */
  title?: string;
}) {
  const toast = useToast();

  async function run() {
    if (!copy && typeof navigator.share === 'function') {
      try {
        await navigator.share({ text });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast(copy ? 'اتنسخ.' : 'اتنسخ! ابعته لصحابك أو حطه على الجروب.');
    } catch {
      toast('معرفناش ننسخه، علّم عليه وانسخه بإيدك.');
    }
  }

  return (
    <button type="button" className={className} onClick={run} title={title} aria-label={label ? undefined : title}>
      {copy ? <CopyIcon size={label ? 18 : 16} /> : <ShareIcon size={label ? 18 : 16} />}
      {label && ` ${label}`}
    </button>
  );
}
