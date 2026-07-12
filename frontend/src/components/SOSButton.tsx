"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, AlertOctagon } from "lucide-react";

interface SOSButtonProps {
  onTrigger: (message: string) => void;
  isLoading: boolean;
}

export default function SOSButton({ onTrigger, isLoading }: SOSButtonProps) {
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const [sosMessage, setSosMessage] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const duration = 1500; // Hold duration in ms
  const intervalTime = 30; // Milliseconds per tick

  useEffect(() => {
    if (isPressing && !triggered) {
      const step = 100 / (duration / intervalTime);
      timerRef.current = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timerRef.current!);
            setIsPressing(false);
            setTriggered(true);
            setShowDialog(true);
            return 100;
          }
          return prev + step;
        });
      }, intervalTime);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (!triggered) {
        setProgress(0);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPressing, triggered]);

  const handleStart = () => {
    if (triggered) return;
    setIsPressing(true);
  };

  const handleEnd = () => {
    setIsPressing(false);
  };

  const handleCancelSOS = () => {
    setTriggered(false);
    setProgress(0);
    setShowDialog(false);
  };

  const handleSubmitSOS = () => {
    onTrigger(sosMessage || "Emergency Help Needed!");
    setShowDialog(false);
    // Keep triggered visual active for 5s then reset
    setTimeout(() => {
      setTriggered(false);
      setProgress(0);
      setSosMessage("");
    }, 5000);
  };

  // Radial progress stroke math
  const radius = 42;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white border-4 border-black rounded-2xl w-full max-w-sm mx-auto shadow-[8px_8px_0_0_#000] text-black">
      <div className="relative flex items-center justify-center w-40 h-40">
        
        {/* Radial SVG Progress Tracker */}
        <svg className="absolute w-full h-full transform -rotate-90 select-none pointer-events-none">
          <circle
            stroke="rgba(0, 0, 0, 0.1)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx="80"
            cy="80"
          />
          <circle
            stroke={triggered ? "#CCFF00" : "#ef4444"}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + " " + circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx="80"
            cy="80"
            className="transition-all duration-75"
          />
        </svg>

        {/* SOS Button Trigger */}
        <button
          onMouseDown={handleStart}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchEnd={handleEnd}
          disabled={isLoading}
          className={`absolute w-24 h-24 rounded-full flex flex-col items-center justify-center select-none cursor-pointer transition-all duration-300 border-4 border-black ${
            triggered
              ? "bg-[#CCFF00] text-black shadow-none scale-95"
              : isPressing
              ? "bg-red-700 text-white shadow-none scale-90"
              : "bg-red-500 text-white shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000]"
          }`}
        >
          {triggered ? (
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="flex flex-col items-center justify-center"
            >
              <ShieldAlert className="w-9 h-9" />
              <span className="text-[9px] font-black tracking-widest mt-1">SENT</span>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <AlertOctagon className="w-10 h-10" />
              <span className="text-xs font-black tracking-widest mt-0.5">SOS</span>
            </div>
          )}
        </button>
      </div>

      <div className="text-center mt-3 max-w-[240px]">
        <p className="text-xs text-black font-black uppercase tracking-wider">
          {triggered ? "SOS Emergency Transmitted" : isPressing ? "Release to Cancel SOS..." : "Press and Hold for SOS"}
        </p>
        <p className="text-[10px] text-black/60 font-bold mt-1 leading-snug">
          {triggered 
            ? "Organizers have received your seat coordinates. Response team is deploying." 
            : "Hold button for 1.5 seconds in case of an immediate medical or safety hazard."}
        </p>
      </div>

      {/* SOS Details Dialog Modal */}
      <AnimatePresence>
        {showDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white border-4 border-black p-6 rounded-2xl shadow-[8px_8px_0_0_#000] text-black"
            >
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <ShieldAlert className="w-7 h-7" />
                <h3 className="text-lg font-black uppercase tracking-wider">Emergency Log</h3>
              </div>
              
              <p className="text-xs text-black/80 mb-4 font-bold leading-relaxed">
                Emergency signal initiated. Add details about your emergency below so first responders are prepared (e.g. "Heart issues", "Fainted person", "Crush hazard").
              </p>

              <textarea
                value={sosMessage}
                onChange={(e) => setSosMessage(e.target.value)}
                placeholder="Optional: Describe the emergency here..."
                rows={3}
                className="w-full bg-[#F8F9FA] border-2 border-black focus:border-[#0038FF] rounded-xl p-3 text-xs text-black font-bold outline-none resize-none transition-all duration-200"
              />

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleCancelSOS}
                  className="flex-1 bg-white hover:bg-black/5 text-black border-2 border-black py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-200 shadow-[2px_2px_0_0_#000] active:translate-y-0.5 active:shadow-none"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitSOS}
                  className="flex-1 bg-red-500 hover:bg-red-400 text-white border-2 border-black py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-200 shadow-[2px_2px_0_0_#000] active:translate-y-0.5 active:shadow-none"
                >
                  Transmit Alert
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
