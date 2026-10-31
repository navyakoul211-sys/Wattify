import React, { useState } from 'react';
import {
  Zap,
  Gauge,
  Flame,
  BatteryCharging,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { TelemetryPoint, DeviceSettings } from '../types/telemetry';

interface LiveTelemetryViewProps {
  telemetry: TelemetryPoint;
  history: TelemetryPoint[];
  settings: DeviceSettings;
  relayState: boolean;
  onToggleRelay: () => void;
  onResetEnergy: () => void;
  onUpdateSettings: (newSettings: Partial<DeviceSettings>) => void;
  isESPOnline: boolean;
}

export const LiveTelemetryView: React.FC<LiveTelemetryViewProps> = ({
  telemetry,
  history,
  settings,
  relayState,
  onToggleRelay,
  onResetEnergy,
  onUpdateSettings,
  isESPOnline,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Compute session stats
  const voltages = history.map((h) => h.voltage);
  const currents = history.map((h) => h.current);
  const powers = history.map((h) => h.power);

  const minV = voltages.length ? Math.min(...voltages) : telemetry.voltage;
  const maxV = voltages.length ? Math.max(...voltages) : telemetry.voltage;
  const peakA = currents.length ? Math.max(...currents) : telemetry.current;
  const peakW = powers.length ? Math.max(...powers) : telemetry.power;

  // Over-current trip risk check
  const currentRatio = settings.maxCurrentTrip > 0 ? (telemetry.current / settings.maxCurrentTrip) * 100 : 0;
  const isNearTrip = currentRatio > 85;
  const isTripped = !relayState && (peakA >= settings.maxCurrentTrip || telemetry.voltage >= settings.maxVoltageTrip);

  return (
    <div className="space-y-6">
      {/* Safety Alert Banner if triggered or near trip limit */}
      {isTripped && (
        <div className="bg-rose-950/60 border border-rose-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-rose-200">Relay Safety Trip Triggered</h4>
              <p className="text-xs text-rose-300/80">
                The 5V relay module cut off the load due to safe threshold violation ({settings.maxCurrentTrip}A limit).
              </p>
            </div>
          </div>
          <button
            onClick={onToggleRelay}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            Reset Trip & Re-Energize
          </button>
        </div>
      )}

      {/* Primary 4 Metric Gauges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: AC Voltage (ZMPT101B) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-3 text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">AC Mains Voltage</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-mono font-bold tabular-nums text-white">
              {telemetry.voltage.toFixed(1)}
            </span>
            <span className="text-sm font-mono text-cyan-400">V RMS</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Min: {minV.toFixed(1)}V</span>
            <span aria-hidden="true">·</span>
            <span>Max: {maxV.toFixed(1)}V</span>
            <span aria-hidden="true">·</span>
            <span>{telemetry.frequency.toFixed(1)} Hz</span>
          </div>
        </div>

        {/* Metric 2: AC Current (ACS712) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-3 text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">AC Load Current</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-mono font-bold tabular-nums text-white">
              {telemetry.current.toFixed(2)}
            </span>
            <span className="text-sm font-mono text-amber-400">A RMS</span>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>Load: {currentRatio.toFixed(0)}%</span>
              <span>Trip: {settings.maxCurrentTrip}A</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isNearTrip ? 'bg-rose-500' : currentRatio > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, currentRatio))}%` }}
              />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Peak: {peakA.toFixed(2)}A</span>
            <span aria-hidden="true">·</span>
            <span>Sensor: {settings.sensorModelACS}</span>
          </div>
        </div>

        {/* Metric 3: Active Power & Power Factor */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-3 text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Active Power</span>
            <Flame className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-mono font-bold tabular-nums text-white">
              {telemetry.power.toFixed(1)}
            </span>
            <span className="text-sm font-mono text-emerald-400">Watts</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Apparent: {telemetry.apparentPower.toFixed(0)} VA</span>
            <span aria-hidden="true">·</span>
            <span>PF: {telemetry.powerFactor.toFixed(2)}</span>
            <span aria-hidden="true">·</span>
            <span>Peak: {peakW.toFixed(0)}W</span>
          </div>
        </div>

        {/* Metric 4: Total Accumulated Energy (kWh) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-3 text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Cumulative Energy</span>
            <BatteryCharging className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-mono font-bold tabular-nums text-white">
              {telemetry.energy.toFixed(3)}
            </span>
            <span className="text-sm font-mono text-cyan-400">kWh</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Status: Running</span>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 font-sans text-xs"
              title="Reset energy accumulation back to 0.000"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Energy</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="text-xs text-slate-300">
              Reset accumulated energy counter back to 0.000 kWh?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onResetEnergy();
                setShowResetConfirm(false);
              }}
              className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium transition-colors"
            >
              Confirm Reset
            </button>
          </div>
        </div>
      )}

      {/* Two-Column Control Center: 5V Relay Safety & Appliance Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1-Channel 5V Relay Actuation & Protection */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-white">5V Relay Control & Over-Current Cutoff</h4>
              {relayState ? (
                <span className="text-xs font-mono text-emerald-400 font-medium">Coil Active (Closed)</span>
              ) : (
                <span className="text-xs font-mono text-rose-400 font-medium">De-energized (Open)</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Directly commands the physical 1-channel relay module via ESP32 GPIO 4 to connect or isolate the AC load.
            </p>

            <button
              onClick={onToggleRelay}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                relayState
                  ? 'bg-rose-600/90 hover:bg-rose-500 text-white'
                  : 'bg-emerald-600/90 hover:bg-emerald-500 text-white'
              }`}
            >
              <span>{relayState ? 'OPEN RELAY (CUT OFF LOAD POWER)' : 'CLOSE RELAY (ENERGIZE LOAD)'}</span>
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Over-Current Safe Limit: {settings.maxCurrentTrip}A</span>
              </label>
              <span className="text-xs font-mono text-slate-400">
                {(settings.maxCurrentTrip * settings.nominalVoltage).toFixed(0)}W Threshold
              </span>
            </div>
            <input
              type="range"
              min="2"
              max="25"
              step="1"
              value={settings.maxCurrentTrip}
              onChange={(e) => onUpdateSettings({ maxCurrentTrip: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>2A (460W)</span>
              <span>10A (Standard Socket)</span>
              <span>25A (Industrial)</span>
            </div>
          </div>
        </div>

        {/* 9W Lamp Appliance Load Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-white">Connected Appliance Load (9W Lamp)</h4>
              <span className="text-xs font-mono text-cyan-400 font-medium">
                {isESPOnline ? 'Physical Sensors' : 'Simulation Mode'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Standard 9 Watt household LED lamp connected through the ACS712 current sensor and 5V relay module.
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                      settings.activeLoadProfile !== 'idle' && relayState
                        ? 'bg-amber-950/80 border border-amber-600/80 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                        : 'bg-slate-900 border border-slate-800 text-slate-500'
                    }`}
                  >
                    9W
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">9W LED Lamp</div>
                    <div className="text-xs font-mono text-slate-400">
                      9.0 Watts · ~0.043A RMS · PF 0.91
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-xs font-mono font-medium px-2 py-0.5 rounded ${
                      settings.activeLoadProfile !== 'idle' && relayState
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {settings.activeLoadProfile !== 'idle' && relayState ? 'LAMP ACTIVE (9W)' : 'DISCONNECTED (0W)'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-3 border-t border-slate-800/80 text-slate-400">
                <div>
                  <span className="text-slate-500">Rated Power: </span>
                  <span className="text-slate-200">9.0 Watts</span>
                </div>
                <div>
                  <span className="text-slate-500">AC Current: </span>
                  <span className="text-slate-200">~0.043 A</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => onUpdateSettings({ activeLoadProfile: 'lamp_9w' })}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                settings.activeLoadProfile !== 'idle'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              Connect 9W Lamp
            </button>
            <button
              onClick={() => onUpdateSettings({ activeLoadProfile: 'idle' })}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                settings.activeLoadProfile === 'idle'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              Turn Off 9W Lamp (0W)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
