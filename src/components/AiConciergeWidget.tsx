import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bot,
  MessageSquare,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Send,
  ShoppingBag,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type {
  AiAgentAction,
  AiChatMessage,
  AiPendingOffer,
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
  isProductPage?: boolean;
  cartCount?: number;
  cartSubtotal?: number;
  firstOrderEligible?: boolean;
  activePromoCode?: string;
  currentProductSlug?: string | null;
  onExecuteAction: (action: AiAgentAction) => void;
  onOpenProduct: (slug: string) => void;
  onQuickAddToBag: (
    product: Product,
    size?: string,
    fit?: 'Slim Fit' | 'Regular Fit' | 'Contemporary Fit'
  ) => void;
}

const REGION_SPEECH_LANG: Record<RegionCode, string> = {
  en: 'en-US',
  no: 'nb-NO',
  it: 'it-IT',
  vn: 'vi-VN',
};

function int16BufferToBase64(float32Input: Float32Array): string {
  const pcm = new Int16Array(float32Input.length);
  for (let i = 0; i < float32Input.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Input[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(pcm.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64PcmToFloat32(b64: string): Float32Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const pcm16 = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
  const out = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    out[i] = pcm16[i] / 32768;
  }
  return out;
}

export const AiConciergeWidget: React.FC<AiConciergeWidgetProps> = ({
  region,
  copy,
  aiConfig,
  products,
  hasFloatingPromoLeft,
  isProductPage = false,
  cartCount = 0,
  cartSubtotal = 0,
  firstOrderEligible = true,
  activePromoCode = '',
  currentProductSlug = null,
  onExecuteAction,
  onOpenProduct,
  onQuickAddToBag,
}) => {
  const [panelOpen, setPanelOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [pendingOffer, setPendingOffer] = useState<AiPendingOffer | null>(null);

  // Voice & Human Conversation State
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [liveState, setLiveState] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [liveMuted, setLiveMuted] = useState(false);
  const [liveStatusNote, setLiveStatusNote] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const speechRecRef = useRef<{ stop?: () => void } | null>(null);

  // Refs for Live API WebSocket & WebAudio contexts (prevent stale closures)
  const liveWsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const scriptProcRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const liveMutedRef = useRef<boolean>(false);

  useEffect(() => {
    liveMutedRef.current = liveMuted;
  }, [liveMuted]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy, panelOpen, liveState]);

  const stopSpeaking = useCallback(() => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
      audioElRef.current = null;
    }
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore
    }
    setIsSpeaking(false);
  }, []);

  const stopLiveCall = useCallback(() => {
    for (const src of scheduledSourcesRef.current) {
      try {
        src.stop();
      } catch {
        // ignore
      }
    }
    scheduledSourcesRef.current = [];
    nextStartTimeRef.current = 0;

    if (scriptProcRef.current) {
      try {
        scriptProcRef.current.disconnect();
      } catch {
        // ignore
      }
      scriptProcRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }
    if (liveWsRef.current) {
      try {
        liveWsRef.current.close();
      } catch {
        // ignore
      }
      liveWsRef.current = null;
    }
    setLiveState('idle');
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopLiveCall();
    };
  }, [stopSpeaking, stopLiveCall]);

  const speakWithBrowserFallback = useCallback(
    (text: string) => {
      try {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = REGION_SPEECH_LANG[region.code] || 'en-US';
        utter.rate = 0.98;
        utter.pitch = 0.96;
        utter.onstart = () => setIsSpeaking(true);
        utter.onend = () => setIsSpeaking(false);
        utter.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utter);
      } catch {
        setIsSpeaking(false);
      }
    },
    [region.code]
  );

  const speakText = useCallback(
    async (text: string, force = false) => {
      const clean = text.trim();
      if (!clean) return;
      if (!force && !autoSpeak) return;

      stopSpeaking();
      try {
        const res = await fetch('/api/ai/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: clean, regionCode: region.code }),
        });
        const data = (await res.json()) as {
          audioBase64?: string | null;
          mimeType?: string | null;
          fallbackBrowserSpeech?: boolean;
          error?: string;
        };
        if (res.ok && data.audioBase64) {
          const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
          audioElRef.current = audio;
          audio.onplay = () => setIsSpeaking(true);
          audio.onended = () => setIsSpeaking(false);
          audio.onerror = () => setIsSpeaking(false);
          await audio.play().catch(() => {
            setIsSpeaking(false);
          });
          return;
        }
        if (data.fallbackBrowserSpeech) {
          speakWithBrowserFallback(clean);
          return;
        }
        if (!res.ok) {
          speakWithBrowserFallback(clean);
        }
      } catch {
        speakWithBrowserFallback(clean);
      }
    },
    [autoSpeak, region.code, speakWithBrowserFallback, stopSpeaking]
  );

  if (!aiConfig.enabled) return null;

  const greeting =
    (aiConfig[`greeting_${region.code}` as keyof AiPublicConfig] as string) ||
    aiConfig.greeting_en;

  const sendMessage = async (promptText: string, speakResponseOverride?: boolean) => {
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
          cartQty: cartCount,
          cartSubtotal,
          firstOrderEligible,
          activePromoCode,
          currentProductSlug,
          pendingOffer,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'AI service unavailable.');
        return;
      }

      const nextPending = (data.pendingOffer as AiPendingOffer | null) || null;
      setPendingOffer(nextPending);

      const replyContent = String(data.reply || '');
      const replyMsg: AiChatMessage = {
        role: 'assistant',
        content: replyContent,
        recommendedProducts: Array.isArray(data.recommendedProducts) ? data.recommendedProducts : [],
        agentAction: data.agentAction || null,
        pendingOffer: nextPending,
        suggestedReplies: Array.isArray(data.suggestedReplies) ? data.suggestedReplies : [],
      };
      setMessages((prev) => [...prev, replyMsg]);

      if (data.agentAction && aiConfig.displayMode === 'agent') {
        onExecuteAction(data.agentAction as AiAgentAction);
      }

      if (speakResponseOverride ?? autoSpeak) {
        void speakText(replyContent, Boolean(speakResponseOverride));
      }
    } catch {
      setErrorMsg('Unable to reach AI tailor agent.');
    } finally {
      setBusy(false);
    }
  };

  // Push-to-Talk Microphone (Gemini Audio Transcription + Web Speech API fallback)
  const toggleMicRecording = async () => {
    setPanelOpen(true);
    setErrorMsg(null);

    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (speechRecRef.current?.stop) {
        speechRecRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    stopSpeaking();

    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            recordedChunksRef.current.push(ev.data);
          }
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const mimeType = recorder.mimeType || 'audio/webm';
          const blob = new Blob(recordedChunksRef.current, { type: mimeType });
          if (blob.size < 400) return;

          setBusy(true);
          try {
            const arrayBuf = await blob.arrayBuffer();
            const bytes = new Uint8Array(arrayBuf);
            let binary = '';
            const chunkSize = 0x8000;
            for (let i = 0; i < bytes.length; i += chunkSize) {
              binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
            }
            const audioBase64 = btoa(binary);
            const res = await fetch('/api/ai/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64, mimeType, regionCode: region.code }),
            });
            const data = (await res.json()) as {
              transcript?: string;
              noGeminiKey?: boolean;
              error?: string;
            };
            setBusy(false);
            if (res.ok && data.transcript) {
              void sendMessage(data.transcript, true);
              return;
            }
            if (!res.ok) {
              setErrorMsg(
                data.noGeminiKey
                  ? 'Server voice transcription requires GEMINI_API_KEY in Admin or browser Speech Recognition.'
                  : data.error || 'Could not transcribe voice note.'
              );
            }
          } catch {
            setBusy(false);
            setErrorMsg('Unable to transcribe audio recording.');
          }
        };

        recorder.start();
        setIsRecording(true);
        return;
      } catch {
        // Fall through to browser Web Speech Recognition if available
      }
    }

    const SpeechRecCtor =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (typeof SpeechRecCtor === 'function') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rec = new (SpeechRecCtor as any)();
        rec.lang = REGION_SPEECH_LANG[region.code] || 'en-US';
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (event: any) => {
          const transcript = String(event.results?.[0]?.[0]?.transcript || '').trim();
          setIsRecording(false);
          if (transcript) {
            void sendMessage(transcript, true);
          }
        };
        rec.onerror = () => {
          setIsRecording(false);
          setErrorMsg('Microphone permission denied or speech not detected.');
        };
        rec.onend = () => setIsRecording(false);
        speechRecRef.current = rec;
        rec.start();
        setIsRecording(true);
        return;
      } catch {
        // fall through
      }
    }

    setErrorMsg('Microphone access is unavailable in this browser. Type your message or enable mic access.');
  };

  // Real-Time Two-Way Human Voice Call via Gemini Live API WebSocket
  const startLiveVoiceCall = async () => {
    if (liveState !== 'idle') {
      stopLiveCall();
      return;
    }

    setPanelOpen(true);
    setErrorMsg(null);
    setLiveStatusNote(null);
    stopSpeaking();

    if (!navigator.mediaDevices?.getUserMedia) {
      setLiveStatusNote(
        'Live microphone capture is unavailable here — auto-speaking tailor replies enabled.'
      );
      void speakText(greeting, true);
      return;
    }

    setLiveState('connecting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(
        `${proto}//${window.location.host}/api/ai/live?region=${encodeURIComponent(region.code)}`
      );
      liveWsRef.current = ws;

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as {
            ready?: boolean;
            audio?: string;
            inputTranscript?: string;
            outputTranscript?: string;
            interrupted?: boolean;
            turnComplete?: boolean;
            agentAction?: AiAgentAction;
            error?: string;
            code?: string;
          };

          if (msg.ready) {
            setLiveState('connected');
            setLiveStatusNote('Connected live with Treviso Tailor — speak naturally anytime.');
          }

          if (msg.error) {
            setLiveStatusNote(msg.error);
            if (msg.code === 'NO_GEMINI_KEY') {
              void speakText(greeting, true);
            }
            stopLiveCall();
            return;
          }

          if (msg.interrupted) {
            for (const src of scheduledSourcesRef.current) {
              try {
                src.stop();
              } catch {
                // ignore
              }
            }
            scheduledSourcesRef.current = [];
            nextStartTimeRef.current = 0;
            setIsSpeaking(false);
          }

          if (msg.audio && outputAudioCtxRef.current) {
            const ctx = outputAudioCtxRef.current;
            const samples = base64PcmToFloat32(msg.audio);
            const buf = ctx.createBuffer(1, samples.length, 24000);
            buf.getChannelData(0).set(samples);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(ctx.destination);
            const startAt = Math.max(ctx.currentTime + 0.02, nextStartTimeRef.current);
            src.start(startAt);
            nextStartTimeRef.current = startAt + buf.duration;
            scheduledSourcesRef.current.push(src);
            setIsSpeaking(true);
            src.onended = () => {
              scheduledSourcesRef.current = scheduledSourcesRef.current.filter((s) => s !== src);
              if (scheduledSourcesRef.current.length === 0) {
                setIsSpeaking(false);
              }
            };
          }

          if (msg.inputTranscript) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === 'user') {
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: `${last.content} ${msg.inputTranscript}`.trim() },
                ];
              }
              return [...prev, { role: 'user', content: msg.inputTranscript! }];
            });
          }

          if (msg.outputTranscript) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant') {
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: `${last.content}${msg.outputTranscript}` },
                ];
              }
              return [...prev, { role: 'assistant', content: msg.outputTranscript! }];
            });
          }

          if (msg.agentAction && aiConfig.displayMode === 'agent') {
            onExecuteAction(msg.agentAction);
          }
        } catch {
          // ignore malformed frame
        }
      };

      ws.onopen = () => {
        const source = inputCtx.createMediaStreamSource(stream);
        const proc = inputCtx.createScriptProcessor(4096, 1, 1);
        scriptProcRef.current = proc;
        source.connect(proc);
        proc.connect(inputCtx.destination);
        proc.onaudioprocess = (audioEv) => {
          if (liveMutedRef.current) return;
          if (ws.readyState !== WebSocket.OPEN) return;
          const b64 = int16BufferToBase64(audioEv.inputBuffer.getChannelData(0));
          ws.send(JSON.stringify({ audio: b64 }));
        };
      };

      ws.onerror = () => {
        setLiveStatusNote('Could not connect live voice call — Push-to-Talk remains active.');
        stopLiveCall();
      };

      ws.onclose = () => {
        if (liveState !== 'idle') {
          stopLiveCall();
        }
      };
    } catch {
      setLiveStatusNote('Microphone permission denied for live call.');
      stopLiveCall();
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
            <div className="text-xs font-semibold uppercase tracking-wider truncate flex items-center gap-1.5">
              <span>{copy.ai.poweredByPrefix} · {region.name}</span>
              {isSpeaking && (
                <span className="inline-flex items-center gap-0.5 text-[9px] text-[#FFCC00] font-normal">
                  <span className="w-1 h-2 bg-[#FFCC00] animate-pulse" />
                  <span className="w-1 h-3 bg-[#FFCC00] animate-pulse" />
                  <span className="w-1 h-2 bg-[#FFCC00] animate-pulse" />
                </span>
              )}
            </div>
            <div className="text-[10px] text-white/75 uppercase tracking-widest">
              {liveState === 'connected'
                ? 'Live Voice Call Active'
                : aiConfig.displayMode === 'agent'
                ? 'Voice & Shopping Agent'
                : 'Voice Atelier Concierge'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-testid="ai-live-call-btn"
            onClick={startLiveVoiceCall}
            aria-label={liveState === 'idle' ? 'Start live voice call' : 'End live voice call'}
            title={liveState === 'idle' ? 'Talk live with Tailor' : 'Hang up voice call'}
            className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-wider font-medium inline-flex items-center gap-1 cursor-pointer transition-colors ${
              liveState !== 'idle'
                ? 'bg-emerald-500 text-white'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
          >
            {liveState !== 'idle' ? (
              <>
                <PhoneOff className="w-3 h-3" />
                <span>End</span>
              </>
            ) : (
              <>
                <Phone className="w-3 h-3" />
                <span>Talk Live</span>
              </>
            )}
          </button>

          <button
            type="button"
            data-testid="ai-voice-toggle-btn"
            onClick={() => {
              if (autoSpeak) stopSpeaking();
              setAutoSpeak((prev) => !prev);
            }}
            aria-label={autoSpeak ? 'Mute tailor voice replies' : 'Enable tailor voice replies'}
            title={autoSpeak ? 'Voice Replies ON' : 'Voice Replies Muted'}
            className="p-1.5 text-white/80 hover:text-white cursor-pointer"
          >
            {autoSpeak ? <Volume2 className="w-3.5 h-3.5 text-[#FFCC00]" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                setMessages([]);
                setPendingOffer(null);
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
            onClick={() => {
              stopSpeaking();
              stopLiveCall();
              setPanelOpen(false);
            }}
            aria-label="Close AI Concierge"
            className="p-1.5 text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Voice Call Banner */}
      {liveState !== 'idle' && (
        <div
          data-testid="ai-live-banner"
          className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between gap-2 text-xs text-emerald-900"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse shrink-0" />
            <span className="truncate font-medium">
              {liveState === 'connecting'
                ? 'Connecting live tailor audio...'
                : isSpeaking
                ? 'Master Tailor is speaking...'
                : 'Listening — speak naturally...'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setLiveMuted((m) => !m)}
              className="px-2.5 py-1 bg-white border border-emerald-300 rounded text-[10px] uppercase tracking-wider font-medium cursor-pointer inline-flex items-center gap-1"
            >
              {liveMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
              <span>{liveMuted ? 'Unmute' : 'Mute Mic'}</span>
            </button>
            <button
              type="button"
              onClick={stopLiveCall}
              className="px-2.5 py-1 bg-red-600 text-white rounded text-[10px] uppercase tracking-wider font-medium cursor-pointer"
            >
              Hang Up
            </button>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="p-4 space-y-3 overflow-y-auto max-h-[360px] text-xs">
        {messages.length === 0 && (
          <div className="p-3.5 bg-[#FAFAFA] border border-black/10 rounded-xl text-neutral-700 leading-relaxed flex items-start justify-between gap-3">
            <span>{greeting}</span>
            <button
              type="button"
              onClick={() => speakText(greeting, true)}
              aria-label="Listen to greeting"
              className="p-1.5 rounded-full bg-white border border-black/10 text-[#142B4E] hover:bg-[#142B4E] hover:text-white shrink-0 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {liveStatusNote && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-[11px]">
            {liveStatusNote}
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-end gap-1.5 max-w-[92%]">
              <div
                className={`px-3.5 py-2.5 rounded-xl leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#142B4E] text-white'
                    : 'bg-[#F3F4F6] text-[#1A1A1A] border border-black/5'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'assistant' && msg.content && (
                <button
                  type="button"
                  onClick={() => speakText(msg.content, true)}
                  aria-label="Speak response aloud"
                  title="Listen to Tailor"
                  className="p-1.5 rounded-full bg-[#F3F4F6] hover:bg-[#142B4E] text-[#142B4E] hover:text-white transition-colors shrink-0 cursor-pointer"
                >
                  <Volume2 className="w-3 h-3" />
                </button>
              )}
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
            {msg.role === 'assistant' &&
              msg.suggestedReplies &&
              msg.suggestedReplies.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {msg.suggestedReplies.map((sr) => (
                    <button
                      key={sr}
                      type="button"
                      onClick={() => sendMessage(sr)}
                      className="px-2.5 py-1 bg-white hover:bg-[#142B4E] text-[#142B4E] hover:text-white border border-[#142B4E]/30 rounded-full text-[10px] font-medium transition-colors cursor-pointer"
                    >
                      {sr}
                    </button>
                  ))}
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

  // MODE 1: AUTONOMOUS VOICE & SHOPPING AGENT — Transparent Glass Bottom Command Bar
  if (aiConfig.displayMode === 'agent') {
    const agentBottomClass = isProductPage ? 'bottom-[62px] lg:bottom-[68px]' : 'bottom-4';
    return (
      <div
        data-testid="ai-agent-bar"
        className={`fixed ${agentBottomClass} left-1/2 -translate-x-1/2 z-30 w-[calc(100vw-2rem)] sm:w-[650px] max-w-[92vw] transition-all duration-200`}
      >
        {panelOpen && renderConversationPanel('mb-2.5 w-full')}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-full bg-white/80 hover:bg-white/95 focus-within:bg-white backdrop-blur-md border border-black/15 shadow-2xl transition-all"
        >
          <button
            type="button"
            onClick={() => setPanelOpen((prev) => !prev)}
            aria-label="Toggle AI Tailor Agent"
            className="w-8 h-8 rounded-full bg-[#142B4E] text-white flex items-center justify-center shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#FFCC00]" />
          </button>

          <button
            type="button"
            data-testid="ai-mic-btn"
            onClick={toggleMicRecording}
            aria-label={isRecording ? 'Stop voice recording' : 'Speak to AI tailor'}
            title={isRecording ? 'Tap to stop recording' : 'Speak to tailor'}
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
              isRecording
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-[#F3F4F6] hover:bg-[#142B4E] text-[#142B4E] hover:text-white'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            type="button"
            data-testid="ai-bar-call-btn"
            onClick={startLiveVoiceCall}
            aria-label={liveState === 'idle' ? 'Call AI Tailor live' : 'End live voice call'}
            title={liveState === 'idle' ? 'Start Live Voice Call' : 'End Live Voice Call'}
            className={`w-8 h-8 rounded-full hidden sm:flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
              liveState !== 'idle'
                ? 'bg-emerald-600 text-white animate-pulse'
                : 'bg-[#F3F4F6] hover:bg-[#142B4E] text-[#142B4E] hover:text-white'
            }`}
          >
            {liveState !== 'idle' ? <PhoneOff className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
          </button>

          <input
            type="text"
            value={input}
            onFocus={() => setPanelOpen(true)}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isRecording ? 'Listening — tap mic when finished...' : copy.ai.agentPlaceholder}
            className="flex-1 bg-transparent text-xs text-[#1A1A1A] placeholder:text-neutral-600 outline-none min-w-0 px-1"
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
    ? isProductPage
      ? hasFloatingPromoLeft
        ? 'bottom-[180px] left-4 lg:bottom-[132px] items-start'
        : 'bottom-[78px] left-4 lg:bottom-[68px] items-start'
      : hasFloatingPromoLeft
      ? 'bottom-16 left-4 items-start'
      : 'bottom-4 left-4 items-start'
    : isProductPage
    ? 'bottom-[78px] right-4 lg:bottom-[68px] items-end'
    : 'bottom-4 right-4 items-end';

  return (
    <div data-testid="ai-chatbot-bubble" className={`fixed z-30 flex flex-col ${posClasses}`}>
      {panelOpen && (
        <div className="mb-2.5 w-[350px] sm:w-[390px] max-w-[calc(100vw-2rem)]">
          {renderConversationPanel('w-full')}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="mt-2 flex items-center gap-1.5 p-2 bg-white border border-black/15 rounded-xl shadow-lg"
          >
            <button
              type="button"
              onClick={toggleMicRecording}
              aria-label="Speak to tailor"
              className={`p-2 rounded-lg shrink-0 cursor-pointer ${
                isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-[#F3F4F6] text-[#142B4E]'
              }`}
            >
              {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
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
