import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, Sparkles, Loader2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getGrievances, askChatbot } from '../services/api';

const QUICK_PROMPTS = [
  { text: "⚡ Status of my reports", action: "status" },
  { text: "✍️ How do I file a case?", action: "file" },
  { text: "🏢 Department categories", action: "categories" },
];

export default function ChatbotWidget() {
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I am **Samadhaan AI**. I can help you check the status of your complaints, guide you through filing a new case, or answer municipal questions. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userGrievances, setUserGrievances] = useState([]);
  
  const messagesEndRef = useRef(null);

  // Fetch grievances for context
  useEffect(() => {
    if (user && token && isOpen) {
      getGrievances(1, 50, token, user.id)
        .then((data) => setUserGrievances(data))
        .catch((err) => console.error("Chatbot: error loading context grievances:", err));
    }
  }, [user, token, isOpen]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    if (!textToSend) {
      setInput('');
    }

    // Add user message
    const updatedMessages = [...messages, { role: 'user', content: query }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      // Send message to backend endpoint with user context
      const res = await askChatbot(updatedMessages, userGrievances);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      console.error("Chatbot query failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err.message || "Sorry, I am having trouble connecting to the AI helper. Please try again later."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    if (action === 'status') {
      if (!user) {
        setMessages((prev) => [
          ...prev,
          { role: 'user', content: "Check status of my reports" },
          { role: 'assistant', content: "Please sign in to view and track your reports. If you've already filed reports anonymously, they won't appear in your personalized profile." }
        ]);
        return;
      }
      handleSend("What is the status of my reports?");
    } else if (action === 'file') {
      handleSend("How do I file a new municipal complaint?");
    } else if (action === 'categories') {
      handleSend("What department categories are available in Samadhaan?");
    }
  };

  // Safe basic markdown renderer (handles bold **text** and bullet points \n- )
  const renderMessageContent = (content) => {
    const lines = content.split('\n');
    return lines.map((line, lineIdx) => {
      // Format bold text
      let parts = [];
      let lastIndex = 0;
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match;
      
      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-extrabold text-slate-900">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      // Check if it's a bullet point
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('• ');
      if (isBullet) {
        const cleanLine = line.replace(/^[-•]\s+/, '');
        return (
          <li key={lineIdx} className="ml-4 list-disc text-slate-700 mt-1 leading-relaxed">
            {parts.length > 0 ? parts : cleanLine}
          </li>
        );
      }

      return (
        <p key={lineIdx} className="text-slate-700 min-h-[0.5rem] leading-relaxed mt-1 first:mt-0">
          {parts.length > 0 ? parts : line}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-[9999] rounded-full bg-gradient-primary p-3.5 text-white shadow-[0_8px_30px_rgba(16,185,129,0.3)] transition border border-white/30 flex items-center justify-center cursor-pointer"
        title="Open Support Chat"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <MessageCircle className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-sky-400 border border-white animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Floating Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.94 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed bottom-24 right-6 z-[9999] w-[340px] sm:w-96 h-[520px] flex flex-col rounded-2xl glass-panel-strong overflow-hidden shadow-[0_12px_45px_rgba(0,0,0,0.08)] border border-white/90"
          >
            {/* Header */}
            <div className="bg-gradient-primary px-4 py-3 flex items-center justify-between text-white shadow-sm shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-xl backdrop-blur-sm border border-white/10 flex items-center justify-center">
                  <Bot className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="font-space-grotesk font-bold text-sm tracking-wide block">Samadhaan AI</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    <span className="text-[10px] text-emerald-100 font-medium uppercase tracking-wider">Assistant online</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-emerald-150 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat message list area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
              {messages.map((msg, i) => {
                const isAssistant = msg.role === 'assistant';
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex items-start gap-2.5 ${isAssistant ? '' : 'flex-row-reverse'}`}
                  >
                    <div className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-xs border ${
                      isAssistant
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        : 'bg-sky-50 border-sky-100 text-sky-700'
                    }`}>
                      {isAssistant ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                    </div>
                    <div className={`flex flex-col max-w-[76%] ${isAssistant ? '' : 'items-end'}`}>
                      <div className={`rounded-2xl p-3 text-xs shadow-sm border ${
                        isAssistant
                          ? 'bg-white/95 border-slate-100 text-slate-800 rounded-tl-none'
                          : 'bg-gradient-primary text-white border-transparent rounded-tr-none'
                      }`}>
                        {isAssistant ? renderMessageContent(msg.content) : msg.content}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {loading && (
                <div className="flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-xs bg-emerald-50 border border-emerald-100 text-emerald-700">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  </div>
                  <div className="rounded-2xl rounded-tl-none p-3 bg-white/90 border border-slate-100 shadow-sm flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick action buttons */}
            {messages.length === 1 && !loading && (
              <div className="px-4 py-2 border-t border-slate-100 bg-white/50 shrink-0 flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.action}
                    onClick={() => handleQuickAction(prompt.action)}
                    type="button"
                    className="text-[10px] font-semibold text-slate-700 bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 rounded-full px-2.5 py-1 transition flex items-center gap-1 shadow-sm"
                  >
                    {prompt.text}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form footer */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="p-3 border-t border-slate-150 bg-white flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Samadhaan AI support…"
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/20 focus:border-emerald-500/50 transition duration-200"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 rounded-xl bg-gradient-primary text-white shadow-sm transition hover:scale-103 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
