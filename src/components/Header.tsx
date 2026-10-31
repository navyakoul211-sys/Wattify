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
    <header className="bg-[#030712] border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-3 w-full">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6">
        {/* Zone 1: Brand title wordmark */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs shadow-inner">
              EM
            </div>
            <a
              href="#telemetry"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('telemetry');
              }}
              className="text-base font-bold tracking-tight text-white whitespace-nowrap hover:text-cyan-400 transition-colors"
            >
              ESP32 Smart Energy Meter
            </a>
          </div>

          {/* Mobile Relay Quick Toggle (visible on small screens) */}
          <button
            onClick={onToggleRelay}
            className={`md:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              relayState
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{relayState ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Zone 2: Navigation tabs with responsive horizontal scroll support */}
        <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'telemetry'
                ? 'bg-slate-800 text-cyan-400 font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 shrink-0" />
            <span>Live Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab('oled')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'oled'
                ? 'bg-slate-800 text-cyan-400 font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <MonitorPlay className="w-4 h-4 shrink-0" />
            <span>OLED & Sensors</span>
          </button>

          <button
            onClick={() => setActiveTab('pinout')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'pinout'
                ? 'bg-slate-800 text-cyan-400 font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Cpu className="w-4 h-4 shrink-0" />
            <span>Hardware & Pinout</span>
          </button>

          <button
            onClick={() => setActiveTab('firmware')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'firmware'
                ? 'bg-slate-800 text-cyan-400 font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Code2 className="w-4 h-4 shrink-0" />
            <span>ESP32 Arduino Code</span>
          </button>
        </nav>

        {/* Zone 3: Desktop Relay Control and Status */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isESPOnline ? 'bg-emerald-400' : 'bg-cyan-400'
              }`}
            />
            <span className="hidden xl:inline">
              {isESPOnline ? 'Hardware Online' : isSimulated ? 'Simulator Stream' : 'Awaiting Data'}
            </span>
          </div>

          <button
            onClick={onToggleRelay}
            title={relayState ? 'Click to cut load power (Relay OFF)' : 'Click to energize load (Relay ON)'}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-sm whitespace-nowrap ${
              relayState
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
          >
            <Power className="w-3.5 h-3.5 shrink-0" />
            <span>{relayState ? 'Relay: ENERGIZED' : 'Relay: CUT OFF'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
