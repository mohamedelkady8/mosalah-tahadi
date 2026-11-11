'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type ToastFn = (message: string) => void;

const ToastContext = createContext<ToastFn>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback<ToastFn>((m) => {
    setMessage(m);
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 2600);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={`toast${visible ? ' show' : ''}`} role="status" aria-live="polite">
        {message}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/** Shows a toast once on mount, e.g. for messages passed through the URL after a redirect. */
export function FlashToast({ message }: { message?: string | null }) {
  const toast = useToast();
  useEffect(() => {
    if (message) toast(message);
  }, [message, toast]);
  return null;
}
