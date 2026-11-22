import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  MessageSquare,
  Send,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AiAgentAction,
  AiChatMessage,
  AiPublicConfig,
  Product,
  RegionCode,
  RegionConfig,
} from '../types.ts';
import type { RegionCopy } from '../i18n/translations.ts';
import { formatRegionalPrice } from '../utils/commerce.ts';

interface AiConciergeWidgetProps {
  region: RegionConfig;
  copy: RegionCopy;
  aiConfig: AiPublicConfig;
  products: Product[];
  hasFloatingPromoLeft: boolean;
  onExecuteAction: (action: AiAgentAction) => void;
  onOpenProduct: (slug: string) => void;
  onQuickAddToBag: (product: Product, size?: string, fit?: 'Slim Fit' | 'Regular Fit' | 'Contemporary Fit') => void;
}

export const AiConciergeWidget: React.FC<AiConciergeWidgetProps> = ({
  region,
  copy,
  aiConfig,
  products,
  hasFloatingPromoLeft,
  onExecuteAction,
  onOpenProduct,
  onQuickAddToBag,
}) => {
  const [panelOpen, setPanelOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy, panelOpen]);

  if (!aiConfig.enabled) return null;

  const greeting =
    (aiConfig[`greeting_${region.code}` as keyof AiPublicConfig] as string) ||
    aiConfig.greeting_en;

  const sendMessage = async (promptText: string) => {
    const clean = promptText.trim();
    if (!clean || busy) return;

    setPanelOpen(true);
    setErrorMsg(null);
    const nextHistory: AiChatMessage[] = [...messages, { role: 'user', content: clean }];
    setMessages(nextHistory);
    setInput('');
    setBusy(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionCode: region.code,
          message: clean,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'AI service unavailable.');
        return;
      }

      const replyMsg: AiChatMessage = {
        role: 'assistant',
        content: String(data.reply || ''),
        recommendedProducts: Array.isArray(data.recommendedProducts) ? data.recommendedProducts : [],
        agentAction: data.agentAction || null,
      };
      setMessages((prev) => [...prev, replyMsg]);

      if (data.agentAction && aiConfig.displayMode === 'agent') {
        onExecuteAction(data.agentAction as AiAgentAction);
      }
    } catch {
      setErrorMsg('Unable to reach AI tailor agent.');
    } finally {
      setBusy(false);
    }
  };

  const renderConversationPanel = (className: string) => (
    <div
      className={`${className} flex flex-col bg-white/95 backdrop-blur-xl text-[#1A1A1A] border border-black/15 shadow-2xl rounded-2xl overflow-hidden`}
      role="dialog"
      aria-label="Monte Napoleone AI Tailor Concierge"
    >
      <div className="px-4 py-3 border-b border-black/10 flex items-center justify-between bg-[#142B4E] text-white">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-[#FFCC00] shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider truncate">
              {copy.ai.poweredByPrefix} · {region.name}
            </div>
            <div className="text-[10px] text-white/75 uppercase tracking-widest">
              {aiConfig.activeProvider === 'openai' ? 'OpenAI' : 'Gemini'} ·{' '}
              {aiConfig.displayMode === 'agent' ? 'Shopping Agent' : 'Atelier Chat'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setErrorMsg(null);
              }}
              aria-label={copy.ai.clearChat}
              className="p-1.5 text-white/70 hover:text-white cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            aria-label="Close AI Concierge"
            className="p-1.5 text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="p-4 space-y-3 overflow-y-auto max-h-[360px] text-xs">
        {messages.length === 0 && (
          <div className="p-3.5 bg-[#FAFAFA] border border-black/10 rounded-xl text-neutral-700 leading-relaxed">
            {greeting}
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] px-3.5 py-2.5 rounded-xl leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#142B4E] text-white'
                  : 'bg-[#F3F4F6] text-[#1A1A1A] border border-black/5'
              }`}
            >
              {msg.content}
            </div>

            {msg.role === 'assistant' &&
              msg.recommendedProducts &&
              msg.recommendedProducts.length > 0 && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  {msg.recommendedProducts.map((rp) => {
                    const fullProd = products.find((p) => p.slug === rp.slug);
                    return (
                      <div
                        key={rp.slug}
                        className="flex gap-2.5 p-2 bg-white border border-black/10 rounded-lg shadow-xs"
                      >
                        <img
                          src={rp.primary_image}
                          alt={rp.title}
                          referrerPolicy="no-referrer"
                          className="w-12 h-16 object-cover bg-[#E6E6E6] shrink-0 rounded"
                        />
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="text-[11px] font-medium uppercase truncate">
                              {rp.title}
                            </div>
                            <div className="text-[11px] font-mono-tabular text-neutral-600">
                              {formatRegionalPrice(rp.price, region.code)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => onOpenProduct(rp.slug)}
                              className="text-[10px] font-semibold uppercase tracking-wider text-[#142B4E] hover:underline cursor-pointer"
                            >
                              {copy.ai.viewShirt}
                            </button>
                            {fullProd && (
                              <button
                                type="button"
                                onClick={() => onQuickAddToBag(fullProd)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#142B4E] text-white text-[10px] uppercase tracking-wider rounded cursor-pointer"
                              >
                                <ShoppingBag className="w-2.5 h-2.5" />
                                <span>{copy.ai.addToBag}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        ))}

        {busy && (
          <div className="text-[11px] text-neutral-500 italic flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 text-[#142B4E]" />
            <span>{copy.ai.thinking}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-[11px]">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );

  // MODE 1: AUTONOMOUS SHOPPING AGENT — Transparent Glass Bottom Command / Search Bar
  if (aiConfig.displayMode === 'agent') {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100vw-2rem)] sm:w-[620px] max-w-[92vw]">
        {panelOpen && renderConversationPanel('mb-2.5 w-full')}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/75 hover:bg-white/90 focus-within:bg-white/95 backdrop-blur-md border border-black/15 shadow-2xl transition-all"
        >
          <button
            type="button"
            onClick={() => setPanelOpen((prev) => !prev)}
            aria-label="Toggle AI Tailor Agent"
            className="w-8 h-8 rounded-full bg-[#142B4E] text-white flex items-center justify-center shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#FFCC00]" />
          </button>
          <input
            type="text"
            value={input}
            onFocus={() => setPanelOpen(true)}
            onChange={(e) => setInput(e.target.value)}
            placeholder={copy.ai.agentPlaceholder}
            className="flex-1 bg-transparent text-xs text-[#1A1A1A] placeholder:text-neutral-600 outline-none min-w-0"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="px-3.5 py-1.5 rounded-full bg-[#142B4E] hover:bg-[#0f213d] disabled:opacity-50 text-white text-[11px] uppercase tracking-wider font-medium inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Send className="w-3 h-3" />
            <span className="hidden sm:inline">{copy.ai.askButton}</span>
          </button>
        </form>
      </div>
    );
  }

  // MODE 2: FLOATING CHATBOT BUBBLE (Left or Right configurable in Admin)
  const isLeft = aiConfig.bubblePosition === 'left';
  const posClasses = isLeft
    ? hasFloatingPromoLeft
      ? 'bottom-16 left-4 items-start'
      : 'bottom-4 left-4 items-start'
    : 'bottom-4 right-4 items-end';

  return (
    <div className={`fixed z-30 flex flex-col ${posClasses}`}>
      {panelOpen && (
        <div className="mb-2.5 w-[350px] sm:w-[390px] max-w-[calc(100vw-2rem)]">
          {renderConversationPanel('w-full')}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="mt-2 flex items-center gap-2 p-2 bg-white border border-black/15 rounded-xl shadow-lg"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={copy.ai.agentPlaceholder}
              className="flex-1 text-xs px-2 py-1.5 outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="px-3 py-1.5 bg-[#142B4E] text-white text-xs rounded-lg cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setPanelOpen((prev) => !prev)}
        aria-label="Open AI Concierge Chat"
        className="w-12 h-12 rounded-full bg-[#142B4E] hover:bg-[#0f213d] text-white shadow-2xl border border-white/20 flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
      >
        <MessageSquare className="w-5 h-5" />
      </button>
    </div>
  );
};
