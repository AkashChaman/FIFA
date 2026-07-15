"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { wsClient } from "@/utils/websocket";
import { API_BASE_URL } from "@/utils/config";
import StadiumMap, { GateData, POIData } from "@/components/StadiumMap";
import { 
  Settings2, ArrowLeft, Radio, ShieldAlert, CheckCircle2, 
  Sparkles, Megaphone, Users, UserCheck, AlertTriangle, Clock, ChevronDown, ChevronUp, RotateCcw, Trash2
} from "lucide-react";

interface SOSAlert {
  id: number;
  seat: string;
  block: string;
  gate: string;
  message: string;
  status: "Active" | "Resolved";
  created_at: string;
}

export default function OrganizerDashboard() {
  const [gates, setGates] = useState<GateData[]>([]);
  const [pois, setPois] = useState<POIData[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SOSAlert[]>([]);
  const [resolvedLog, setResolvedLog] = useState<SOSAlert[]>([]);
  const [showResolvedLog, setShowResolvedLog] = useState(false);
  const [selectedGateId, setSelectedGateId] = useState("Gate A");
  
  // Override panel states
  const [overrideStatus, setOverrideStatus] = useState<"Open" | "Crowded" | "Closed">("Open");
  const [overrideCount, setOverrideCount] = useState(15);
  
  // Broadcast states
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  
  // GenAI states
  const [summarizing, setSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState("");

  // Ref keeps selectedGateId accessible inside WS callbacks without stale closures
  const selectedGateIdRef = useRef(selectedGateId);
  useEffect(() => {
    selectedGateIdRef.current = selectedGateId;
  }, [selectedGateId]);

  // ── Effect 1: Initial data fetch (runs once on mount) ──────────────────────
  useEffect(() => {
    fetchGates();
    fetchPOIs();
    fetchSOSAlerts();
    triggerAISummary();
  }, []);

  // ── Effect 2: WebSocket setup (runs once on mount, cleans up on unmount) ───
  // IMPORTANT: This must NOT depend on selectedGateId — doing so would
  // disconnect/reconnect the socket on every gate click, losing broadcasts.
  useEffect(() => {
    if (!wsClient) return;

    wsClient.connect();

    // Live gate crowd updates
    const unsubGate = wsClient.addListener("GATE_UPDATE", (updatedGate: GateData) => {
      console.log("Organizer WS: Gate update:", updatedGate);
      setGates((prev) =>
        prev.map((g) => (g.gate_id === updatedGate.gate_id ? updatedGate : g))
      );
      // Use ref to read current gate selection without stale closure
      if (updatedGate.gate_id === selectedGateIdRef.current) {
        setOverrideStatus(updatedGate.status);
        setOverrideCount(updatedGate.crowd_count);
      }
    });

    // Real-time SOS alerts from audience — also handles re-opened alerts from organizer
    const unsubSOS = wsClient.addListener("SOS_ALERT", (newAlert: SOSAlert) => {
      console.log("Organizer WS: New/Re-opened SOS alert:", newAlert);
      // Remove from resolved log if it was previously closed, then add to active
      setResolvedLog((prev) => prev.filter((a) => a.id !== newAlert.id));
      setSosAlerts((prev) => {
        const exists = prev.some((a) => a.id === newAlert.id);
        return exists ? prev.map((a) => (a.id === newAlert.id ? newAlert : a)) : [newAlert, ...prev];
      });
      triggerAISummary();
    });

    // SOS resolved by organizer — move from active list to resolved log
    const unsubResolve = wsClient.addListener("SOS_RESOLVED", (resolvedAlert: SOSAlert) => {
      console.log("Organizer WS: SOS resolved:", resolvedAlert);
      setSosAlerts((prev) => prev.filter((a) => a.id !== resolvedAlert.id));
      setResolvedLog((prev) => [resolvedAlert, ...prev]);
      triggerAISummary();
    });

    // Polling fallback: re-fetch SOS every 10s in case a WS event was missed
    const sosPollInterval = setInterval(fetchSOSAlerts, 10000);

    return () => {
      unsubGate();
      unsubSOS();
      unsubResolve();
      clearInterval(sosPollInterval);
      wsClient?.disconnect();
    };
  }, []);

  // ── Effect 3: Sync override form when gate selection changes ───────────────
  useEffect(() => {
    const selectedGate = gates.find((g) => g.gate_id === selectedGateId);
    if (selectedGate) {
      setOverrideStatus(selectedGate.status);
      setOverrideCount(selectedGate.crowd_count);
    }
  }, [selectedGateId, gates]);

  const fetchGates = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/gate-status`);
      if (res.ok) {
        const data = await res.json();
        setGates(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPOIs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/pois`);
      if (res.ok) setPois(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSOSAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/sos`);
      if (res.ok) {
        const data: SOSAlert[] = await res.json();

        // ── Merge strategy ────────────────────────────────────────────────────
        // Never wipe WS-delivered alerts. Build a unified Map from both the
        // existing in-memory state and the API response, keyed by alert ID.
        // API data takes precedence for status updates (e.g. if resolved via
        // another session), but alerts present in memory are never dropped
        // just because the poll response hasn't caught up yet.
        setSosAlerts((prev) => {
          const merged = new Map(prev.map((a) => [a.id, a]));
          data.forEach((a) => merged.set(a.id, a)); // API overwrites stale in-mem copies
          return Array.from(merged.values())
            .filter((a) => a.status === "Active")
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        });

        setResolvedLog((prev) => {
          const merged = new Map(prev.map((a) => [a.id, a]));
          data.filter((a) => a.status === "Resolved").forEach((a) => merged.set(a.id, a));
          return Array.from(merged.values())
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        });
      }
    } catch (e) {
      console.error(e);
    }
  };


  // Submit gate override
  const handleSaveOverride = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gate-status/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gate_id: selectedGateId,
          status: overrideStatus,
          crowd_count: overrideCount,
        }),
      });
      if (response.ok) {
        // Notification message
        console.log("Override saved successfully.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Resolve an alert — moves it from active inbox to resolved log
  const handleResolveAlert = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sos/resolve/${id}`, {
        method: "POST",
      });
      if (!response.ok) throw new Error();
    } catch (e) {
      console.error(e);
    }
  };

  // Unresolve an alert — pushes it back from resolved log to active inbox
  const handleUnresolveAlert = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sos/unresolve/${id}`, {
        method: "POST",
      });
      if (!response.ok) throw new Error();
    } catch (e) {
      console.error(e);
    }
  };

  // Broadcast announcement
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: broadcastMessage }),
      });
      if (response.ok) {
        setBroadcastMessage("");
        setBroadcastSuccess(true);
        setTimeout(() => setBroadcastSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Groq aggregate summaries
  const triggerAISummary = async () => {
    setSummarizing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts/summary`);
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.summary);
      }
    } catch (e) {
      console.error(e);
      setAiSummary("Error generating AI analysis report. Check server logs.");
    } finally {
      setSummarizing(false);
    }
  };

  // Render HTML formatted lines for AI markdown simulation
  const renderAISummaryText = (text: string) => {
    return text.split("\n").map((line, idx) => {
      if (line.startsWith("### ")) {
        return <h4 key={idx} className="text-sm font-black uppercase text-[#0038FF] tracking-wider mt-4 mb-2 first:mt-0">{line.replace("### ", "")}</h4>;
      }
      if (line.startsWith("#### ")) {
        return <h5 key={idx} className="text-xs font-black uppercase text-black/70 tracking-wide mt-3 mb-1">{line.replace("#### ", "")}</h5>;
      }
      if (line.startsWith("- ⚠️") || line.startsWith("- **CONGESTION")) {
        return (
          <div key={idx} className="flex gap-2 bg-[#CCFF00] border-2 border-black p-2.5 rounded-lg text-xs text-black font-black mt-2 mb-2 leading-relaxed shadow-[2px_2px_0_0_#000]">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-black mt-0.5 animate-pulse" />
            <p>{line.substring(2)}</p>
          </div>
        );
      }
      if (line.startsWith("- 🩺") || line.startsWith("- **MEDICAL")) {
        return (
          <div key={idx} className="flex gap-2 bg-[#0038FF] border-2 border-black p-2.5 rounded-lg text-xs text-white font-black mt-2 mb-2 leading-relaxed shadow-[2px_2px_0_0_#000]">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-white mt-0.5" />
            <p>{line.substring(2)}</p>
          </div>
        );
      }
      if (line.startsWith("- ") || line.startsWith("  - ")) {
        return <p key={idx} className="text-xs text-black/80 font-bold pl-4 py-0.5 relative before:content-['•'] before:absolute before:left-1 before:text-black/40">{line.replace(/^(\s*-\s*|\s*\*\s*)/, "")}</p>;
      }
      return <p key={idx} className="text-xs text-black/70 leading-relaxed font-bold mt-1">{line}</p>;
    });
  };

  const selectedGate = gates.find((g) => g.gate_id === selectedGateId);
  const activeSOS = sosAlerts; // already filtered to Active only
  // Unique block numbers with active SOS — used to highlight on the heatmap
  const sosBlocks = [...new Set(activeSOS.map((a) => a.block))];

  return (
    <div className="min-h-screen bg-[#0038FF] text-white flex flex-col font-sans select-none relative overflow-hidden">
      
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0"></div>
      {/* Header */}
      <header className="w-full border-b-4 border-black bg-white px-6 py-4 flex justify-between items-center z-10 sticky top-0 shadow-[0_8px_0_0_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1.5 text-black hover:text-[#0038FF] transition-colors mr-2">
            <ArrowLeft className="w-4 h-4 font-black" />
            <span className="text-xs font-black uppercase tracking-wider">Back</span>
          </Link>
          <div className="bg-[#CCFF00] text-black border-2 border-black p-1.5 rounded-lg font-black text-xs tracking-wider uppercase shadow-[2px_2px_0_0_#000]">
            FIFA CONTROL
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-black">Etihad Command Dashboard</h1>
            <p className="text-[9px] text-black/60 font-black uppercase tracking-wider">FIFA 2026 Operational Telemetry</p>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2 bg-[#F8F9FA] border-2 border-black px-3 py-1.5 rounded-xl shadow-[2px_2px_0_0_#000]">
            <div className="w-2 h-2 rounded-full bg-[#0038FF] animate-pulse border border-black"></div>
            <span className="text-[10px] text-black font-black uppercase tracking-wider">OpenCV Camera Feeds Syncing</span>
          </div>
          <Radio className="w-5 h-5 text-[#0038FF] animate-pulse" />
        </div>
      </header>

      {/* Main Grid Body */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1400px] w-full mx-auto">
        
        {/* Left Hand: Stadium Map Heatmap & Overrides (7/12 cols) */}
        <section className="lg:col-span-7 space-y-6 flex flex-col justify-start">
          
          {/* Map display */}
          <div className="bg-white border-4 border-black rounded-2xl p-5 shadow-[8px_8px_0_0_#000] text-black">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-black">Live Crowd density Heatmap</h3>
                <p className="text-[10px] text-black/60 font-black uppercase tracking-wider">Interactive Etihad Gate Nodes</p>
              </div>
              <span className="text-[9px] bg-[#CCFF00] text-black px-2 py-0.5 rounded-full border-2 border-black font-black shadow-[2px_2px_0_0_#000]">
                Map View: Scale 100%
              </span>
            </div>
            
            <StadiumMap
              gates={gates}
              pois={pois}
              selectedGateId={selectedGateId}
              interactive={true}
              onGateClick={(id) => setSelectedGateId(id)}
              heatmapMode={true}
              sosBlocks={sosBlocks}
            />
          </div>

          {/* Override Panel */}
          {selectedGate && (
            <div className="bg-white border-4 border-black rounded-2xl p-5 shadow-[8px_8px_0_0_#000] space-y-4 text-black">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-black/60">Gate Management</span>
                  <h3 className="text-base font-black uppercase text-[#0038FF] mt-0.5">{selectedGate.name}</h3>
                  <p className="text-xs text-black/80 mt-1 font-bold">{selectedGate.description}</p>
                </div>
                
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider text-black/60">Current Load</span>
                  <p className="text-lg font-black text-black mt-0.5">
                    {selectedGate.crowd_count} <span className="text-xs text-black/60 font-black">/ {selectedGate.capacity}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t-2 border-black/10">
                {/* Status selector */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase text-black/60 tracking-wider">
                    Override Status
                  </label>
                  <div className="flex gap-2">
                    {["Open", "Crowded", "Closed"].map((s) => {
                      const active = overrideStatus === s;
                      let color = "bg-[#F8F9FA] text-black border-2 border-black shadow-[2px_2px_0_0_#000] hover:bg-black/5";
                      if (active) {
                        if (s === "Open") color = "bg-[#CCFF00] text-black border-2 border-black shadow-[2px_2px_0_0_#000] translate-y-0.5 shadow-none";
                        if (s === "Crowded") color = "bg-orange-400 text-black border-2 border-black shadow-[2px_2px_0_0_#000] translate-y-0.5 shadow-none";
                        if (s === "Closed") color = "bg-[#0038FF] text-white border-2 border-black shadow-[2px_2px_0_0_#000] translate-y-0.5 shadow-none";
                      }
                      return (
                        <button
                          key={s}
                          onClick={() => setOverrideStatus(s as any)}
                          className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all duration-150 ${color}`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Crowd slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-black uppercase text-black/60 tracking-wider">
                      Simulated Spectator Density
                    </label>
                    <span className="text-xs font-black text-black">{overrideCount}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={selectedGate.capacity + 20}
                    value={overrideCount}
                    onChange={(e) => setOverrideCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-black/10 rounded-lg appearance-none cursor-pointer accent-[#0038FF]"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2 justify-end">
                <button
                  onClick={handleSaveOverride}
                  className="bg-[#CCFF00] hover:bg-[#b3ff00] text-black border-2 border-black font-black uppercase px-6 py-2.5 rounded-xl text-xs tracking-wider transition-all duration-200 shadow-[4px_4px_0_0_#000] active:translate-y-1 active:shadow-none flex gap-2 items-center"
                >
                  <Settings2 className="w-4 h-4" />
                  <span>Apply Gate Override</span>
                </button>
              </div>
            </div>
          )}

        </section>

        {/* Right Hand: SOS Inbox, Groq Summary and Broadcast (5/12 cols) */}
        <section className="lg:col-span-5 space-y-6 flex flex-col justify-start">
          
          {/* Mass Broadcast Panel */}
          <div className="bg-white border-4 border-black rounded-2xl p-5 shadow-[8px_8px_0_0_#000] space-y-3 text-black">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-black">Mass Broadcaster</h3>
              <p className="text-[10px] text-black/60 font-black uppercase tracking-wider">Broadcast notifications directly to spectators</p>
            </div>
            
            <form onSubmit={handleBroadcast} className="flex gap-2">
              <input
                type="text"
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="e.g. Follow detours toward Gate B..."
                className="flex-1 bg-[#F8F9FA] border-2 border-black focus:border-[#0038FF] rounded-xl px-3 py-2.5 text-xs text-black font-bold outline-none"
              />
              <button
                type="submit"
                disabled={!broadcastMessage.trim()}
                className="bg-[#CCFF00] hover:bg-[#b3ff00] disabled:bg-black/10 text-black border-2 border-black disabled:border-black/10 disabled:text-black/40 px-4 rounded-xl text-xs font-black uppercase transition-all duration-200 flex gap-2 items-center shadow-[4px_4px_0_0_#000] active:translate-y-1 active:shadow-none disabled:shadow-none"
              >
                <Megaphone className="w-4 h-4" />
                <span>Send</span>
              </button>
            </form>
            {broadcastSuccess && (
              <p className="text-[10px] text-[#0038FF] font-black uppercase tracking-wider animate-pulse">
                Broadcast successfully transmitted.
              </p>
            )}
          </div>

          {/* Alert Command Center (AI analysis inbox) */}
          <div className="bg-white border-4 border-black rounded-2xl p-5 shadow-[8px_8px_0_0_#000] space-y-4 text-black">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-black">GenAI Alert Hub</h3>
                <p className="text-[10px] text-black/60 font-black uppercase tracking-wider">Grouped incident reports & summaries</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAiSummary("")}
                  disabled={summarizing || !aiSummary}
                  className="bg-white hover:bg-red-50 text-black border-2 border-black disabled:border-black/10 disabled:text-black/40 font-black uppercase px-3 py-1.5 rounded-lg text-[9px] tracking-wider transition-all duration-200 flex gap-1.5 items-center shadow-[4px_4px_0_0_#000] active:translate-y-1 active:shadow-none disabled:shadow-none"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
                <button
                  onClick={triggerAISummary}
                  disabled={summarizing}
                  className="bg-[#0038FF] hover:bg-blue-700 disabled:bg-black/10 text-white disabled:text-black/40 border-2 border-black disabled:border-black/10 font-black uppercase px-3 py-1.5 rounded-lg text-[9px] tracking-wider transition-all duration-200 flex gap-1.5 items-center shadow-[4px_4px_0_0_#000] active:translate-y-1 active:shadow-none disabled:shadow-none"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{summarizing ? "Analyzing..." : "Re-Analyze"}</span>
                </button>
              </div>
            </div>

            {/* AI Summary Block */}
            <div className="bg-[#F8F9FA] border-2 border-black rounded-xl p-4 min-h-[120px] max-h-[220px] overflow-y-auto font-sans leading-relaxed text-black shadow-inner">
              {summarizing ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-black/40 gap-2">
                  <div className="w-6 h-6 border-t-4 border-r-4 border-[#0038FF] border-solid rounded-full animate-spin"></div>
                  <span className="text-[10px] uppercase font-black tracking-wider animate-pulse text-[#0038FF]">Groq executing data grouping analysis...</span>
                </div>
              ) : aiSummary ? (
                <div className="space-y-1">{renderAISummaryText(aiSummary)}</div>
              ) : (
                <p className="text-xs text-black/60 font-black uppercase text-center py-8">No incident metrics available for analysis.</p>
              )}
            </div>
          </div>

          {/* SOS Active Inbox */}
          <div className="bg-white border-4 border-black rounded-2xl p-5 shadow-[8px_8px_0_0_#000] flex flex-col min-h-[280px] text-black">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-black">SOS Incident Box</h3>
                <p className="text-[10px] text-black/60 font-black uppercase tracking-wider">Active emergency distress pings</p>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border-2 ${
                activeSOS.length > 0 ? "bg-[#CCFF00] border-black text-black animate-pulse shadow-[2px_2px_0_0_#000]" : "bg-black/5 border-transparent text-black/40"
              }`}>
                {activeSOS.length} Active
              </span>
            </div>

            {/* Active SOS List — persists until Resolve is clicked */}
            <div className="flex-1 overflow-y-auto space-y-3 max-h-[320px]">
              {activeSOS.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-10 text-black/40">
                  <CheckCircle2 className="w-8 h-8 text-[#0038FF] mb-2 border border-transparent rounded-full" />
                  <p className="text-xs font-black uppercase tracking-wider">All clear — no active alerts</p>
                </div>
              ) : (
                activeSOS.map((alert) => (
                  <div
                    key={alert.id}
                    className="bg-[#F8F9FA] border-2 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-3.5 flex justify-between items-start gap-4 transition-all duration-300"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase bg-red-500 text-white border border-black shadow-[1px_1px_0_0_#000]">
                          Block {alert.block}
                        </span>
                        <span className="text-[10px] text-black font-black">Seat {alert.seat}</span>
                        <span className="text-[9px] text-black/60 font-bold flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(alert.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p className="text-xs text-black font-black pt-1 leading-relaxed">
                        {alert.message || "Emergency SOS ping triggered."}
                      </p>
                      <p className="text-[9px] text-black/60 font-bold">Gate: {alert.gate}</p>
                    </div>

                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      className="bg-[#0038FF] hover:bg-blue-700 text-white border-2 border-black px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase flex gap-1 items-center transition-all duration-200 shadow-[2px_2px_0_0_#000] active:translate-y-0.5 active:shadow-none flex-shrink-0"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Resolve</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Resolved SOS Log — collapsible */}
          <div className="bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0_0_#000] overflow-hidden text-black mb-10">
            <button
              onClick={() => setShowResolvedLog((v) => !v)}
              className="w-full flex justify-between items-center px-5 py-3.5 hover:bg-black/5 transition-colors duration-200"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#0038FF]" />
                <div className="text-left">
                  <h3 className="text-sm font-black uppercase tracking-wider text-black">Resolved SOS Log</h3>
                  <p className="text-[10px] text-black/60 font-black uppercase tracking-wider">{resolvedLog.length} incidents closed</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {resolvedLog.length > 0 && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border-2 border-black bg-[#CCFF00] text-black shadow-[2px_2px_0_0_#000]">
                    {resolvedLog.length}
                  </span>
                )}
                {showResolvedLog
                  ? <ChevronUp className="w-5 h-5 text-black" />
                  : <ChevronDown className="w-5 h-5 text-black" />}
              </div>
            </button>

            {showResolvedLog && (
              <div className="px-5 pb-4 space-y-2.5 max-h-[280px] overflow-y-auto border-t-2 border-black/10 pt-3">
                {resolvedLog.length === 0 ? (
                  <p className="text-xs text-black/60 font-black uppercase text-center py-6">No resolved alerts yet.</p>
                ) : (
                  resolvedLog.map((alert) => (
                    <div
                      key={alert.id}
                      className="bg-black/5 border-2 border-transparent hover:border-black rounded-xl p-3 flex items-start justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-[#0038FF] flex-shrink-0 mt-0.5" />
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase border border-black bg-white text-black shadow-[1px_1px_0_0_#000]">
                              Block {alert.block}
                            </span>
                            <span className="text-[10px] text-black font-black">Seat {alert.seat}</span>
                            <span className="text-[9px] text-[#0038FF] font-black uppercase tracking-wider">Resolved</span>
                          </div>
                          <p className="text-[11px] text-black/80 font-bold leading-relaxed">
                            {alert.message || "Emergency SOS ping triggered."}
                          </p>
                          <p className="text-[9px] text-black/60 font-bold flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            Pinged at {new Date(alert.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})} · Gate: {alert.gate}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUnresolveAlert(alert.id)}
                        title="Re-open this alert and move it back to the active SOS inbox"
                        className="flex-shrink-0 bg-white hover:bg-black/5 border-2 border-black text-black px-2 py-1.5 rounded-lg text-[9px] font-black uppercase flex gap-1 items-center transition-all duration-200 shadow-[2px_2px_0_0_#000] active:translate-y-0.5 active:shadow-none"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Re-open</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

        </section>

      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 mt-6">
        <p className="text-[8px] text-white/50 font-bold uppercase tracking-wider">
          FIFA Control Room Dashboard • Manchester Etihad Model
        </p>
      </footer>
    </div>
  );
}
