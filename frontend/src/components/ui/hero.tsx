"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { User, Settings2, ShieldAlert } from 'lucide-react';

// --- Custom SVG Components for Hand-Drawn Accents ---

const ArrowGreenLeft = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full text-[#CCFF00] stroke-current overflow-visible" fill="none" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10,90 C 10,40 40,20 60,50 C 70,65 80,75 95,70" />
    <path d="M80,55 L95,70 L85,85" />
  </svg>
);

const ArrowGreenRight = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full text-[#CCFF00] stroke-current overflow-visible" fill="none" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M90,10 C 80,60 60,80 40,60 C 20,40 40,20 60,30 C 80,40 70,70 50,80" />
    <path d="M65,75 L50,80 L55,65" />
  </svg>
);

const ArrowBlack1 = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full text-black stroke-current overflow-visible" fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20,80 Q 40,20 80,40" />
    <path d="M60,20 L80,40 L50,60" />
  </svg>
);

const ArrowBlack2 = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full text-black stroke-current overflow-visible" fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20,80 Q 40,20 80,40" />
    <path d="M60,20 L80,40 L50,60" />
  </svg>
);

const CircularBadge = () => (
  <div className="relative w-28 h-28 md:w-36 md:h-36 bg-[#CCFF00] rounded-full flex items-center justify-center shadow-xl rotate-12 hover:scale-105 transition-transform cursor-pointer border-[3px] border-black/5">
    <div className="absolute inset-1 animate-[spin_10s_linear_infinite]">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path id="circlePath" d="M 50, 50 m -36, 0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" fill="none" />
        <text className="text-[11px] font-black tracking-[0.18em] uppercase" fill="black">
          <textPath href="#circlePath" startOffset="0%">
            ACTIVE ALERTS • STAY SAFE • ACTIVE ALERTS • STAY SAFE • 
          </textPath>
        </text>
      </svg>
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-10 h-10 text-black stroke-current overflow-visible" fill="none" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20,80 Q 40,50 30,30 T 80,20" />
        <path d="M60,10 L80,20 L70,40" />
      </svg>
    </div>
  </div>
);

export const Component = () => {
  const [stats, setStats] = useState({ activeSOS: 0, crowdedGates: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sosRes, gateRes] = await Promise.all([
          fetch("http://127.0.0.1:8000/api/sos").catch(() => null),
          fetch("http://127.0.0.1:8000/api/gate-status").catch(() => null)
        ]);
        
        let activeSOS = 0;
        let crowdedGates = 0;

        if (sosRes && sosRes.ok) {
          const sosData = await sosRes.json();
          activeSOS = sosData.filter((a: any) => a.status === "Active").length;
        }

        if (gateRes && gateRes.ok) {
          const gateData = await gateRes.json();
          crowdedGates = gateData.filter((g: any) => g.status === "Crowded" || g.status === "Closed").length;
        }

        setStats({ activeSOS, crowdedGates });
      } catch (e) {
        console.error("Failed to fetch live stats", e);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0038FF] flex flex-col font-sans selection:bg-[#CCFF00] selection:text-black relative overflow-hidden w-full">
      
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0"></div>

      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-6 md:px-10 md:py-8 max-w-[1440px] mx-auto w-full">
        {/* Logo */}
        <div className="flex items-center gap-1">
          <div className="bg-white text-black font-black tracking-tight text-xs md:text-sm px-3 py-1.5 rounded-2xl rounded-bl-sm relative shadow-sm">
            FIFA26
            <div className="absolute -bottom-1.5 left-0 w-3 h-3 bg-white" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}></div>
          </div>
          <div className="bg-[#CCFF00] text-black font-black text-xs md:text-sm px-3 py-1.5 rounded-full border-[1.5px] border-white shadow-sm">
            SAFETY
          </div>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-2">
          {['Etihad Stadium', 'Command Center', 'Emergency Protocols', 'Live Data'].map((item) => (
            <a key={item} href="#" className="px-4 py-1.5 rounded-full border border-white/30 text-white text-xs font-semibold hover:bg-white/10 transition-colors">
              {item}
            </a>
          ))}
        </div>

        {/* Connect Button */}
        <button className="px-6 py-2 rounded-full border border-white text-white text-xs md:text-sm font-semibold hover:bg-white hover:text-[#0038FF] transition-colors">
          Join Network
        </button>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 relative z-10 pt-8 pb-32 md:pt-12 md:pb-48 px-4 flex flex-col items-center justify-center w-full max-w-[1440px] mx-auto">
        
        {/* Massive Typography & Elements Container */}
        <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center justify-center text-center z-10 mt-4 mb-16">
          
          {/* Text Stack */}
          <div className="w-full flex flex-col items-center relative z-10 space-y-2 md:space-y-4">
            
            {/* #FIFA26 */}
            <div className="w-full flex justify-start pl-[10%] md:pl-[25%] relative z-30">
              <h1 
                className="text-[clamp(4.5rem,12vw,160px)] font-black leading-[0.85] tracking-tighter text-[#CCFF00] m-0 p-0 uppercase"
                style={{ 
                  fontFamily: '"Arial Black", Impact, sans-serif',
                  textShadow: '1px 1px 0 #001A99, 2px 2px 0 #001A99, 3px 3px 0 #001A99, 4px 4px 0 #001A99, 5px 5px 0 #001A99, 6px 6px 0 #001A99, 7px 7px 0 #001A99, 8px 8px 0 #001A99, 9px 9px 0 #001A99, 10px 10px 0 #001A99, 11px 11px 0 #001A99, 12px 12px 0 #001A99, 13px 13px 0 #001A99, 14px 14px 0 #001A99'
                }}
              >
                #FIFA26
              </h1>
            </div>
            
            {/* SAFETY */}
            <div className="w-full flex justify-center relative z-20">
              <h1 
                className="text-[clamp(5rem,15vw,220px)] font-black leading-[0.85] tracking-tighter text-white m-0 p-0 uppercase"
                style={{ 
                  fontFamily: '"Arial Black", Impact, sans-serif',
                  textShadow: '1px 1px 0 #001A99, 2px 2px 0 #001A99, 3px 3px 0 #001A99, 4px 4px 0 #001A99, 5px 5px 0 #001A99, 6px 6px 0 #001A99, 7px 7px 0 #001A99, 8px 8px 0 #001A99, 9px 9px 0 #001A99, 10px 10px 0 #001A99, 11px 11px 0 #001A99, 12px 12px 0 #001A99, 13px 13px 0 #001A99, 14px 14px 0 #001A99'
                }}
              >
                SAFETY
              </h1>
            </div>
            
            {/* NETWORK */}
            <div className="w-full flex justify-start pl-[15%] md:pl-[30%] relative z-10">
              <h1 
                className="text-[clamp(4.5rem,12vw,160px)] font-black leading-[0.85] tracking-tighter text-white m-0 p-0 uppercase"
                style={{ 
                  fontFamily: '"Arial Black", Impact, sans-serif',
                  textShadow: '1px 1px 0 #001A99, 2px 2px 0 #001A99, 3px 3px 0 #001A99, 4px 4px 0 #001A99, 5px 5px 0 #001A99, 6px 6px 0 #001A99, 7px 7px 0 #001A99, 8px 8px 0 #001A99, 9px 9px 0 #001A99, 10px 10px 0 #001A99, 11px 11px 0 #001A99, 12px 12px 0 #001A99, 13px 13px 0 #001A99, 14px 14px 0 #001A99'
                }}
              >
                NETWORK
              </h1>
            </div>

          </div>

          {/* Absolute Overlays (Cards, Arrows, Badge) */}
          <div className="absolute inset-0 w-full h-full pointer-events-none">
            
            {/* Floating Glass Card 1 (Bottom Left) */}
            <motion.div 
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-[10%] left-[5%] md:left-[20%] z-30 pointer-events-auto cursor-pointer"
            >
              <Link href="/audience">
              <div className="w-40 md:w-52 aspect-[3/3.5] bg-white/20 backdrop-blur-md border border-white/40 rounded-[2rem] p-5 flex flex-col items-center justify-center rotate-[-12deg] shadow-2xl hover:rotate-0 transition-transform duration-500">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-[#D2B48C] rounded-full flex items-center justify-center mb-4 shadow-inner border-[3px] border-white/50 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80" alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="text-center mt-2">
                  <p className="font-bold text-sm md:text-lg text-white">fan_johndoe</p>
                  <p className="text-[10px] md:text-xs text-white/80 mt-1">Sector B122</p>
                </div>
              </div>
              </Link>
            </motion.div>

            {/* Floating Glass Card 2 (Top Right) */}
            <motion.div 
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-[15%] right-[5%] md:right-[22%] z-30 pointer-events-auto cursor-pointer"
            >
              <Link href="/organizer">
              <div className="w-40 md:w-52 aspect-[3/3.5] bg-white/20 backdrop-blur-md border border-white/40 rounded-[2rem] p-5 flex flex-col items-center justify-center rotate-[12deg] shadow-2xl hover:rotate-0 transition-transform duration-500">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-[#2C3E50] rounded-full flex items-center justify-center mb-4 shadow-inner border-[3px] border-white/50 overflow-hidden relative">
                  <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80" alt="Avatar" className="w-full h-full object-cover scale-110" />
                  {stats.activeSOS > 0 && (
                    <div className="absolute top-0 right-0 bg-red-500 w-4 h-4 md:w-6 md:h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">{stats.activeSOS}</div>
                  )}
                </div>
                <div className="text-center mt-2">
                  <p className="font-bold text-sm md:text-lg text-white">command_admin</p>
                  <p className="text-[10px] md:text-xs text-white/80 mt-1">Etihad Ops</p>
                </div>
              </div>
              </Link>
            </motion.div>

            {/* Decorative Arrow Left */}
            <div className="absolute bottom-[0%] left-[0%] md:left-[10%] w-24 h-24 md:w-32 md:h-32 z-20">
              <ArrowGreenLeft />
            </div>

            {/* Decorative Arrow Right */}
            <div className="absolute top-[5%] right-[0%] md:right-[10%] w-24 h-24 md:w-32 md:h-32 z-20">
              <ArrowGreenRight />
            </div>

            {/* Circular Badge */}
            <div className="absolute bottom-[-10%] right-[0%] md:right-[15%] z-40 pointer-events-auto">
              <CircularBadge />
            </div>

          </div>
        </div>
      </main>

      {/* Bottom Features Section */}
      <section className="bg-white text-black rounded-t-[2.5rem] md:rounded-t-[3.5rem] px-6 py-12 md:px-10 md:py-16 relative z-20 shadow-[0_-20px_50px_rgba(0,0,0,0.2)] mt-auto w-full">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          
          {/* Card 1 - Audience Wayfinding */}
          <Link href="/audience" className="block group">
            <div className="bg-[#F8F9FA] hover:bg-white rounded-[2rem] p-8 flex flex-col items-center text-center relative h-64 border-2 border-transparent hover:border-black shadow-none hover:shadow-[8px_8px_0_0_#000] transition-all cursor-pointer">
              <h3 className="text-xl md:text-2xl uppercase leading-tight mb-2 font-black group-hover:text-[#0038FF]">
                AUDIENCE<br/>WAYFINDING
              </h3>
              <p className="text-[10px] md:text-xs text-black/60 font-bold mb-auto">
                mobile seat finder & real-time alerts
              </p>
              
              {/* Pill Graphic */}
              <div className="relative w-full flex justify-center mt-6">
                <div className="flex items-center bg-[#0038FF] rounded-2xl p-2 pr-12 text-white shadow-lg relative z-10 group-hover:scale-105 transition-transform">
                  <div className="w-8 h-8 bg-white/20 rounded-full mr-3 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left pr-4">
                    <p className="text-[10px] font-bold leading-none">Find Seat</p>
                    <p className="text-[8px] text-white/70 leading-none mt-1">Interactive Map</p>
                  </div>
                </div>
              </div>

              {/* Arrow pointing to next card */}
              <div className="hidden md:block absolute -right-12 bottom-8 w-16 h-16 z-30">
                <ArrowBlack1 />
              </div>
            </div>
          </Link>

          {/* Card 2 - Command Center */}
          <Link href="/organizer" className="block group">
            <div className="bg-[#F8F9FA] hover:bg-white rounded-[2rem] p-8 flex flex-col items-center text-center relative h-64 border-2 border-transparent hover:border-black shadow-none hover:shadow-[8px_8px_0_0_#000] transition-all cursor-pointer">
              <h3 className="text-xl md:text-2xl uppercase leading-tight mb-2 font-black group-hover:text-[#CCFF00] drop-shadow-sm">
                COMMAND<br/>CENTER
              </h3>
              <p className="text-[10px] md:text-xs text-black/60 font-bold mb-auto">
                global ops & gate manual override
              </p>
              
              {/* Pill Graphic */}
              <div className="relative w-full flex justify-center mt-6">
                <div className="flex items-center bg-[#0038FF] rounded-full p-1.5 text-white shadow-lg group-hover:scale-105 transition-transform">
                  <div className="bg-white/20 text-white font-bold text-sm px-4 py-2 rounded-full mr-2">
                    <Settings2 className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-xs px-4">
                    ADMIN
                  </div>
                </div>
                
                {/* Small floating green pill */}
                <div className="absolute -bottom-6 right-1/4 bg-[#CCFF00] rounded-full p-2.5 shadow-lg transform rotate-12 z-20 group-hover:rotate-[24deg] transition-transform">
                   <ShieldAlert className="w-4 h-4 text-black" />
                </div>
              </div>

              {/* Arrow pointing to next card */}
              <div className="hidden md:block absolute -right-12 bottom-8 w-16 h-16 z-30">
                <ArrowBlack2 />
              </div>
            </div>
          </Link>

          {/* Card 3 - Real-Time GenAI */}
          <div className="bg-[#F8F9FA] rounded-[2rem] p-8 flex flex-col items-center text-center relative h-64 border border-gray-100">
            <h3 className="text-xl md:text-2xl uppercase leading-tight mb-2 font-black">
              LIVE<br/>TELEMETRY
            </h3>
            <p className="text-[10px] md:text-xs text-black/60 font-bold mb-auto">
              sos alerts & gate crowding
            </p>
            
            {/* Stats Graphic */}
            <div className="flex gap-4 w-full justify-center mt-6">
              <div className="flex flex-col items-center bg-[#0038FF] rounded-2xl p-4 text-white shadow-lg w-24">
                <p className="text-2xl font-black">{stats.activeSOS}</p>
                <p className="text-[8px] font-bold uppercase tracking-wider mt-1 text-center">Active SOS</p>
              </div>
              <div className="flex flex-col items-center bg-orange-400 rounded-2xl p-4 text-black shadow-lg w-24">
                <p className="text-2xl font-black">{stats.crowdedGates}</p>
                <p className="text-[8px] font-bold uppercase tracking-wider mt-1 text-center">Crowded Gates</p>
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
