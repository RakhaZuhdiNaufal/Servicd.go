'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';

export function ServiceGoAuthLottie({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<any>(null);
  const prevSignUpRef = useRef<boolean | null>(null);
  const pathname = usePathname();
  const isSignUp = Boolean(pathname?.includes('/register'));

  function initPlayer() {
    const lottie = (window as any).lottie;
    if (!lottie || !containerRef.current || animRef.current) return;

    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: false,
      path: '/lottie/servicego-auth-lottie.json',
    });

    animRef.current = anim;
    anim.addEventListener('DOMLoaded', () => {
      anim.playSegments(
        isSignUp ? [[120, 155], [155, 245]] : [[0, 30], [30, 120]],
        true
      );
      prevSignUpRef.current = isSignUp;
    });
  }

  useEffect(() => {
    if ((window as any).lottie) initPlayer();
    return () => {
      animRef.current?.destroy();
      animRef.current = null;
      prevSignUpRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!animRef.current || prevSignUpRef.current === null || prevSignUpRef.current === isSignUp) {
      return;
    }
    animRef.current.playSegments(
      isSignUp ? [[120, 155], [155, 245]] : [[245, 280], [30, 120]],
      true
    );
    prevSignUpRef.current = isSignUp;
  }, [isSignUp]);

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"
        strategy="afterInteractive"
        onLoad={initPlayer}
      />
      <div
        ref={containerRef}
        aria-label="Ilustrasi animasi ServiceGo"
        className={`h-full w-full max-w-[720px] ${className}`}
      />
    </>
  );
}