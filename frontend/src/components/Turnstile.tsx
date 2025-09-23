'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window { turnstile?: any }
}

interface Props {
  siteKey: string;
  onVerify: (token: string) => void;
}

export default function Turnstile({ siteKey, onVerify }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const render = () => {
      if (!window.turnstile || !ref.current) return;
      window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token: string) => onVerify(token),
        'error-callback': () => onVerify(''),
        'expired-callback': () => onVerify('')
      });
    };

    if (!window.turnstile) {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__tscb';
      s.async = true;
      // @ts-ignore
      window.__tscb = render;
      document.head.appendChild(s);
    } else {
      render();
    }
  }, [siteKey, onVerify]);

  return <div ref={ref} className="mt-2" />;
}

