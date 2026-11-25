import React, { useState } from 'react';
import type { RegionConfig } from '../types.ts';
import type { RegionCopy } from '../i18n/translations.ts';

interface FooterProps {
  region: RegionConfig;
  copy: RegionCopy;
  onNavigateB2B: () => void;
  onNavigateAccount: () => void;
  onNavigateAbout: () => void;
  onOpenSizeGuide: () => void;
  onPromoCodeUnlocked?: (code: string) => void;
  onPromoCodeAlreadyUsed?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  region,
  copy,
  onNavigateB2B,
  onNavigateAccount,
  onNavigateAbout,
  onOpenSizeGuide,
  onPromoCodeUnlocked,
  onPromoCodeAlreadyUsed,
}) => {
  const [email, setEmail] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, regionCode: region.code }),
      });
      const data = await res.json();
      if (res.ok) {
        try {
          const normalized = email.trim().toLowerCase();
          if (normalized.includes('@')) {
            window.localStorage.setItem('mn_cart_email', normalized);
          }
        } catch {
          // ignore
        }
        if (data.alreadyClaimedOrUsed) {
          setStatusMessage('First-order offer has already been used for this email.');
          onPromoCodeAlreadyUsed?.();
        } else {
          setStatusMessage(`Code: ${data.discountCode} (${data.discountPct || 10}% off)`);
          if (data.discountCode && onPromoCodeUnlocked) {
            onPromoCodeUnlocked(data.discountCode);
          }
        }
        setEmail('');
      } else {
        setStatusMessage(data.error || 'Subscription failed.');
      }
    } catch {
      setStatusMessage('Unable to subscribe right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-white border-t border-black/10 text-[#1A1A1A]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Column 1: About Us */}
          <div>
            <button
              type="button"
              onClick={onNavigateAbout}
              className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 hover:text-[#142B4E] mb-4 cursor-pointer text-left"
            >
              {copy.footer.aboutHeading} →
            </button>
            <p className="text-xs leading-relaxed text-neutral-600">{copy.footer.aboutText}</p>
          </div>

          {/* Column 2: Contact */}
          <div>
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 mb-4">
              {copy.footer.contactHeading}
            </h2>
            <a
              href="mailto:monte@montenapoleone1974.com"
              className="text-xs font-medium text-[#142B4E] hover:underline block mb-3"
            >
              monte@montenapoleone1974.com
            </a>
            <p className="text-xs leading-relaxed text-neutral-600">{copy.footer.contactNote}</p>
          </div>

          {/* Column 3: Address / Warehouse */}
          <div>
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 mb-4">
              {copy.footer.addressHeading}
            </h2>
            <p className="text-xs leading-relaxed text-neutral-600">
              GULBRANDSENS AGENCIES SHOWROOM
              <br />
              Maridalsveien 87, 0461 Oslo, Norway
              <br />
              <span className="text-neutral-500 mt-2 block">
                {region.warehouse_name}
              </span>
            </p>
          </div>

          {/* Column 4: Information (Matches montenapoleone1974.com links) */}
          <div>
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 mb-4">
              {copy.footer.infoHeading}
            </h2>
            <ul className="space-y-2 text-xs text-[#142B4E]">
              {copy.footer.infoLinks.map((label, idx) => {
                const href = copy.footer.infoUrls?.[idx];
                if (href) {
                  return (
                    <li key={label}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline text-left inline-block"
                      >
                        {label}
                      </a>
                    </li>
                  );
                }
                return (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={() => {
                        if (idx === 0 || idx === 1) onNavigateAccount();
                        else if (idx === 2) onNavigateB2B();
                        else onOpenSizeGuide();
                      }}
                      className="hover:underline text-left cursor-pointer"
                    >
                      {label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Column 5: Follow Us */}
          <div>
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 mb-4">
              {copy.footer.followHeading}
            </h2>
            <ul className="space-y-2 text-xs text-[#142B4E]">
              <li>
                <a
                  href="https://www.facebook.com/MonteNapoleoneShirts"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/montenapoleoneshirts/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter & Authentic Payment/DHL Logo Strip matching montenapoleone1974.com (No Stripe logo) */}
        <div className="mt-12 pt-8 border-t border-black/10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <form onSubmit={handleSubscribe} className="flex flex-wrap items-center gap-3">
            <label htmlFor="footer-newsletter" className="text-xs font-medium text-neutral-600">
              {copy.footer.newsletterLabel}
            </label>
            <input
              id="footer-newsletter"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={copy.footer.newsletterPlaceholder}
              className="border-b border-black/25 focus:border-[#142B4E] outline-none py-1.5 px-1 text-xs w-56 bg-transparent"
            />
            <button
              type="submit"
              disabled={submitting}
              className="text-xs font-medium text-[#142B4E] hover:underline uppercase tracking-wider cursor-pointer"
            >
              {copy.footer.send}
            </button>
            {statusMessage && (
              <span className="text-xs text-[#4F8A47] font-medium">{statusMessage}</span>
            )}
          </form>

          {/* Official Brand Payment & Carrier Logos (Vipps, PayPal, Klarna, VISA, MasterCard, DHL) */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-5" aria-label="Accepted payment and shipping partners">
            {/* Vipps (Official Orange) */}
            <span className="inline-flex items-center" title="Vipps">
              <svg viewBox="0 0 72 24" className="h-5 w-auto" role="img" aria-label="Vipps">
                <text
                  x="0"
                  y="18"
                  fill="#FF5B24"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight="800"
                  fontSize="18"
                  letterSpacing="-0.5"
                >
                  vipps
                </text>
              </svg>
            </span>

            {/* PayPal (Double-P Monogram + PayPal Wordmark) */}
            <span className="inline-flex items-center gap-1" title="PayPal">
              <svg viewBox="0 0 88 24" className="h-5 w-auto" role="img" aria-label="PayPal">
                <path d="M7.5 3h5.6c2.9 0 4.5 1.4 4.1 4-.5 3.2-2.7 4.7-5.6 4.7H9.8L8.8 18H5.4L7.5 3z" fill="#003087" />
                <path d="M10.4 7h4.5c2.2 0 3.6 1.1 3.2 3.3-.4 2.5-2.1 3.7-4.4 3.7h-1.8l-.8 5h-2.8L10.4 7z" fill="#0079C1" />
                <text
                  x="22"
                  y="16.5"
                  fill="#003087"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight="800"
                  fontSize="13.5"
                  fontStyle="italic"
                >
                  Pay
                </text>
                <text
                  x="46"
                  y="16.5"
                  fill="#0079C1"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight="800"
                  fontSize="13.5"
                  fontStyle="italic"
                >
                  Pal
                </text>
              </svg>
            </span>

            {/* Klarna. */}
            <span className="inline-flex items-center" title="Klarna">
              <svg viewBox="0 0 74 24" className="h-5 w-auto" role="img" aria-label="Klarna">
                <text
                  x="0"
                  y="17.5"
                  fill="#0B051D"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight="800"
                  fontSize="16"
                  letterSpacing="-0.5"
                >
                  Klarna.
                </text>
              </svg>
            </span>

            {/* VISA */}
            <span className="inline-flex items-center" title="VISA">
              <svg viewBox="0 0 58 24" className="h-5 w-auto" role="img" aria-label="VISA">
                <text
                  x="2"
                  y="18"
                  fill="#1A1F71"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight="900"
                  fontSize="17"
                  fontStyle="italic"
                  letterSpacing="0.5"
                >
                  VISA
                </text>
              </svg>
            </span>

            {/* MasterCard */}
            <span className="inline-flex items-center" title="MasterCard">
              <svg viewBox="0 0 46 28" className="h-6 w-auto" role="img" aria-label="MasterCard">
                <circle cx="16" cy="14" r="10.5" fill="#EB001B" />
                <circle cx="29" cy="14" r="10.5" fill="#F79E1B" fillOpacity="0.9" />
              </svg>
            </span>

            {/* DHL */}
            <span className="inline-flex items-center bg-[#FFCC00] px-2 py-0.5" title="DHL Express">
              <svg viewBox="0 0 64 20" className="h-4 w-auto" role="img" aria-label="DHL">
                <line x1="0" y1="6" x2="10" y2="6" stroke="#D40511" strokeWidth="1.5" />
                <line x1="0" y1="10" x2="8" y2="10" stroke="#D40511" strokeWidth="1.5" />
                <line x1="0" y1="14" x2="6" y2="14" stroke="#D40511" strokeWidth="1.5" />
                <text
                  x="11"
                  y="15"
                  fill="#D40511"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight="900"
                  fontSize="15"
                  fontStyle="italic"
                  letterSpacing="0.6"
                >
                  DHL
                </text>
                <line x1="52" y1="6" x2="64" y2="6" stroke="#D40511" strokeWidth="1.5" />
                <line x1="54" y1="10" x2="64" y2="10" stroke="#D40511" strokeWidth="1.5" />
                <line x1="56" y1="14" x2="64" y2="14" stroke="#D40511" strokeWidth="1.5" />
              </svg>
            </span>
          </div>
        </div>

        <p className="mt-8 text-center text-[11px] text-neutral-500">
          {copy.footer.cookieNotice} · © {new Date().getFullYear()} Monte Napoleone 1974
        </p>
      </div>
    </footer>
  );
};
