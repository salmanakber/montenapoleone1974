import React, { useEffect, useState } from 'react';
import { Mail, Sparkles, X } from 'lucide-react';
import type { AuthUser, CustomerAuthPublicConfig, RegionCode } from '../types.ts';

interface GmailLoginCornerPopupProps {
  regionCode: RegionCode;
  customerAuthConfig: CustomerAuthPublicConfig;
  authUser: AuthUser | null;
  onOpenAccount: () => void;
}

const DISMISS_STORAGE_KEY = 'mn_corner_gmail_dismissed_v1';

export const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-8.97Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
    />
  </svg>
);

export const GmailLoginCornerPopup: React.FC<GmailLoginCornerPopupProps> = ({
  regionCode,
  customerAuthConfig,
  authUser,
  onOpenAccount,
}) => {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return window.sessionStorage.getItem(DISMISS_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (
      !customerAuthConfig.googleLoginEnabled ||
      !customerAuthConfig.showCornerPopup ||
      authUser ||
      dismissed
    ) {
      setVisible(false);
      return;
    }
    const delayMs = Math.max(0, Number(customerAuthConfig.cornerPopupDelaySeconds || 2)) * 1000;
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [
    customerAuthConfig.googleLoginEnabled,
    customerAuthConfig.showCornerPopup,
    customerAuthConfig.cornerPopupDelaySeconds,
    authUser,
    dismissed,
  ]);

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    try {
      window.sessionStorage.setItem(DISMISS_STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const subFlag = customerAuthConfig.autoSubscribeMailchimp ? '1' : '0';
      const res = await fetch(
        `/api/auth/google/url?region=${encodeURIComponent(regionCode)}&subscribe=${subFlag}`
      );
      const data = await res.json();
      if (!res.ok || !data.url) {
        setErrorMsg(
          data.error ||
            'Google sign-in is not active yet. Add Google OAuth keys in Admin or sign in with email.'
        );
        return;
      }
      const popup = window.open(
        data.url,
        'mn_google_oauth',
        'width=540,height=660,menubar=no,toolbar=no,location=yes,status=no'
      );
      if (!popup) {
        setErrorMsg('Popup was blocked by your browser. Please allow popups or sign in via My Account.');
      }
    } catch {
      setErrorMsg('Unable to start Gmail sign-in right now.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible || authUser) return null;

  return (
    <aside
      data-testid="gmail-corner-popup"
      role="dialog"
      aria-label="Sign in with Gmail"
      className="fixed top-20 right-4 z-30 w-[320px] max-w-[calc(100vw-2rem)] bg-white text-[#1A1A1A] border border-black/15 shadow-2xl p-4"
    >
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-black/10">
        <div className="flex items-center gap-2">
          <GoogleIcon className="w-4 h-4 shrink-0" />
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#142B4E] font-semibold">
              Monte Napoleone 1974
            </div>
            <div className="text-xs font-medium text-[#1A1A1A] leading-tight">
              Sign in with your Gmail
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss Gmail sign-in popup"
          className="p-1 text-neutral-400 hover:text-black cursor-pointer -mr-1 -mt-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="mt-2.5 text-[11px] leading-relaxed text-neutral-600">
        Access faster tailoring checkout, live DHL tracking, and personal sizing across sessions.
      </p>

      {customerAuthConfig.autoSubscribeMailchimp && (
        <div className="mt-2 px-2.5 py-1.5 bg-[#F4F6F9] border border-[#142B4E]/15 text-[10px] text-[#142B4E] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>Auto-subscribes to Mailchimp VIP &amp; unlocks 10% welcome code (MONTE10).</span>
        </div>
      )}

      {errorMsg && (
        <div className="mt-2.5 p-2 bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-snug">
          {errorMsg}
        </div>
      )}

      <div className="mt-3 space-y-2">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-2.5 px-3 bg-white hover:bg-neutral-50 border border-black/20 text-[#1A1A1A] text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
        >
          <GoogleIcon className="w-4 h-4" />
          <span>{loading ? 'Connecting...' : 'Continue with Gmail'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            handleDismiss();
            onOpenAccount();
          }}
          className="w-full py-1.5 text-[11px] text-neutral-600 hover:text-[#142B4E] inline-flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Mail className="w-3 h-3" />
          <span>Or sign in with Email &amp; Password</span>
        </button>
      </div>
    </aside>
  );
};
