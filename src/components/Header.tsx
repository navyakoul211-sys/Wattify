import React from 'react';
import { Power, Activity, Cpu, Code2, MonitorPlay } from 'lucide-react';

interface HeaderProps {
  activeTab: 'telemetry' | 'oled' | 'pinout' | 'firmware';
  setActiveTab: (tab: 'telemetry' | 'oled' | 'pinout' | 'firmware') => void;
  relayState: boolean;
  onToggleRelay: () => void;
  isESPOnline: boolean;
  isSimulated: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  relayState,
  onToggleRelay,
  isESPOnline,
  isSimulated,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-8">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm">
          EM
        </div>
        <a
          href="#telemetry"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('telemetry');
          }}
          className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap hover:text-cyan-400 transition-colors"
        >
          ESP32 Smart Energy Meter
        </a>
      </div>

      {/* Zone 2: 4 clean single-line navigation tabs */}
      <nav className="hidden md:flex items-center gap-1 sm:gap-2 text-sm font-medium">
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'telemetry'
              ? 'bg-slate-800 text-cyan-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Live Telemetry</span>
        </button>

        <button
          onClick={() => setActiveTab('oled')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'oled'
              ? 'bg-slate-800 text-cyan-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <MonitorPlay className="w-4 h-4" />
          <span>OLED & Sensors</span>
        </button>

        <button
          onClick={() => setActiveTab('pinout')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'pinout'
              ? 'bg-slate-800 text-cyan-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Hardware & Pinout</span>
        </button>

        <button
          onClick={() => setActiveTab('firmware')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'firmware'
              ? 'bg-slate-800 text-cyan-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>ESP32 Arduino Code</span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-400" />
          <span>{isESPOnline ? 'ESP32 Hardware Online' : isSimulated ? 'Simulation Stream' : 'Awaiting Connection'}</span>
        </div>

        <button
          onClick={onToggleRelay}
          title={relayState ? 'Click to cut load power (Relay OFF)' : 'Click to energize load (Relay ON)'}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all shadow-sm whitespace-nowrap shrink-0 ${
            relayState
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-rose-600 hover:bg-rose-500 text-white'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          <span>{relayState ? 'Relay: ENERGIZED' : 'Relay: CUT OFF'}</span>
        </button>
      </div>
    </header>
  );
};
