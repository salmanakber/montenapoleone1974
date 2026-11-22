import React, { useEffect, useState } from 'react';
import { CheckCircle2, Gift, Sparkles, X } from 'lucide-react';
import type { PromotionPopupSettings, RegionCode } from '../types.ts';
import type { RegionCopy } from '../i18n/translations.ts';

interface FirstOrderPopupProps {
  regionCode: RegionCode;
  copy: RegionCopy;
  promoRules: PromotionPopupSettings;
  onCodeUnlocked: (code: string) => void;
}

export const FirstOrderPopup: React.FC<FirstOrderPopupProps> = ({
  regionCode,
  copy,
  promoRules,
  onCodeUnlocked,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unlockedCode, setUnlockedCode] = useState<string | null>(null);
  const [syncLabel, setSyncLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!promoRules.popupEnabled || promoRules.delaySeconds <= 0) return;
    const alreadySeen = window.sessionStorage?.getItem('mn_promo_seen');
    if (alreadySeen) return;
    const timer = window.setTimeout(() => {
      setModalOpen(true);
      try {
        window.sessionStorage?.setItem('mn_promo_seen', '1');
      } catch {
        // ignore
      }
    }, promoRules.delaySeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [promoRules.popupEnabled, promoRules.delaySeconds]);

  if (!promoRules.popupEnabled) return null;

  const title =
    (promoRules[`title_${regionCode}` as keyof PromotionPopupSettings] as string) ||
    promoRules.title_en;
  const subtitle =
    (promoRules[`subtitle_${regionCode}` as keyof PromotionPopupSettings] as string) ||
    promoRules.subtitle_en;
  const buttonLabel =
    (promoRules[`button_${regionCode}` as keyof PromotionPopupSettings] as string) ||
    promoRules.button_en;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setErrorMsg(null);
    setBusy(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, regionCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not subscribe email.');
        return;
      }
      const code = String(data.discountCode || promoRules.discountCode || 'MONTE10');
      setUnlockedCode(code);
      setSyncLabel(data.mailchimpStatus === 'synced' ? 'Mailchimp Live Synced' : 'Mailchimp Audience Queued');
      onCodeUnlocked(code);
    } catch {
      setErrorMsg('Network error subscribing to offer.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {promoRules.showFloatingButton && (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-label={title}
          className="fixed bottom-[70px] left-3.5 lg:bottom-3.5 lg:left-3.5 z-30 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#142B4E] hover:bg-[#0f213d] text-white shadow-lg border border-white/15 text-[10px] font-medium uppercase tracking-[0.12em] transition-transform hover:scale-[1.02] cursor-pointer"
        >
          <Gift className="w-3.5 h-3.5 text-[#FFCC00]" />
          <span>{copy.promo.floatingTrigger}</span>
        </button>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-label={title}
        >
          <div
            className="fixed inset-0 bg-black/55 backdrop-blur-[1px]"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white text-[#1A1A1A] border border-black/15 shadow-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-12">
            <div className="hidden sm:block sm:col-span-5 bg-[#E6E6E6]">
              <img
                src="/src/assets/images/editorial_tailoring_guide_1795248294030.jpg"
                alt="Monte Napoleone 1974 Offer"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="sm:col-span-7 p-6 sm:p-7 relative flex flex-col justify-center space-y-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label={copy.promo.close}
                className="absolute top-3 right-3 p-1.5 text-neutral-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-[10px] uppercase tracking-[0.2em] text-[#142B4E] font-semibold">
                MONTE NAPOLEONE 1974 · TREVISO
              </div>

              <h2 className="text-lg sm:text-xl font-semibold tracking-wide uppercase leading-snug">
                {title}
              </h2>

              <p className="text-xs text-neutral-600 leading-relaxed">{subtitle}</p>

              {unlockedCode ? (
                <div className="p-4 bg-[#F7F7F7] border border-[#4F8A47]/40 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-[#4F8A47] font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{copy.promo.successPrefix}</span>
                  </div>
                  <div className="py-2 px-3 bg-white border border-black/15 text-center font-mono-tabular text-base font-bold tracking-[0.2em] text-[#142B4E]">
                    {unlockedCode}
                  </div>
                  <div className="text-[11px] text-neutral-500 flex items-center justify-between">
                    <span>{copy.promo.firstOrderNote}</span>
                    {syncLabel && (
                      <span className="inline-flex items-center gap-1 text-[#142B4E]">
                        <Sparkles className="w-3 h-3" /> {syncLabel}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={copy.promo.emailPlaceholder}
                    className="w-full px-3.5 py-2.5 text-xs border border-black/20 focus:border-[#142B4E] outline-none"
                  />
                  {errorMsg && <div className="text-xs text-red-600">{errorMsg}</div>}
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-3 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-[0.16em] font-medium transition-colors cursor-pointer"
                  >
                    {busy ? copy.promo.submitting : buttonLabel}
                  </button>
                  {promoRules.firstOrderOnly && (
                    <p className="text-[10px] text-neutral-500 text-center">
                      {copy.promo.firstOrderNote}
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
