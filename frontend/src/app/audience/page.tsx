"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { wsClient } from "@/utils/websocket";
import StadiumMap, { GateData } from "@/components/StadiumMap";
import AlertBanner from "@/components/AlertBanner";
import SOSButton from "@/components/SOSButton";
import ChatAssistant from "@/components/ChatAssistant";
import { Ticket, ArrowLeft, Radio, Bell, X, Megaphone, Clock, Trash2 } from "lucide-react";

interface NotificationEntry {
  id: string;
  message: string;
  timestamp: string; // ISO 8601 string — safe for JSON.stringify/parse
}

export default function AudiencePortal() {
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [ticket, setTicket] = useState({
    block: "138",
    row: "G",
    seat: "15",
  });

  const [gates, setGates] = useState<GateData[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [recommendedGateId, setRecommendedGateId] = useState("");
  const [blockInfo, setBlockInfo] = useState<any>(null);
  const [sosLoading, setSosLoading] = useState(false);
  const [massNotification, setMassNotification] = useState<string | null>(null);

  // Notification log state
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const drawerRef = useRef<HTMLDivElement>(null);

  const STORAGE_KEY = "fifa_notif_log";
  const TTL_MS = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

  // ── Load persisted notifications on mount (drop anything older than 3h) ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: NotificationEntry[] = JSON.parse(raw);
        const cutoff = Date.now() - TTL_MS;
        const fresh = parsed.filter(
          (n) => new Date(n.timestamp).getTime() > cutoff
        );
        if (fresh.length > 0) {
          setNotifications(fresh);
          // Count as unread since user hasn't seen them this session
          setUnreadCount(fresh.length);
        }
        // If some were pruned, write cleaned list back
        if (fresh.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        }
      }
    } catch (e) {
      console.warn("Failed to load notification log from localStorage:", e);
    }
  }, []);

  // ── Persist notifications to localStorage whenever the list changes ───────
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.warn("Failed to save notification log to localStorage:", e);
    }
  }, [notifications]);

  // Generate session ID on mount
  useEffect(() => {
    setSessionId("session_" + Math.random().toString(36).substring(2, 9));
    fetchGates();

    if (wsClient) {
      wsClient.connect();

      // Listen for live gate updates
      const unsubGate = wsClient.addListener("GATE_UPDATE", (updatedGate: GateData) => {
        console.log("WebSocket: Gate update received:", updatedGate);
        setGates((prev) =>
          prev.map((g) => (g.gate_id === updatedGate.gate_id ? updatedGate : g))
        );
      });

      // Listen for mass broadcasts — show banner AND log to notification history
      const unsubMass = wsClient.addListener("MASS_NOTIFICATION", (payload: any) => {
        console.log("WebSocket: Broadcast notification received:", payload);

        // Show temporary bounce banner
        setMassNotification(payload.message);
        setTimeout(() => setMassNotification(null), 8000);

        // Append to persistent notification log
        const entry: NotificationEntry = {
          id: Math.random().toString(36).substring(2, 11),
          message: payload.message,
          timestamp: new Date().toISOString(), // ISO string — JSON-safe
        };
        setNotifications((prev) => [entry, ...prev]);
        setUnreadCount((c) => c + 1);
      });

      return () => {
        unsubGate();
        unsubMass();
        wsClient.disconnect();
      };
    }
  }, []);

  // Close drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setShowNotifDrawer(false);
      }
    };
    if (showNotifDrawer) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifDrawer]);

  const handleOpenDrawer = () => {
    setShowNotifDrawer(true);
    setUnreadCount(0); // Mark all as read when drawer opens
  };

  const handleClearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  // Fetch initial gate status
  const fetchGates = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/gate-status");
      if (res.ok) {
        const data = await res.json();
        setGates(data);
      }
    } catch (e) {
      console.error("Failed to fetch initial gates:", e);
    }
  };

  // Process ticket entry
  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket.block) return;
    const info = getBlockDetails(ticket.block);
    setBlockInfo(info);
    setRecommendedGateId(info.primary_gate);
    setTicketSubmitted(true);
  };

  // Determine active gate route taking congestion/overrides into account
  const getActiveGateId = () => {
    if (!recommendedGateId || gates.length === 0) return recommendedGateId;
    const gate = gates.find((g) => g.gate_id === recommendedGateId);
    if (!gate) return recommendedGateId;
    if (gate.status === "Crowded" || gate.status === "Closed") {
      return gate.alternative;
    }
    return recommendedGateId;
  };

  const activeGateId = getActiveGateId();
  const currentRecommendedGate = gates.find((g) => g.gate_id === recommendedGateId) || null;

  // Handle emergency SOS submission
  const handleSOSTrigger = async (msg: string) => {
    setSosLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seat: ticket.seat,
          block: ticket.block,
          gate: activeGateId || "Gate A",
          message: msg,
        }),
      });
      if (!response.ok) throw new Error();
    } catch (e) {
      console.error("Failed to send SOS:", e);
    } finally {
      setSosLoading(false);
    }
  };

  const formatTime = (isoString: string) =>
    new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const formatDate = (isoString: string) =>
    new Date(isoString).toLocaleDateString([], { day: "2-digit", month: "short" });

  // Show relative age label — highlights notifications older than ~5 min
  const getAgeLabel = (isoString: string): string | null => {
    const ageMin = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
    if (ageMin < 1) return null;
    if (ageMin < 60) return `${ageMin}m ago`;
    return `${Math.floor(ageMin / 60)}h ${ageMin % 60}m ago`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between pb-8 select-none">

      {/* ── Sticky Mass Notification Bounce Banner ───────────────────────────── */}
      {massNotification && (
        <div className="fixed bottom-6 left-4 right-4 z-50 bg-indigo-600 border border-indigo-400 p-4 rounded-xl shadow-2xl flex gap-3 items-center text-white animate-bounce max-w-md mx-auto">
          <Bell className="w-5 h-5 flex-shrink-0 text-amber-300" />
          <div className="flex-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">ANNOUNCEMENT:</span>
            <p className="text-xs font-bold leading-tight mt-0.5">{massNotification}</p>
          </div>
        </div>
      )}

      {/* ── Notification Drawer ───────────────────────────────────────────────── */}
      {showNotifDrawer && (
        <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex justify-end">
          <div
            ref={drawerRef}
            className="w-full max-w-sm bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500/15 p-2 rounded-lg">
                  <Bell className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-100">
                    Notification Log
                  </h2>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    {notifications.length} announcement{notifications.length !== 1 ? "s" : ""} received
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    title="Clear all notifications"
                    className="text-slate-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setShowNotifDrawer(false)}
                  className="text-slate-400 hover:text-slate-100 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-600 py-16 gap-3">
                  <div className="bg-slate-800/50 p-5 rounded-full">
                    <Bell className="w-8 h-8 text-slate-700" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-wider text-center text-slate-600">
                    No notifications yet
                  </p>
                  <p className="text-[10px] text-slate-700 font-medium text-center max-w-[200px] leading-relaxed">
                    Stadium announcements broadcast by the organizer will appear here
                  </p>
                </div>
              ) : (
                notifications.map((notif, idx) => (
                  <div
                    key={notif.id}
                    className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-indigo-500/20 p-1 rounded">
                          <Megaphone className="w-3 h-3 text-indigo-400" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400">
                          Stadium Announcement
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-600 font-medium flex-shrink-0">
                        {formatDate(notif.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 font-medium leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-1 text-[9px] text-slate-600 font-medium">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{formatTime(notif.timestamp)}</span>
                      {idx === 0 && (
                        <span className="ml-auto text-[9px] font-black uppercase text-emerald-500/70 tracking-wider">
                          Latest
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            {notifications.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-800 flex-shrink-0">
                <p className="text-[9px] text-slate-700 font-medium text-center uppercase tracking-wider">
                  Persisted locally · Auto-clears after 3 hours
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="w-full border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-4 py-3 flex justify-between items-center z-10 sticky top-0">
        <Link href="/" className="flex items-center gap-1.5 text-slate-400 hover:text-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Exit</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black text-[10px] tracking-wider uppercase">
            FIFA AUDIENCE
          </div>
          <span className="text-[10px] font-black text-slate-100 tracking-wider">WAYFINDING</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification Bell with unread badge */}
          <button
            id="notification-bell-btn"
            onClick={handleOpenDrawer}
            className="relative p-1.5 rounded-lg hover:bg-slate-800 transition-colors duration-200"
            title="Open notification log"
          >
            <Bell
              className={`w-4 h-4 transition-colors ${
                unreadCount > 0 ? "text-indigo-400" : "text-slate-500"
              }`}
            />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-indigo-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 leading-none animate-pulse shadow-lg shadow-indigo-500/30">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
        </div>
      </header>

      {/* ── Portal Views ─────────────────────────────────────────────────────── */}
      <div className="flex-1 w-full max-w-md px-4 py-6 flex flex-col justify-start">
        {!ticketSubmitted ? (
          /* TICKET INPUT STEP */
          <div className="my-auto space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 p-3 rounded-full mx-auto flex items-center justify-center mb-3">
                <Ticket className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-wider">Welcome Spectator</h2>
              <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">
                Please enter your FIFA ticket seating details to construct your interactive Etihad wayfinding path.
              </p>
            </div>

            <form onSubmit={handleSubmitTicket} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                  Seating Block (Etihad Model)
                </label>
                <select
                  value={ticket.block}
                  onChange={(e) => setTicket({ ...ticket, block: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none"
                >
                  <optgroup label="North Stand (Gates A/B)">
                    <option value="136">Block 136</option>
                    <option value="138">Block 138</option>
                    <option value="140">Block 140</option>
                    <option value="142">Block 142</option>
                  </optgroup>
                  <optgroup label="East Stand (Gates C/D)">
                    <option value="101">Block 101</option>
                    <option value="103">Block 103</option>
                    <option value="105">Block 105</option>
                    <option value="107">Block 107</option>
                  </optgroup>
                  <optgroup label="South Stand (Gate E)">
                    <option value="114">Block 114</option>
                    <option value="116">Block 116</option>
                    <option value="118">Block 118</option>
                    <option value="120">Block 120</option>
                  </optgroup>
                  <optgroup label="Colin Bell/West Stand (Gate F)">
                    <option value="122">Block 122</option>
                    <option value="124">Block 124</option>
                    <option value="128">Block 128</option>
                    <option value="130">Block 130</option>
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Row</label>
                  <input
                    type="text"
                    value={ticket.row}
                    onChange={(e) => setTicket({ ...ticket, row: e.target.value.toUpperCase() })}
                    placeholder="e.g. G"
                    maxLength={2}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Seat Number</label>
                  <input
                    type="number"
                    value={ticket.seat}
                    onChange={(e) => setTicket({ ...ticket, seat: e.target.value })}
                    placeholder="e.g. 15"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold uppercase py-3 rounded-xl text-xs tracking-wider transition-all duration-200 shadow-lg shadow-amber-500/10 mt-2"
              >
                Generate Path
              </button>
            </form>
          </div>
        ) : (
          /* ACTIVE NAVIGATION WAYFINDING PORTAL */
          <div className="space-y-6">

            {/* Real-time Dynamic Rerouting Banner */}
            <AlertBanner
              currentGate={currentRecommendedGate}
              onRerouteAccept={() => console.log("Reroute acknowledged")}
            />

            {/* Seating Details Card */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-center shadow-lg">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Your Seating Details</span>
                <h3 className="text-sm font-black uppercase text-slate-100 mt-0.5">
                  Block {ticket.block} • Row {ticket.row} • Seat {ticket.seat}
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  {blockInfo?.stand} • Level {ticket.block[0]}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Assigned Gate</span>
                <div className="text-sm font-extrabold text-emerald-400 uppercase mt-0.5 flex gap-1 items-center justify-end">
                  <span>{activeGateId}</span>
                  {activeGateId !== recommendedGateId && (
                    <span className="text-[10px] text-amber-500 animate-pulse font-extrabold">(Rerouted)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Wayfinding Stadium Map */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Etihad Map Wayfinding</span>
                <span className="text-[9px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded font-bold border border-slate-800">
                  Target: {blockInfo?.stand}
                </span>
              </div>
              <StadiumMap
                gates={gates}
                selectedBlock={ticket.block}
                selectedGateId={activeGateId}
                blockCoords={blockInfo ? { x: blockInfo.x, y: blockInfo.y } : null}
              />
            </div>

            {/* Emergency & AI Concourse Support */}
            <div className="grid grid-cols-1 gap-6 mt-4">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">Concourse Assistant</span>
                <ChatAssistant sessionId={sessionId} />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">Emergency SOS Trigger</span>
                <SOSButton onTrigger={handleSOSTrigger} isLoading={sosLoading} />
              </div>
            </div>

            {/* Back Button */}
            <button
              onClick={() => setTicketSubmitted(false)}
              className="w-full text-slate-500 hover:text-slate-300 font-bold uppercase tracking-wider text-[10px] text-center pt-2"
            >
              Change Seating details
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="w-full text-center text-[8px] text-slate-600 font-bold uppercase tracking-wider mt-4">
        FIFA Crowd Management Mobile Portal
      </footer>
    </div>
  );
}

// Client-side replica of the block details calculations
function getBlockDetails(blockNum: string) {
  const lvl = parseInt(blockNum[0]) || 1;
  const idx = parseInt(blockNum.substring(1)) || 1;

  let stand = "North Stand";
  let primary_gate = "Gate A";
  let angle_offset = 230;

  if (idx <= 9) {
    stand = "East Stand";
    primary_gate = idx <= 5 ? "Gate C" : "Gate D";
    angle_offset = -40 + (idx * 10);
  } else if (idx >= 14 && idx <= 20) {
    stand = "South Stand";
    primary_gate = "Gate E";
    angle_offset = 55 + ((idx - 14) * 11.6);
  } else if (idx >= 22 && idx <= 32) {
    stand = "West Stand";
    primary_gate = "Gate F";
    angle_offset = 135 + ((idx - 22) * 9);
  } else {
    stand = "North Stand";
    primary_gate = idx <= 39 ? "Gate A" : "Gate B";
    angle_offset = 230 + ((idx - 36) * 11);
  }

  const rad = (angle_offset * Math.PI) / 180;
  const dist = 22 + (lvl * 5.5);
  const x = 50 + dist * Math.cos(rad);
  const y = 50 + dist * Math.sin(rad);

  return {
    block: blockNum,
    stand,
    primary_gate,
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
  };
}
