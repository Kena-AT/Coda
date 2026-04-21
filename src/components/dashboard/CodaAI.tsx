import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import logo from '../../assets/logo.png';

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

Be concise, helpful, and match the app's dark, technical, terminal-inspired aesthetic in your tone. Use short sentences. Be direct.`;

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

  const apiKey = settings.geminiApiKey;

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

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    if (!apiKey) {
      setMessages(prev => [...prev, 
        { role: 'user', content: trimmed, timestamp: Date.now() },
        { role: 'ai', content: 'SYSTEM_ERROR: No Gemini API key configured. Go to Settings > Intelligence_Layer to add your key.', timestamp: Date.now() }
      ]);
      setInput('');
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: trimmed, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history for context
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

      // Try primary model first, fallback to secondary
      let response = await callGemini(activeModel, apiKey, requestBody);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || '';
        
        // If model not found or not supported, try fallback
        if (response.status === 404 || errMsg.includes('not found') || errMsg.includes('not supported')) {
          const fallbackModel = MODELS.find(m => m !== activeModel) || MODELS[1];
          console.log(`Model ${activeModel} unavailable, falling back to ${fallbackModel}`);
          setActiveModel(fallbackModel);
          
          response = await callGemini(fallbackModel, apiKey, requestBody);
          if (!response.ok) {
            const fallbackErr = await response.json().catch(() => ({}));
            throw new Error(fallbackErr.error?.message || `HTTP ${response.status}`);
          }
        } else {
          throw new Error(errMsg || `HTTP ${response.status}`);
        }
      }

      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate response.';

      setMessages(prev => [...prev, {
        role: 'ai',
        content: aiText,
        timestamp: Date.now()
      }]);
    } catch (e: any) {
      const errMsg = e.message?.toUpperCase() || 'UNKNOWN_SYSTEM_FAULT';
      let diagnosticMessage = `NEURAL_LINK_SEVERED: ${errMsg}`;
      
      if (errMsg.includes('429') || errMsg.includes('LIMIT')) {
        diagnosticMessage = `RATE_LIMIT_EXCEEDED: Neural processors are cooling down. Please wait.`;
      } else if (errMsg.includes('KEY') || errMsg.includes('401')) {
        diagnosticMessage = `CREDENTIAL_AUTH_FAILED: Verify Gemini_API_Key in Intelligence_Layer.`;
      } else if (errMsg.includes('CONNECTION') || errMsg.includes('FETCH')) {
        diagnosticMessage = `UPLINK_TIMEOUT: Network handshake failed. Check your connection.`;
      }

      setMessages(prev => [...prev, {
        role: 'ai',
        content: diagnosticMessage,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 group shadow-lg ${
          isOpen
            ? 'bg-[var(--border)] hover:bg-red-500/20 rotate-0'
            : 'bg-[var(--accent)] hover:scale-110 hover:shadow-[0_0_30px_var(--accent-glow)]'
        }`}
        style={{ boxShadow: isOpen ? 'none' : '0 0 20px var(--accent-glow)' }}
      >
        {isOpen ? (
          <X size={20} className="text-white" />
        ) : (
          <img src={logo} className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform" alt="Coda Logo" />
        )}
        {/* Pulse ring when closed */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full border-2 border-[var(--accent)] animate-ping opacity-30" />
        )}
      </button>

      {/* Chat Popup */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-[9998] w-[380px] max-h-[520px] flex flex-col bg-[#0a0a0a] border border-[var(--border)] rounded-lg shadow-2xl overflow-hidden animate-in"
          style={{
            animation: 'slideUp 0.3s ease-out',
            boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(0,0,0,0.5)'
          }}
        >
          {/* Header */}
          <div className="px-5 py-4 bg-[#111] border-b border-[var(--border)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#1a1a1a] border border-[var(--border)] rounded-full flex items-center justify-center relative overflow-hidden">
                <img src={logo} className="w-full h-full object-cover rounded-full" alt="Coda Logo" />
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#111]" />
              </div>
              <div>
                <h3 className="text-[12px] font-main font-bold text-white tracking-[1.5px] uppercase">CODA_AI</h3>
              </div>
            </div>
            <button
              onClick={() => setMessages([])}
              className="text-[8px] font-mono text-[#adaaad] hover:text-white uppercase tracking-widest px-2 py-1 border border-transparent hover:border-[var(--border)] rounded transition-all"
            >
              Clear
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-[300px] max-h-[360px]">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
                <div className="w-12 h-12 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-xl flex items-center justify-center">
                  <Sparkles size={24} className="text-[var(--accent)]" />
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-main font-bold text-white uppercase tracking-wider mb-1">Ask me anything</p>
                  <p className="text-[9px] font-mono text-[#adaaad] leading-relaxed max-w-[240px]">
                    I know everything about Coda — features, shortcuts, settings, and workflows.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {['How do I create a snippet?', 'What are the shortcuts?', 'Tell me about themes'].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(q); }}
                      className="text-[8px] font-mono text-[#adaaad] bg-[#1a1a1a] border border-[var(--border)] px-3 py-1.5 rounded hover:border-[var(--accent)]/50 hover:text-white transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-lg text-[11px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[var(--accent)] text-white rounded-br-none'
                      : 'bg-[#161616] border border-[var(--border)] text-[#e5e2e1] rounded-bl-none'
                  }`}
                >
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

          {/* Input Area */}
          <div className="p-3 bg-[#0d0d0d] border-t border-[var(--border)] shrink-0">
            <div className="flex items-center gap-2 bg-[#161616] border border-[var(--border)] rounded-lg px-3 py-1 focus-within:border-[var(--accent)]/50 transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask Coda AI..."
                className="flex-1 bg-transparent text-[11px] font-main text-white placeholder:text-[#adaaad]/40 outline-none py-2"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--accent)] hover:brightness-110 transition-all disabled:opacity-30 disabled:hover:brightness-100 shrink-0"
              >
                <Send size={14} className="text-white" />
              </button>
            </div>
            <p className="text-[7px] font-mono text-[#adaaad]/30 text-center mt-2 tracking-widest uppercase">
              Powered by {activeModel}
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
    </>
  );
};
