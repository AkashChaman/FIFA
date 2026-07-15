"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Map as MapIcon } from "lucide-react";
import StadiumMap, { GateData, POIData } from "@/components/StadiumMap";

export default function ModelPage() {
  const [gates, setGates] = useState<GateData[]>([]);
  const [pois, setPois] = useState<POIData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gatesRes, poisRes] = await Promise.all([
          fetch("http://127.0.0.1:8000/api/gate-status"),
          fetch("http://127.0.0.1:8000/api/pois")
        ]);
        
        if (gatesRes.ok) setGates(await gatesRes.json());
        if (poisRes.ok) setPois(await poisRes.json());
      } catch (e) {
        console.error("Failed to fetch stadium data", e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0038FF] text-white flex flex-col font-sans select-none relative overflow-hidden">
      
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0"></div>
      {/* Header */}
      <header className="w-full border-b-4 border-black bg-white px-6 py-4 flex justify-between items-center z-10 shadow-[0_8px_0_0_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1.5 text-black hover:text-[#0038FF] transition-colors mr-2">
            <ArrowLeft className="w-4 h-4 font-black" />
            <span className="text-xs font-black uppercase tracking-wider">Back</span>
          </Link>
          <div className="bg-[#CCFF00] text-black border-2 border-black p-1.5 rounded-lg font-black text-xs tracking-wider uppercase shadow-[2px_2px_0_0_#000]">
            STADIUM MODEL
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-black">Etihad Stadium Simulation</h1>
            <p className="text-[9px] text-black/60 font-black uppercase tracking-wider">Interactive Top-Down View</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col items-center justify-center w-full max-w-[1200px] mx-auto">
        <div className="w-full bg-white border-4 border-black rounded-[2rem] p-8 shadow-[12px_12px_0_0_#000] text-black relative">
          
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#0038FF] text-white p-2 rounded-xl shadow-[4px_4px_0_0_#000]">
                <MapIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-wider text-black">Digital Twin Map</h2>
                <p className="text-xs text-black/60 font-bold uppercase tracking-wider mt-1">Live overview of gates, seating, food stalls, and restrooms</p>
              </div>
            </div>
            
            {!loading && (
              <div className="flex gap-4 items-center bg-[#F8F9FA] px-4 py-2 border-2 border-black rounded-xl shadow-[4px_4px_0_0_#000]">
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase text-black/60">Total Gates</p>
                  <p className="text-lg font-black">{gates.length}</p>
                </div>
                <div className="w-0.5 h-8 bg-black/10"></div>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase text-black/60">Total POIs</p>
                  <p className="text-lg font-black">{pois.length}</p>
                </div>
              </div>
            )}
          </div>

          <div className="w-full flex justify-center bg-[#F8F9FA] rounded-2xl border-2 border-black/10 p-4">
            {loading ? (
              <div className="h-[400px] flex items-center justify-center">
                <div className="w-8 h-8 border-t-4 border-l-4 border-[#0038FF] border-solid rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="w-full max-w-4xl relative">
                {/* 
                  StadiumMap is naturally responsive and expects to fill its container.
                  We use heatmapMode=false by default so seating blocks don't fill with colors 
                  and we can see the icons clearly. 
                */}
                <StadiumMap 
                  gates={gates} 
                  pois={pois} 
                  interactive={true}
                  heatmapMode={false} 
                />
              </div>
            )}
          </div>
          
        </div>
      </main>
    </div>
  );
}
