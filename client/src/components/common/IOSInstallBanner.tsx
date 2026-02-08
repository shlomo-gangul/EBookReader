import { useState, useEffect } from 'react';
import { Share, X } from 'lucide-react';

const IOS_BANNER_DISMISSED_KEY = 'ios_install_banner_dismissed';

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  const isStandalone = ('standalone' in window.navigator) && !(window.navigator as { standalone?: boolean }).standalone;
  return isIOS && isSafari && isStandalone;
}

export function IOSInstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIOSSafari()) return;

    const dismissed = localStorage.getItem(IOS_BANNER_DISMISSED_KEY);
    if (dismissed) return;

    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(IOS_BANNER_DISMISSED_KEY, '1');
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-slate-800 border-t border-slate-700 shadow-2xl animate-slide-up">
      <div className="flex items-start gap-3 max-w-lg mx-auto">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <Share className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-100">
            Install BookReader
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Tap the <Share className="w-3 h-3 inline-block mx-0.5" /> Share button, then "Add to Home Screen" for the best reading experience.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
