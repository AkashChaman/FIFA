import Link from "next/link";
import { User, ShieldAlert, Navigation, Settings2, BarChart3, Radio } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background graphic elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <header className="w-full border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-slate-950 p-1.5 rounded-lg font-black text-xs tracking-wider">
            FIFA 2026
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-slate-100">Etihad Stadium</h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Crowd Control & Safety Network</p>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 font-bold bg-slate-900 border border-slate-800 px-3 py-1 rounded-full uppercase">
          Live Connection: Active
        </div>
      </header>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-4xl mx-auto z-10 w-full text-center">
        <div className="bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 text-[10px] font-extrabold uppercase px-3 py-1.5 rounded-full mb-4 tracking-widest">
          AI-Powered Smart Stadium Operations
        </div>
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight max-w-2xl leading-none">
          FIFA 2026 CROWD MANAGEMENT <span className="text-amber-500 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">COMMAND PORTAL</span>
        </h2>
        <p className="text-xs md:text-sm text-slate-300 font-medium max-w-lg mt-4 leading-relaxed">
          Architectural model interface for Etihad Stadium. Choose your portal below to simulate audience wayfinding and safety assistance or organizer command operations.
        </p>

        {/* Portal Cards Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mt-12">
          
          {/* Audience Card */}
          <Link href="/audience" className="group">
            <div className="bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 text-left transition-all duration-300 shadow-xl hover:shadow-[0_8px_30px_rgb(245,158,11,0.08)] flex flex-col justify-between h-full backdrop-blur-sm">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-amber-500/10 text-amber-500 p-3 rounded-xl">
                    <User className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500/25 text-amber-300 px-2 py-0.5 rounded-full">
                    Mobile Experience
                  </span>
                </div>
                <h3 className="text-lg font-black uppercase text-slate-100 group-hover:text-amber-500 transition-colors">
                  Audience Seating & Safety Portal
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-2 leading-relaxed">
                  Interactive seat wayfinding, real-time gate rerouting alerts, emergency SOS, and GenAI stadium assistance chat.
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-850 flex items-center justify-between text-xs text-slate-400 font-semibold group-hover:text-slate-100 transition-colors">
                <span>Launch Mobile Portal</span>
                <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Link>

          {/* Organizer Card */}
          <Link href="/organizer" className="group">
            <div className="bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 text-left transition-all duration-300 shadow-xl hover:shadow-[0_8px_30px_rgb(16,185,129,0.08)] flex flex-col justify-between h-full backdrop-blur-sm">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl">
                    <Settings2 className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                    Desktop Control
                  </span>
                </div>
                <h3 className="text-lg font-black uppercase text-slate-100 group-hover:text-emerald-400 transition-colors">
                  Organizer Command Center
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-2 leading-relaxed">
                  CCTV OpenCV crowd heatmap, manual gate override toggles, GenAI SOS grouping and summaries, and global mass notification broadcasts.
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-850 flex items-center justify-between text-xs text-slate-400 font-semibold group-hover:text-slate-100 transition-colors">
                <span>Launch Control Center</span>
                <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Link>

        </div>
      </div>

      {/* Footer Info */}
      <footer className="w-full text-center py-6 border-t border-slate-900 z-10">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          FIFA World Cup 2026 ™ Crowd & Safety Simulation App • Manchester Etihad Architecture Model
        </p>
      </footer>
    </main>
  );
}
