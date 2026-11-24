import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  KeyRound,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import type {
  ApiCredentialItem,
  ApiCredentialKey,
  EmailLogRecord,
  GatewayVerificationResult,
  RegionCode,
} from '../types.ts';

export const EmailsResendPanel: React.FC<{
  authToken: string;
}> = ({ authToken }) => {
  const [emails, setEmails] = useState<EmailLogRecord[]>([]);
  const [resendInfo, setResendInfo] = useState<{ configured: boolean; label: string }>({
    configured: false,
    label: 'Resend Transactional Email',
  });
  const [testTo, setTestTo] = useState('');
  const [testRegion, setTestRegion] = useState<RegionCode>('no');
  const [testType, setTestType] = useState<'order_confirmation' | 'shipping_tracking' | 'review_request'>(
    'order_confirmation'
  );
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [previewEmail, setPreviewEmail] = useState<EmailLogRecord | null>(null);

  const loadEmails = useCallback(async () => {
    const res = await fetch('/api/admin/emails', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.emails)) setEmails(data.emails);
      if (data.resend) setResendInfo(data.resend);
    }
  }, [authToken]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/emails/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          to: testTo.trim(),
          regionCode: testRegion,
          templateType: testType,
        }),
      });
      const data = await res.json();
      if (res.ok && data.emailLog) {
        setFeedback(
          `Dispatched ${testType.replace('_', ' ')} (${testRegion.toUpperCase()}) -> Status: ${data.emailLog.status}`
        );
        await loadEmails();
      } else {
        setFeedback(data.error || 'Could not dispatch test email.');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 text-xs">
      <div className="border-b border-neutral-200 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold uppercase tracking-wide flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#142B4E]" />
            <span>Resend Transactional Emails & Localized Templates (EN / NO / IT / VN)</span>
          </h1>
          <p className="text-neutral-500 mt-0.5">
            Automatically dispatches regional order confirmations at checkout and DHL tracking notices upon dispatch.
          </p>
        </div>
        <span
          className={`px-3 py-1.5 border font-semibold uppercase text-[11px] ${
            resendInfo.configured
              ? 'bg-[#4F8A47]/15 border-[#4F8A47]/40 text-[#2E5D28]'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          {resendInfo.configured ? 'Resend API Key Live' : 'Sandbox Preview Mode (Add RESEND_API_KEY in API Vault)'}
        </span>
      </div>

      {/* Send Localized Test Email */}
      <form
        onSubmit={handleSendTest}
        className="border border-neutral-200 bg-white p-5 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
      >
        <div className="md:col-span-4">
          <label htmlFor="resend-test-to" className="block text-[11px] text-neutral-500 mb-1">
            Recipient Email *
          </label>
          <input
            id="resend-test-to"
            type="email"
            required
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="customer@example.com"
            className="w-full px-3 py-2 border border-neutral-300"
          />
        </div>
        <div className="md:col-span-3">
          <label htmlFor="resend-test-region" className="block text-[11px] text-neutral-500 mb-1">
            Template Language / Region
          </label>
          <select
            id="resend-test-region"
            value={testRegion}
            onChange={(e) => setTestRegion(e.target.value as RegionCode)}
            className="w-full px-3 py-2 border border-neutral-300 bg-white"
          >
            <option value="en">EN · English (USD)</option>
            <option value="no">NO · Norsk (NOK)</option>
            <option value="it">IT · Italiano (EUR)</option>
            <option value="vn">VN · Tiếng Việt (VND)</option>
          </select>
        </div>
        <div className="md:col-span-3">
          <label htmlFor="resend-test-type" className="block text-[11px] text-neutral-500 mb-1">
            Email Template
          </label>
          <select
            id="resend-test-type"
            value={testType}
            onChange={(e) =>
              setTestType(
                e.target.value as 'order_confirmation' | 'shipping_tracking' | 'review_request'
              )
            }
            className="w-full px-3 py-2 border border-neutral-300 bg-white"
          >
            <option value="order_confirmation">Order Confirmation</option>
            <option value="shipping_tracking">DHL Shipping Tracking</option>
            <option value="review_request">Verified Purchaser Review Request</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={sending}
            className="w-full py-2 px-3 bg-[#142B4E] hover:bg-[#0f213d] text-white uppercase tracking-wider font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sending ? 'Sending...' : 'Send Test'}</span>
          </button>
        </div>
      </form>

      {feedback && (
        <div className="p-3 bg-[#F4F8F4] border border-[#4F8A47]/40 text-[#2E5D28] font-medium">
          {feedback}
        </div>
      )}

      {/* Email Logs Table */}
      <div className="border border-neutral-200 bg-white overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F7F7F7] border-b border-neutral-200 text-neutral-600 uppercase text-[11px]">
            <tr>
              <th className="p-3">Order #</th>
              <th className="p-3">Template</th>
              <th className="p-3">Lang</th>
              <th className="p-3">Recipient & Subject</th>
              <th className="p-3">Delivery</th>
              <th className="p-3 text-right">Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {emails.map((em) => (
              <tr key={em.id} className="hover:bg-neutral-50">
                <td className="p-3 font-mono-tabular font-semibold">{em.order_number}</td>
                <td className="p-3 uppercase text-[11px]">{em.template_type.replace('_', ' ')}</td>
                <td className="p-3 uppercase font-mono-tabular">{em.region_code}</td>
                <td className="p-3">
                  <div className="font-medium text-[#1A1A1A]">{em.subject}</div>
                  <div className="text-[11px] text-neutral-500">{em.recipient_email}</div>
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 text-[10px] uppercase font-semibold ${
                      em.status === 'sent'
                        ? 'bg-[#4F8A47]/15 text-[#2E5D28]'
                        : em.status === 'error'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {em.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => setPreviewEmail(em)}
                    className="px-2.5 py-1 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E] hover:text-white inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View HTML</span>
                  </button>
                </td>
              </tr>
            ))}
            {emails.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-neutral-400">
                  No transactional emails logged yet. Send a test email above or place an order.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Sandboxed HTML Email Preview Modal */}
      {previewEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/55" onClick={() => setPreviewEmail(null)} />
          <div className="relative w-full max-w-3xl bg-white border border-black/20 shadow-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
              <div>
                <div className="font-semibold text-sm">{previewEmail.subject}</div>
                <div className="text-[11px] text-neutral-500">
                  To: {previewEmail.recipient_email} · Region: {previewEmail.region_code.toUpperCase()} · Status: {previewEmail.status}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewEmail(null)}
                aria-label="Close email preview"
                className="p-1 text-neutral-500 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <iframe
              title="Localized Email Template Preview"
              sandbox=""
              srcDoc={previewEmail.html_preview}
              className="w-full h-[480px] border border-neutral-200 bg-[#F5F7FA]"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const GROUP_TITLES: Record<ApiCredentialItem['group'], string> = {
  auth: 'Google / Gmail Client Login OAuth',
  payments: 'Payment Gateways (Vipps, PayPal, Stripe)',
  email: 'Resend Transactional Email API',
  commerce: 'Wix E-Commerce OAuth & Mailchimp Newsletter',
  logistics: 'DHL Express Shipping API',
  analytics: 'Live Visitor GeoIP Lookup',
  ai: 'AI Concierge (Gemini / OpenAI)',
};

export const ApiVaultAndOnboardingPanel: React.FC<{
  authToken: string;
  googleCallbackUrl?: string;
  onRefreshSettings: () => void;
}> = ({ authToken, googleCallbackUrl: serverCallbackUrl, onRefreshSettings }) => {
  const [credentials, setCredentials] = useState<ApiCredentialItem[]>([]);
  const [draftValues, setDraftValues] = useState<Partial<Record<ApiCredentialKey, string>>>({});
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verifyResults, setVerifyResults] = useState<Record<string, GatewayVerificationResult>>({});
  const [wixPopupUrl, setWixPopupUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedUri, setCopiedUri] = useState(false);

  const loadCredentials = useCallback(async () => {
    const res = await fetch('/api/admin/credentials', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.credentials)) setCredentials(data.credentials);
    }
  }, [authToken]);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  const handleSaveVault = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<Record<ApiCredentialKey, string | null>> = {};
    for (const [k, v] of Object.entries(draftValues)) {
      if (v && v.trim()) {
        payload[k as ApiCredentialKey] = v.trim();
      }
    }
    if (Object.keys(payload).length === 0) {
      setFeedback('Enter at least one new API key to save.');
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/credentials', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ credentials: payload }),
      });
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data.credentials)) setCredentials(data.credentials);
        setDraftValues({});
        setFeedback('API Vault updated cleanly in SQLite.');
        onRefreshSettings();
      } else {
        setFeedback(data.error || 'Could not update credentials.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClearKey = async (key: ApiCredentialKey) => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/credentials', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ credentials: { [key]: null } }),
      });
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data.credentials)) setCredentials(data.credentials);
        setDraftValues((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setFeedback(`Removed stored key for ${key}.`);
        onRefreshSettings();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyProvider = async (provider: string) => {
    setVerifying(provider);
    try {
      const res = await fetch(`/api/admin/integrations/${provider}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && data.result) {
        setVerifyResults((prev) => ({ ...prev, [provider]: data.result }));
      }
    } finally {
      setVerifying(null);
    }
  };

  const handleGenerateWixAuthUrl = async () => {
    const res = await fetch('/api/admin/integrations/wix/auth-url', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (data.authUrl) {
      setWixPopupUrl(data.authUrl);
    } else {
      setFeedback(data.error || 'Add WIX_CLIENT_ID in the API Vault below first.');
    }
  };

  const groups: ApiCredentialItem['group'][] = [
    'auth',
    'payments',
    'email',
    'commerce',
    'logistics',
    'analytics',
    'ai',
  ];

  const googleCallbackUrl =
    serverCallbackUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/api/auth/google/callback`
      : '/api/auth/google/callback');

  const onboardingProviders = [
    {
      id: 'google',
      title: 'Google / Gmail Client OAuth',
      desc: `Enables "Continue with Gmail" customer login + automatic Mailchimp audience sync. Authorized Redirect URI: ${googleCallbackUrl}`,
    },
    {
      id: 'vipps',
      title: 'Vipps MobilePay (Norway)',
      desc: 'Verifies Vipps Access Token + enables Checkout Shipping Prefill (name, email, phone, Oslo address).',
    },
    {
      id: 'paypal',
      title: 'PayPal Commerce Onboarding',
      desc: 'Validates PayPal REST OAuth2 Client ID & Secret via api-m.paypal.com / sandbox.',
    },
    {
      id: 'stripe',
      title: 'Stripe Connect & Cards',
      desc: 'Verifies Stripe /v1/account onboarding capabilities (cards, charges, payouts).',
    },
    {
      id: 'wix',
      title: 'Wix Store OAuth Onboarding',
      desc: 'Connects Wix Client ID & Secret or launches interactive Wix App OAuth Consent URL.',
    },
    {
      id: 'resend',
      title: 'Resend Multi-Language Email',
      desc: 'Verifies RESEND_API_KEY & verified sending domain for EN/NO/IT/VN order receipts.',
    },
  ];

  return (
    <div className="space-y-6 text-xs">
      <div className="border-b border-neutral-200 pb-3">
        <h1 className="text-base font-semibold uppercase tracking-wide flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#142B4E]" />
          <span>Owner API Vault & Gateway Onboarding (Gmail · PayPal · Stripe · Vipps · Wix · Resend)</span>
        </h1>
        <p className="text-neutral-500 mt-0.5">
          Add, update, or remove environment keys directly from Admin. Values are stored server-side and masked immediately after saving.
        </p>
      </div>

      {feedback && (
        <div className="p-3 bg-[#F4F8F4] border border-[#4F8A47]/40 text-[#2E5D28] font-medium">
          {feedback}
        </div>
      )}

      {/* Custom Domain Google OAuth Redirect URI Guidance */}
      <div className="border border-[#142B4E]/25 bg-[#F8FAFC] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="font-semibold text-[#142B4E] uppercase tracking-wider text-[11px]">
            Active Google OAuth Authorized Redirect URI (Server-Resolved)
          </div>
          <div className="font-mono-tabular text-[11px] bg-white border border-neutral-200 px-2.5 py-1.5 break-all">
            {googleCallbackUrl}
          </div>
          <p className="text-[11px] text-neutral-600">
            On a custom DigitalOcean / Nginx server, set <strong className="font-mono-tabular">PUBLIC_DOMAIN_URL</strong> below (e.g. <span className="font-mono-tabular">https://montenapoleone1974.com</span>) so OAuth always uses your live domain instead of a preview host.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
              navigator.clipboard.writeText(googleCallbackUrl).catch(() => {});
            }
            setCopiedUri(true);
            setTimeout(() => setCopiedUri(false), 2000);
          }}
          className="px-3.5 py-2 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E] hover:text-white text-[11px] uppercase tracking-wider shrink-0 cursor-pointer transition-colors"
        >
          {copiedUri ? 'Copied URI' : 'Copy Callback URI'}
        </button>
      </div>

      {/* Onboarding & Live Gateway Connection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {onboardingProviders.map((prov) => {
          const result = verifyResults[prov.id];
          return (
            <div key={prov.id} className="border border-neutral-200 bg-white p-4 flex flex-col justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#142B4E]">{prov.title}</span>
                  {result && (
                    <span
                      className={`px-2 py-0.5 text-[10px] uppercase font-semibold ${
                        result.ok
                          ? 'bg-[#4F8A47]/15 text-[#2E5D28]'
                          : result.mode === 'error'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {result.mode.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed">{prov.desc}</p>
                {result && (
                  <div className="p-2 bg-[#FAFAFA] border border-neutral-200 text-[11px] text-neutral-700">
                    {result.message}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={verifying === prov.id}
                  onClick={() => handleVerifyProvider(prov.id)}
                  className="px-3 py-1.5 bg-[#142B4E] hover:bg-[#0f213d] text-white text-[11px] uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {verifying === prov.id ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3 h-3" />
                  )}
                  <span>{verifying === prov.id ? 'Checking...' : 'Verify / Onboard'}</span>
                </button>

                {prov.id === 'wix' && (
                  <button
                    type="button"
                    onClick={handleGenerateWixAuthUrl}
                    className="px-3 py-1.5 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E]/5 text-[11px] uppercase tracking-wider cursor-pointer"
                  >
                    Connect Wix OAuth
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {wixPopupUrl && (
        <div className="p-4 border border-[#142B4E]/30 bg-[#F7F9FC] flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-[#142B4E]">Wix OAuth Consent URL Ready</div>
            <div className="text-[11px] text-neutral-600 font-mono-tabular break-all mt-0.5">
              {wixPopupUrl}
            </div>
          </div>
          <a
            href={wixPopupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-[#142B4E] text-white text-[11px] uppercase tracking-wider inline-flex items-center gap-1.5"
          >
            <span>Open Wix Installer</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Owner Env & API Key Editor */}
      <form onSubmit={handleSaveVault} className="space-y-5">
        {groups.map((grp) => {
          const items = credentials.filter((c) => c.group === grp);
          if (items.length === 0) return null;
          return (
            <div key={grp} className="border border-neutral-200 bg-white p-5 space-y-3">
              <div className="font-semibold uppercase tracking-wider text-[#142B4E] border-b border-neutral-100 pb-2">
                {GROUP_TITLES[grp]}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item) => (
                  <div key={item.key} className="p-3 border border-neutral-200 bg-[#FAFAFA] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-[#1A1A1A]">{item.label}</div>
                        <div className="text-[10px] font-mono-tabular text-neutral-500">{item.key}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] uppercase font-semibold ${
                          item.configured
                            ? 'bg-[#4F8A47]/15 text-[#2E5D28]'
                            : 'bg-neutral-200 text-neutral-600'
                        }`}
                      >
                        {item.source === 'vault'
                          ? 'Stored in Vault'
                          : item.source === 'env'
                          ? 'From .env'
                          : 'Not Set'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type={item.secret ? 'password' : 'text'}
                        aria-label={`Value for ${item.key}`}
                        value={draftValues[item.key] ?? ''}
                        onChange={(e) =>
                          setDraftValues((prev) => ({ ...prev, [item.key]: e.target.value }))
                        }
                        placeholder={
                          item.configured
                            ? `Saved (${item.maskedValue}) — enter new value to replace`
                            : 'Enter key or credential...'
                        }
                        className="flex-1 px-2.5 py-1.5 border border-neutral-300 bg-white font-mono-tabular text-[11px] outline-none focus:border-[#142B4E]"
                      />
                      {item.source === 'vault' && (
                        <button
                          type="button"
                          onClick={() => handleClearKey(item.key)}
                          aria-label={`Remove ${item.key}`}
                          title="Remove stored key from Vault"
                          className="p-1.5 border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#142B4E] hover:bg-[#0f213d] text-white uppercase tracking-wider font-medium inline-flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{saving ? 'Saving Vault...' : 'Save API Credentials to Vault'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
