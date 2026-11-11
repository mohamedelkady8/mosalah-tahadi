'use client';

import { useEffect } from 'react';
import { XIcon } from '@/components/ui/icons';

export function Modal({ title, onClose, children, width = 520 }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal card" style={{ maxWidth: width }}>
        <button type="button" className="icon-btn modal-close" onClick={onClose} aria-label="قفل">
          <XIcon size={18} />
        </button>
        <h2 style={{ fontSize: 22, marginBottom: 14, paddingInlineEnd: 44 }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
