'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'mi_install_dismissed';

/**
 * 서비스워커 등록 + 설치 안내 배너.
 *
 * 안드로이드/크롬은 beforeinstallprompt 로 설치 버튼을 띄울 수 있고,
 * iOS 사파리는 그 이벤트가 없어 공유 버튼으로 안내한다.
 */
export default function PwaSetup() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return; // 이미 앱으로 실행 중

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    const ua = window.navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    if (isIos && /safari/i.test(ua) && !/crios|fxios/i.test(ua)) setShowIosHint(true);

    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDeferred(null);
    setShowIosHint(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (!deferred && !showIosHint) return null;

  return (
    <div className="fixed inset-x-0 bottom-16 z-50 mx-auto max-w-md px-3 sm:bottom-4">
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-panel2 px-3 py-2.5 shadow-2xl">
        <img src="/icons/icon-192.png" alt="" className="h-9 w-9 rounded-lg" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">앱으로 설치하기</div>
          <div className="text-[11px] text-muted">
            {deferred ? '홈 화면에서 바로 열 수 있어요' : '공유 → "홈 화면에 추가"를 누르세요'}
          </div>
        </div>
        {deferred && (
          <button onClick={install} className="btn-primary !px-3 !py-1.5 !text-xs">
            설치
          </button>
        )}
        <button onClick={dismiss} className="px-1 text-muted hover:text-slate-200" aria-label="닫기">
          ✕
        </button>
      </div>
    </div>
  );
}
