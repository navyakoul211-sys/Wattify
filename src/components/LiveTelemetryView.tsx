import React, { useState } from 'react';
import {
  Zap,
  Gauge,
  Flame,
  Coins,
  ShieldAlert,
  ShieldCheck,
  Download,
  RotateCcw,
  Sliders,
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
  const [chartMetric, setChartMetric] = useState<'power' | 'voltage' | 'current'>('power');
  const [chartWindow, setChartWindow] = useState<number>(60); // points to show
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Compute session stats
  const voltages = history.map((h) => h.voltage);
  const currents = history.map((h) => h.current);
  const powers = history.map((h) => h.power);

  const minV = voltages.length ? Math.min(...voltages) : telemetry.voltage;
  const maxV = voltages.length ? Math.max(...voltages) : telemetry.voltage;
  const peakA = currents.length ? Math.max(...currents) : telemetry.current;
  const peakW = powers.length ? Math.max(...powers) : telemetry.power;

  // Real-time cost
  const accruedCost = telemetry.energy * settings.tariffPerKWh;
  // Estimated monthly cost if current active load ran 24/7
  const projectedMonthlyKWh = (telemetry.power / 1000) * 24 * 30;
  const projectedMonthlyCost = projectedMonthlyKWh * settings.tariffPerKWh;

  // Over-current trip risk check
  const currentRatio = settings.maxCurrentTrip > 0 ? (telemetry.current / settings.maxCurrentTrip) * 100 : 0;
  const isNearTrip = currentRatio > 85;
  const isTripped = !relayState && (peakA >= settings.maxCurrentTrip || telemetry.voltage >= settings.maxVoltageTrip);

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Time_ISO', 'Voltage_V', 'Current_A', 'Power_W', 'Apparent_VA', 'PF', 'Energy_kWh', 'Relay', 'Source'];
    const rows = history.map((pt) => [
      pt.timestamp,
      new Date(pt.timestamp).toISOString(),
      pt.voltage.toFixed(2),
      pt.current.toFixed(3),
      pt.power.toFixed(1),
      pt.apparentPower.toFixed(1),
      pt.powerFactor.toFixed(2),
      pt.energy.toFixed(5),
      pt.relayState ? '1' : '0',
      pt.source,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `esp32_smart_meter_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SVG Chart rendering
  const slicedHistory = history.slice(-chartWindow);
  const chartHeight = 200;
  const chartWidth = 800;
  const padding = { top: 20, right: 30, bottom: 30, left: 55 };

  let valuesToPlot: number[] = [];
  let unit = 'W';
  let lineColor = '#06b6d4'; // cyan
  let areaColor = 'rgba(6, 182, 212, 0.15)';

  if (chartMetric === 'power') {
    valuesToPlot = slicedHistory.map((h) => h.power);
    unit = 'W';
    lineColor = '#38bdf8';
    areaColor = 'rgba(56, 189, 248, 0.12)';
  } else if (chartMetric === 'voltage') {
    valuesToPlot = slicedHistory.map((h) => h.voltage);
    unit = 'V';
    lineColor = '#60a5fa';
    areaColor = 'rgba(96, 165, 250, 0.12)';
  } else {
    valuesToPlot = slicedHistory.map((h) => h.current);
    unit = 'A';
    lineColor = '#f59e0b';
    areaColor = 'rgba(245, 158, 11, 0.12)';
  }

  const minVal = valuesToPlot.length ? Math.floor(Math.min(...valuesToPlot) * 0.95) : 0;
  const maxVal = valuesToPlot.length ? Math.ceil(Math.max(...valuesToPlot) * 1.05 + 1) : 100;
  const valRange = maxVal - minVal || 1;

  const pointsString = valuesToPlot.map((val, idx) => {
    const x = padding.left + (idx / Math.max(1, valuesToPlot.length - 1)) * (chartWidth - padding.left - padding.right);
    const y = padding.top + (1 - (val - minVal) / valRange) * (chartHeight - padding.top - padding.bottom);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const areaPath = valuesToPlot.length > 1
    ? `M ${padding.left},${chartHeight - padding.bottom} L ${pointsString.split(' ')[0]} ${pointsString} L ${chartWidth - padding.right},${chartHeight - padding.bottom} Z`
    : '';

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
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
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
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
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
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
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

        {/* Metric 4: Accumulated Energy & Cost */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Energy & Tariff</span>
            <Coins className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-mono font-bold tabular-nums text-white">
              {telemetry.energy.toFixed(3)}
            </span>
            <span className="text-sm font-mono text-cyan-400">kWh</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span className="text-emerald-400 font-medium">Cost: ${accruedCost.toFixed(3)}</span>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
              title="Reset energy accumulation"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
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

      {/* Real-Time Waveform / History Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Real-Time Telemetry Waveform</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>Streaming rate: 1.0s interval</span>
              <span aria-hidden="true">·</span>
              <span>Buffer: {slicedHistory.length} data frames</span>
              <span aria-hidden="true">·</span>
              <span>Source: {telemetry.source === 'esp32' ? 'ESP32 Hardware' : 'Simulator'}</span>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Metric Selector Tabs */}
            <div className="flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setChartMetric('power')}
                className={`px-3 py-1 rounded-md transition-colors font-medium whitespace-nowrap ${
                  chartMetric === 'power' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Power (W)
              </button>
              <button
                onClick={() => setChartMetric('voltage')}
                className={`px-3 py-1 rounded-md transition-colors font-medium whitespace-nowrap ${
                  chartMetric === 'voltage' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Voltage (V)
              </button>
              <button
                onClick={() => setChartMetric('current')}
                className={`px-3 py-1 rounded-md transition-colors font-medium whitespace-nowrap ${
                  chartMetric === 'current' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Current (A)
              </button>
            </div>

            {/* Window selector */}
            <div className="flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
              {[30, 60, 120].map((win) => (
                <button
                  key={win}
                  onClick={() => setChartWindow(win)}
                  className={`px-2.5 py-1 rounded-md transition-colors font-mono ${
                    chartWindow === win ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {win}s
                </button>
              ))}
            </div>

            {/* CSV Export */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
              title="Download recorded points as CSV file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* SVG Telemetry Canvas */}
        <div className="relative w-full overflow-hidden bg-slate-950/70 border border-slate-800/80 rounded-lg p-2">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-48 sm:h-56">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid horizontal guidelines */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((frac, i) => {
              const y = padding.top + frac * (chartHeight - padding.top - padding.bottom);
              const val = maxVal - frac * valRange;
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {val.toFixed(chartMetric === 'current' ? 2 : 0)}
                    {unit}
                  </text>
                </g>
              );
            })}

            {/* Filled Area */}
            {areaPath && <path d={areaPath} fill="url(#chartGradient)" />}

            {/* Polyline */}
            {pointsString && (
              <polyline
                fill="none"
                stroke={lineColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pointsString}
              />
            )}

            {/* Latest point dot */}
            {valuesToPlot.length > 0 && (
              <circle
                cx={chartWidth - padding.right}
                cy={
                  padding.top +
                  (1 - (valuesToPlot[valuesToPlot.length - 1] - minVal) / valRange) *
                    (chartHeight - padding.top - padding.bottom)
                }
                r="4.5"
                fill={lineColor}
                stroke="#030712"
                strokeWidth="2"
              />
            )}
          </svg>

          {/* Current reading callout overlay */}
          <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="text-[11px] text-slate-400 uppercase">Live:</span>
            <span className="text-sm font-mono font-bold text-white">
              {chartMetric === 'power' && `${telemetry.power.toFixed(1)} W`}
              {chartMetric === 'voltage' && `${telemetry.voltage.toFixed(1)} V`}
              {chartMetric === 'current' && `${telemetry.current.toFixed(2)} A`}
            </span>
          </div>
        </div>
      </div>

      {/* Control Strip & Load Simulation Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Relay Module Actuation & Auto-Trip Config */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-white">5V Relay Control & Protection</h4>
              {relayState ? (
                <span className="text-xs font-mono text-emerald-400">Coil Active (Closed)</span>
              ) : (
                <span className="text-xs font-mono text-rose-400">De-energized (Open)</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Directly commands the physical 1-channel relay module via ESP32 GPIO4 to isolate the AC load.
            </p>

            <button
              onClick={onToggleRelay}
              className={`w-full py-2.5 px-4 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                relayState
                  ? 'bg-rose-600/90 hover:bg-rose-500 text-white'
                  : 'bg-emerald-600/90 hover:bg-emerald-500 text-white'
              }`}
            >
              <span>{relayState ? 'OPEN RELAY (CUT OFF LOAD POWER)' : 'CLOSE RELAY (ENERGIZE LOAD)'}</span>
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Over-Current Cutoff: {settings.maxCurrentTrip}A</span>
              </label>
              <span className="text-xs font-mono text-slate-400">
                {(settings.maxCurrentTrip * settings.nominalVoltage).toFixed(0)}W Max
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
              <span>10A (Standard)</span>
              <span>25A (Industrial)</span>
            </div>
          </div>
        </div>

        {/* Load Simulator Preset Switcher */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-white">Appliance Load Simulator</h4>
              <span className="text-xs font-mono text-slate-400">
                {isESPOnline ? 'Hardware Streaming' : 'Simulation Active'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Test meter behavior with realistic household appliance current profiles:
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => onUpdateSettings({ activeLoadProfile: 'bulb_60w' })}
                className={`p-2 rounded-lg border text-left transition-colors ${
                  settings.activeLoadProfile === 'bulb_60w'
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold">60W Lamp</div>
                <div className="text-[11px] font-mono text-slate-400">~0.26A · PF 0.99</div>
              </button>

              <button
                onClick={() => onUpdateSettings({ activeLoadProfile: 'fridge_150w' })}
                className={`p-2 rounded-lg border text-left transition-colors ${
                  settings.activeLoadProfile === 'fridge_150w'
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold">Refrigerator</div>
                <div className="text-[11px] font-mono text-slate-400">~150W · PF 0.82</div>
              </button>

              <button
                onClick={() => onUpdateSettings({ activeLoadProfile: 'microwave_900w' })}
                className={`p-2 rounded-lg border text-left transition-colors ${
                  settings.activeLoadProfile === 'microwave_900w'
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold">Microwave</div>
                <div className="text-[11px] font-mono text-slate-400">~920W · PF 0.91</div>
              </button>

              <button
                onClick={() => onUpdateSettings({ activeLoadProfile: 'heater_1500w' })}
                className={`p-2 rounded-lg border text-left transition-colors ${
                  settings.activeLoadProfile === 'heater_1500w'
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold">Heater 1500W</div>
                <div className="text-[11px] font-mono text-slate-400">~6.5A · PF 1.0</div>
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <button
              onClick={() => onUpdateSettings({ activeLoadProfile: 'idle' })}
              className={`hover:text-slate-200 ${settings.activeLoadProfile === 'idle' ? 'text-cyan-400 font-semibold' : ''}`}
            >
              Standby / Idle (4W)
            </button>
            <button
              onClick={() => onUpdateSettings({ activeLoadProfile: 'custom' })}
              className={`hover:text-slate-200 ${settings.activeLoadProfile === 'custom' ? 'text-cyan-400 font-semibold' : ''}`}
            >
              Custom Wattage Slider
            </button>
          </div>
        </div>

        {/* Electricity Tariff & Projection */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-white">Tariff Rate & Billing Projection</h4>
              <Sliders className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Real-time cost computed continuously from ZMPT101B and ACS712 energy integration ($/kWh).
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Tariff per kWh:</span>
                <div className="flex items-center gap-1 font-mono">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="2.00"
                    value={settings.tariffPerKWh}
                    onChange={(e) => onUpdateSettings({ tariffPerKWh: Math.max(0.01, Number(e.target.value)) })}
                    className="w-20 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-right text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Grid Nominal Voltage:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onUpdateSettings({ nominalVoltage: 230 })}
                    className={`px-2 py-0.5 text-xs rounded font-mono ${
                      settings.nominalVoltage === 230 ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'bg-slate-950 text-slate-400'
                    }`}
                  >
                    230V 50Hz
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ nominalVoltage: 120 })}
                    className={`px-2 py-0.5 text-xs rounded font-mono ${
                      settings.nominalVoltage === 120 ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'bg-slate-950 text-slate-400'
                    }`}
                  >
                    120V 60Hz
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Projected 24h run:</span>
              <span className="font-mono text-slate-200">
                ${((projectedMonthlyCost / 30)).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Projected Monthly:</span>
              <span className="font-mono font-semibold text-emerald-400">
                ${projectedMonthlyCost.toFixed(2)}/mo
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
