"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, MapPin, ArrowRight } from "lucide-react";

interface AlertBannerProps {
  currentGate: {
    gate_id: string;
    name: string;
    status: "Open" | "Crowded" | "Closed";
    alternative: string;
  } | null;
  onRerouteAccept?: () => void;
}

export default function AlertBanner({ currentGate, onRerouteAccept }: AlertBannerProps) {
  if (!currentGate) return null;

  const isAffected = currentGate.status === "Crowded" || currentGate.status === "Closed";

  if (!isAffected) return null;

  const altGateLetter = currentGate.alternative.replace("Gate ", "");
  const currentGateLetter = currentGate.gate_id.replace("Gate ", "");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-full max-w-md mx-auto p-4 z-50 sticky top-4"
      >
        <div className="bg-slate-900/95 border-2 border-amber-500/80 rounded-xl p-4 shadow-[0_8px_30px_rgb(245,158,11,0.2)] backdrop-blur-md">
          <div className="flex gap-3 items-start">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 mt-0.5 animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-sm font-extrabold text-amber-500 uppercase tracking-wider">
                Gate Congestion Alert
              </h3>
              <p className="text-xs text-slate-200 font-medium mt-1 leading-relaxed">
                {currentGate.status === "Closed" ? (
                  <span><strong>{currentGate.gate_id}</strong> is closed.</span>
                ) : (
                  <span><strong>{currentGate.gate_id}</strong> is currently at capacity.</span>
                )}
                {" Please proceed to "}
                <span className="text-emerald-400 font-bold underline">
                  Gate {altGateLetter}
                </span>
                {" for faster entry (2 min walk)."}
              </p>

              <div className="flex gap-4 mt-3 pt-3 border-t border-slate-800/80 items-center justify-between">
                <div className="flex gap-1.5 items-center text-[10px] text-slate-400">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Route adjusted to Gate {altGateLetter}</span>
                </div>
                
                {onRerouteAccept && (
                  <button
                    onClick={onRerouteAccept}
                    className="flex gap-1 items-center bg-amber-500 hover:bg-amber-600 text-slate-950 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase transition-all duration-200"
                  >
                    <span>Acknowledge</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
