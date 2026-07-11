"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, User, Bot, HelpCircle, AlertOctagon } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
}

interface ChatAssistantProps {
  sessionId: string;
}

export default function ChatAssistant({ sessionId }: ChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Hello! I am your FIFA 2026 Assistant for Etihad Stadium. Ask me for gate directions, food concourses, first aid, or report safety issues.",
      sender: "ai",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsgId = Date.now().toString();
    const newMsg: Message = {
      id: userMsgId,
      text: textToSend,
      sender: "user",
    };
    
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: textToSend,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: data.response,
            sender: "ai",
          },
        ]);
      } else {
        throw new Error("API call failed");
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "Sorry, I am having trouble connecting to the safety network. Please consult a volunteer or follow signage.",
          sender: "ai",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    handleSend(question);
  };

  const quickQuestions = [
    "Where is the nearest First Aid tent?",
    "Check Gate Congestion",
    "Where are the food concourses?",
    "Locate restrooms near Block 138"
  ];

  return (
    <div className="flex flex-col bg-slate-900/60 border border-slate-800/80 rounded-2xl h-[420px] w-full max-w-sm mx-auto shadow-xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-950/80 border-b border-slate-850/80">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
        <Bot className="w-5 h-5 text-emerald-400" />
        <div>
          <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest">GenAI Safety Assistant</h3>
          <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Etihad Concourse Support</p>
        </div>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-2 ${
              m.sender === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`p-1.5 rounded-lg mt-0.5 ${
                m.sender === "user"
                  ? "bg-amber-500/10 text-amber-500"
                  : "bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {m.sender === "user" ? (
                <User className="w-3.5 h-3.5" />
              ) : (
                <Bot className="w-3.5 h-3.5" />
              )}
            </div>
            
            <div
              className={`max-w-[75%] rounded-xl px-3 py-2 text-xs font-medium leading-relaxed shadow ${
                m.sender === "user"
                  ? "bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-bold"
                  : "bg-slate-800/90 text-slate-100 border border-slate-700/30"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 animate-pulse">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-slate-800/90 text-slate-400 border border-slate-700/30 rounded-xl px-3 py-2 text-xs flex gap-1 items-center font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "0ms" }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "150ms" }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "300ms" }}></span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Quick Questions Helper Chips */}
      <div className="px-4 py-2 bg-slate-950/20 border-t border-slate-850/50 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none scroll-smooth">
        {quickQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleQuickQuestion(q)}
            disabled={isLoading}
            className="bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-slate-100 border border-slate-700/50 rounded-full px-3 py-1 text-[10px] font-bold tracking-tight transition-all duration-200"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Tray */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="flex gap-2 p-3 bg-slate-950/80 border-t border-slate-850/80 items-center"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask or report hazards..."
          disabled={isLoading}
          className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none transition-all duration-200"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 p-2 rounded-xl transition-all duration-200"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
