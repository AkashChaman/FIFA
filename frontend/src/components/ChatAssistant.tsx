"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, User, Bot, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { API_BASE_URL } from "@/utils/config";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  sosBanner?: boolean; // If true, show an SOS confirmation banner below this message
}

interface ChatAssistantProps {
  sessionId: string;
  seat?: string;
  block?: string;
  gate?: string;
}

export default function ChatAssistant({ sessionId, seat, block, gate }: ChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Hello! I'm your FIFA 2026 Safety Assistant for Etihad Stadium. I can help with gate directions, food concourses, first aid locations, report safety issues, or even initiate an emergency SOS on your behalf. How can I assist you today?",
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
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: textToSend,
          seat: seat || "",
          block: block || "",
          gate: gate || "",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          sender: "ai",
          sosBanner: data.sos_triggered === true,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error("API call failed");
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "Sorry, I'm having trouble connecting to the safety network. Please consult a nearby volunteer or follow stadium signage for assistance.",
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
    "Locate restrooms near my block",
    "Report an emergency",
  ];

  // Render AI message text with basic formatting (bold, bullet points, line breaks)
  const renderFormattedText = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      // Process bold markers **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const rendered = parts.map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={j} className="text-emerald-300 font-bold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={j}>{part}</span>;
      });

      // Detect bullet points
      const trimmed = line.trim();
      if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || /^\d+\.\s/.test(trimmed)) {
        return (
          <div key={i} className="flex gap-1.5 items-start ml-1 my-0.5">
            <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
            <span>{rendered}</span>
          </div>
        );
      }

      // Empty lines become spacing
      if (trimmed === "") {
        return <div key={i} className="h-1.5" />;
      }

      return (
        <div key={i} className="my-0.5">
          {rendered}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col bg-white border-4 border-black rounded-2xl h-[480px] w-full max-w-sm mx-auto shadow-[8px_8px_0_0_#000] overflow-hidden text-black">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b-4 border-black">
        <div className="w-2.5 h-2.5 rounded-full bg-[#0038FF] animate-pulse border border-black"></div>
        <Bot className="w-5 h-5 text-[#0038FF]" />
        <div>
          <h3 className="text-xs font-black text-black uppercase tracking-widest">GenAI Safety Assistant</h3>
          <p className="text-[9px] text-black/60 font-black uppercase tracking-wider">Etihad Concourse Support</p>
        </div>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {messages.map((m) => (
          <div key={m.id}>
            <div
              className={`flex items-start gap-2 ${
                m.sender === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`p-1.5 rounded-lg mt-0.5 shrink-0 border-2 border-black shadow-[1px_1px_0_0_#000] ${
                  m.sender === "user"
                    ? "bg-black text-[#CCFF00]"
                    : "bg-[#0038FF] text-white"
                }`}
              >
                {m.sender === "user" ? (
                  <User className="w-3.5 h-3.5" />
                ) : (
                  <Bot className="w-3.5 h-3.5" />
                )}
              </div>
              
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed border-2 border-black shadow-[2px_2px_0_0_#000] ${
                  m.sender === "user"
                    ? "bg-[#CCFF00] text-black font-black"
                    : "bg-[#F8F9FA] text-black font-bold"
                }`}
              >
                {m.sender === "ai" ? renderFormattedText(m.text) : m.text}
              </div>
            </div>

            {/* SOS Confirmation Banner */}
            {m.sosBanner && (
              <div className="mt-2 mx-7 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/40 rounded-xl px-3 py-2.5 flex items-start gap-2 animate-pulse">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-red-300 uppercase tracking-wider">
                    🚨 SOS Alert Dispatched
                  </p>
                  <p className="text-[9px] text-red-200/80 mt-0.5 font-medium">
                    An emergency SOS signal has been automatically sent to the stadium control center with your seat location. Help is on the way.
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="p-1.5 rounded-lg bg-[#0038FF] text-white border-2 border-black shadow-[1px_1px_0_0_#000] animate-pulse">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-[#F8F9FA] text-black border-2 border-black shadow-[2px_2px_0_0_#000] rounded-xl px-3 py-2 text-xs flex gap-1 items-center font-black">
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-bounce" style={{ animationDelay: "0ms" }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-bounce" style={{ animationDelay: "150ms" }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-bounce" style={{ animationDelay: "300ms" }}></span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Quick Questions Helper Chips */}
      <div className="px-4 py-2 bg-[#F8F9FA] border-t-2 border-black/10 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none scroll-smooth">
        {quickQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleQuickQuestion(q)}
            disabled={isLoading}
            className={`border-2 border-black shadow-[1px_1px_0_0_#000] rounded-full px-3 py-1 text-[10px] font-black tracking-tight transition-all duration-200 shrink-0 ${
              q === "Report an emergency"
                ? "bg-red-500 hover:bg-red-400 text-white"
                : "bg-white hover:bg-black/5 text-black"
            }`}
          >
            {q === "Report an emergency" && "🚨 "}
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
        className="flex gap-2 p-3 bg-white border-t-4 border-black items-center"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask or report hazards..."
          disabled={isLoading}
          className="flex-1 bg-[#F8F9FA] border-2 border-black focus:border-[#0038FF] rounded-xl px-3 py-2 text-xs text-black font-bold outline-none transition-all duration-200"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-[#0038FF] hover:bg-blue-700 disabled:bg-black/10 text-white disabled:text-black/40 border-2 border-black disabled:border-black/10 p-2 rounded-xl transition-all duration-200 shadow-[2px_2px_0_0_#000] active:translate-y-0.5 active:shadow-none disabled:shadow-none"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
