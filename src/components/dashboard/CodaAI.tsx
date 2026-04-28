import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2, Mic, MicOff } from 'lucide-react';
import { useStore } from '../../store/useStore';
import logo from '../../assets/logo.png';
import toast from 'react-hot-toast';
import { soundService } from '../../utils/sounds';

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
}

const CODA_SYSTEM_PROMPT = `You are Coda AI, the built-in intelligent assistant for the Coda application — a premium, dark-themed code snippet manager built with Tauri and React.

You help users understand and navigate the app. Here's what you know about Coda:

FEATURES:
- Library: Browse, search, and manage all code snippets. Snippets can be opened, edited, archived, or deleted.
- Snippet Editor: Full Monaco-based code editor with syntax highlighting, version history, diff mode, validation diagnostics, and boilerplate templates.
- Projects (Project Vault): Organize snippets into projects. Each project has a color, description, and snippet count.
- Cross-Project Links: AI-powered behavioral correlation engine that finds related snippets across projects based on usage patterns, tags, and workflow sequences.
- Smart Intelligence (GEMINI CO-PILOT): AI-powered recommendations sidebar that analyzes your current code buffer and suggests architectural improvements, related snippets, and stale code cleanup.
- Hardware Visualization: Real-time telemetry dashboard showing CPU usage, RAM, DB health, cache size, vault maintenance status, and core temperature.
- Analytics: Usage statistics, copy counts, language distribution, and activity trends.
- Tags: Organize and filter snippets by tags.
- Favorites: Quick access to starred snippets.
- Trash: Recover or permanently delete archived snippets.
- Import/Export: Import code files or JSON data, export your library.
- Backup & Restore: Database backup and restoration.
- Settings: Theme engine (Crimson, Void, Matrix, Glacier), font scaling, hotkey configuration, notification toggles, auto-lock timer, and Gemini API key management.

SHORTCUTS:
- Ctrl+S: Save current snippet
- Ctrl+N: Create new snippet
- Ctrl+F: Global search

THEMES: Crimson (red accent), Void (purple), Matrix (green), Glacier (blue)

Be conversational and approachable in your tone, while remaining highly objective, factual, and analytical. You should still match the app's dark, technical, terminal-inspired aesthetic, but speak naturally.`;

const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

export const CodaAI: React.FC = () => {
  const { settings } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeModel, setActiveModel] = useState(MODELS[0]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const aiContainerRef = useRef<HTMLDivElement>(null);
  
  // Voice State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const handleSendMessageRef = useRef<any>(null);

  // Keep the ref updated with the latest function
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  });

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        soundService.playJarvis();
      };
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          toast.success('Voice Uplink established');
          // AUTO-SEND using the LATEST ref to avoid stale closures
          setTimeout(() => {
            if (handleSendMessageRef.current) {
              handleSendMessageRef.current(transcript);
            }
          }, 300);
        }
      };
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
           toast.error('Microphone access denied');
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (recognitionRef.current) {
        setInput('');
        recognitionRef.current.start();
        toast('Neural Link Syncing...', { icon: '🎙️', style: { background: '#111', color: '#fff', fontSize: '10px', fontFamily: 'monospace' } });
      } else {
        toast.error('Speech recognition not supported');
      }
    }
  };

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isOpen && aiContainerRef.current && !aiContainerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const callGemini = async (model: string, key: string, body: any): Promise<Response> => {
    return fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );
  };

  const handleSendMessage = async (textOverride?: string) => {
    const textToSubmit = textOverride || input;
    const trimmed = textToSubmit.trim();
    if (!trimmed || isLoading) return;

    if (!apiKey) {
      setMessages(prev => [...prev, 
        { role: 'user', content: trimmed, timestamp: Date.now() },
        { role: 'ai', content: 'SYSTEM_ERROR: No Gemini API key configured. Please add VITE_GEMINI_API_KEY to your .env file.', timestamp: Date.now() }
      ]);
      setInput('');
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: trimmed, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const requestBody = {
        systemInstruction: { parts: [{ text: CODA_SYSTEM_PROMPT }] },
        contents: [
          ...conversationHistory,
          { role: 'user', parts: [{ text: trimmed }] }
        ]
      };

      let response = await callGemini(activeModel, apiKey, requestBody);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || '';
        const isOverloaded = response.status === 503 || errMsg.toLowerCase().includes('high demand');
        
        if (response.status === 404 || isOverloaded) {
          const fallbackModel = MODELS.find(m => m !== activeModel) || MODELS[1];
          setActiveModel(fallbackModel);
          response = await callGemini(fallbackModel, apiKey, requestBody);
        }
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate response.';

      setMessages(prev => [...prev, {
        role: 'ai',
        content: aiText,
        timestamp: Date.now()
      }]);

      if (settings?.voiceEnabled) {
        soundService.playJarvisResponse();
        speakResponse(aiText);
      }
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `NEURAL_LINK_SEVERED: ${e.message?.toUpperCase()}`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const speakResponse = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div ref={aiContainerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 group shadow-lg ${
          isOpen
            ? 'bg-[var(--border)] hover:bg-red-500/20'
            : 'bg-[var(--accent)] hover:scale-110 shadow-[0_0_20px_var(--accent-glow)]'
        }`}
      >
        {isOpen ? (
          <X size={20} className="text-white" />
        ) : (
          <img src={logo} className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform" alt="Coda Logo" />
        )}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full border-2 border-[var(--accent)] animate-ping opacity-30" />
        )}
      </button>

      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-[9998] w-[380px] max-h-[520px] flex flex-col bg-[#0a0a0a] border border-[var(--border)] rounded-lg shadow-2xl overflow-hidden animate-in"
          style={{ animation: 'slideUp 0.3s ease-out' }}
        >
          <div className="px-5 py-4 bg-[#111] border-b border-[var(--border)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#1a1a1a] border border-[var(--border)] rounded-full flex items-center justify-center relative overflow-hidden">
                <img src={logo} className="w-full h-full object-cover rounded-full" alt="Coda Logo" />
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#111]" />
              </div>
              <h3 className="text-[12px] font-main font-bold text-white tracking-[1.5px] uppercase">CODA_AI</h3>
            </div>
            <button
              onClick={() => setMessages([])}
              className="text-[8px] font-mono text-[#adaaad] hover:text-white uppercase tracking-widest px-2 py-1 border border-transparent hover:border-[var(--border)] rounded transition-all"
            >
              Clear
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-[300px] max-h-[360px]">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
                <div className="w-12 h-12 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-xl flex items-center justify-center">
                  <Sparkles size={24} className="text-[var(--accent)]" />
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-main font-bold text-white uppercase tracking-wider mb-1">Jarvis Mode Active</p>
                  <p className="text-[9px] font-mono text-[#adaaad] leading-relaxed max-w-[240px]">
                    I am ready for your commands. Try clicking the microphone.
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-lg text-[11px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-white rounded-br-none'
                    : 'bg-[#161616] border border-[var(--border)] text-[#e5e2e1] rounded-bl-none'
                }`}>
                  {msg.role === 'ai' && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles size={10} className="text-[var(--accent)]" />
                      <span className="text-[7px] font-mono text-[var(--accent)] uppercase tracking-widest font-bold">CODA_AI</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap font-main">{msg.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#161616] border border-[var(--border)] px-4 py-3 rounded-lg rounded-bl-none flex items-center gap-2">
                  <Loader2 size={12} className="text-[var(--accent)] animate-spin" />
                  <span className="text-[9px] font-mono text-[#adaaad] animate-pulse">PROCESSING_QUERY...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-[#0d0d0d] border-t border-[var(--border)] shrink-0">
            <div className="flex items-center gap-2 bg-[#161616] border border-[var(--border)] rounded-lg px-3 py-1 focus-within:border-[var(--accent)]/50 transition-colors">
              <button
                onClick={toggleListening}
                className={`w-8 h-8 flex items-center justify-center rounded-md transition-all shrink-0 ${
                  isListening 
                    ? 'bg-red-500/20 text-red-500 animate-pulse' 
                    : 'text-[#adaaad] hover:text-white hover:bg-white/5'
                }`}
                title={isListening ? 'Stop Listening' : 'Voice Command'}
              >
                {isListening ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
              
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={isListening ? "Listening..." : "Ask Coda AI..."}
                className="flex-1 bg-transparent text-[11px] font-main text-white placeholder:text-[#adaaad]/40 outline-none py-2"
              />
              
              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--accent)] hover:brightness-110 transition-all disabled:opacity-30 shrink-0"
              >
                <Send size={14} className="text-white" />
              </button>
            </div>
            <p className="text-[7px] font-mono text-[#adaaad]/30 text-center mt-2 tracking-widest uppercase">
              {isListening ? 'Neural Uplink Active' : `Powered by ${activeModel}`}
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};
