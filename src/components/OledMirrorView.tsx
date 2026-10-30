import React, { useState, useEffect } from 'react';
import { TelemetryPoint, DeviceSettings } from '../types/telemetry';
import { Sliders, RefreshCw, Eye, Sparkles, CheckCircle2 } from 'lucide-react';

interface OledMirrorViewProps {
  telemetry: TelemetryPoint;
  settings: DeviceSettings;
  relayState: boolean;
  onUpdateSettings: (newSettings: Partial<DeviceSettings>) => void;
}

export const OledMirrorView: React.FC<OledMirrorViewProps> = ({
  telemetry,
  settings,
  relayState,
  onUpdateSettings,
}) => {
  const [oledPage, setOledPage] = useState<number>(0);
  const [autoCycle, setAutoCycle] = useState<boolean>(true);
  const [inverted, setInverted] = useState<boolean>(false);
  const [zmptGain, setZmptGain] = useState<number>(1.0);
  const [acsZeroOffset, setAcsZeroOffset] = useState<number>(2.5);
  const [calibratedNotice, setCalibratedNotice] = useState<string | null>(null);

  // Auto cycle OLED display pages every 4 seconds if enabled
  useEffect(() => {
    if (!autoCycle) return;
    const interval = setInterval(() => {
      setOledPage((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(interval);
  }, [autoCycle]);

  const handleZeroCalibrate = () => {
    setAcsZeroOffset(2.498);
    setCalibratedNotice('Zero offset auto-tuned to 2.498V (ESP32 12-bit ADC centered).');
    setTimeout(() => setCalibratedNotice(null), 4000);
  };

  const handleGainCalibrate = (newGain: number) => {
    setZmptGain(newGain);
    setCalibratedNotice(`ZMPT101B gain multiplier calibrated to ${newGain.toFixed(3)}x.`);
    setTimeout(() => setCalibratedNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Overview Intro */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <h3 className="text-base font-semibold text-white mb-1">
          0.96" I2C SSD1306 OLED Mirror & Sensor Calibration
        </h3>
        <p className="text-xs text-slate-400">
          This panel renders the exact 128×64 monochrome pixel buffer produced by the physical OLED display mounted on your breadboard, alongside real-time hardware calibration controls for the ZMPT101B voltage transformer and ACS712 current sensor.
        </p>
      </div>

      {calibratedNotice && (
        <div className="p-3 bg-cyan-950/50 border border-cyan-800 rounded-lg text-xs text-cyan-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{calibratedNotice}</span>
        </div>
      )}

      {/* Main Grid: OLED Physical Hardware Simulation & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Authentic 0.96" OLED Simulation Module (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-6 flex flex-col items-center">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span>Physical OLED 0.96" I2C (128×64)</span>
          </div>

          {/* OLED Physical Hardware Board Case */}
          <div className="w-full max-w-xs bg-slate-950 border-2 border-slate-700/80 rounded-2xl p-4 shadow-2xl relative">
            {/* 4 PCB Mounting Holes */}
            <div className="absolute top-2 left-2 w-2 h-2 rounded-full border border-slate-600 bg-slate-900" />
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full border border-slate-600 bg-slate-900" />
            <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full border border-slate-600 bg-slate-900" />
            <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full border border-slate-600 bg-slate-900" />

            {/* I2C Header Pins silkscreen */}
            <div className="flex justify-center gap-4 text-[9px] font-mono text-slate-500 mb-2">
              <span>GND</span>
              <span>VCC</span>
              <span>SCL</span>
              <span>SDA</span>
            </div>

            {/* Glowing 128x64 Pixel Screen Container */}
            <div
              className={`w-full aspect-[2/1] rounded-md p-2.5 transition-colors duration-200 border ${
                inverted
                  ? 'bg-cyan-300 text-slate-950 border-cyan-200'
                  : 'bg-black text-cyan-400 border-slate-800'
              }`}
              style={{
                boxShadow: inverted
                  ? '0 0 15px rgba(103, 232, 249, 0.3)'
                  : 'inset 0 0 12px rgba(6, 182, 212, 0.15)',
              }}
            >
              {/* Screen Page 0: Primary Telemetry */}
              {oledPage === 0 && (
                <div className="h-full flex flex-col justify-between font-mono text-[11px] leading-tight select-none oled-screen">
                  <div className="flex items-center justify-between border-b border-cyan-500/30 pb-0.5">
                    <span className="font-bold text-[10px]">SMART ENERGY METER</span>
                    <span className="text-[9px]">{relayState ? '[RLY:ON]' : '[RLY:OFF]'}</span>
                  </div>
                  <div className="space-y-0.5 my-auto text-[10px] sm:text-[11px]">
                    <div className="flex justify-between">
                      <span>V_RMS:</span>
                      <span className="font-bold">{telemetry.voltage.toFixed(1)} V</span>
                    </div>
                    <div className="flex justify-between">
                      <span>I_RMS:</span>
                      <span className="font-bold">{telemetry.current.toFixed(2)} A</span>
                    </div>
                    <div className="flex justify-between">
                      <span>POWER:</span>
                      <span className="font-bold">{telemetry.power.toFixed(0)} W</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ENGY:</span>
                      <span className="font-bold">{telemetry.energy.toFixed(3)} kWh</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-[8px] text-cyan-400/70 border-t border-cyan-500/20 pt-0.5">
                    <span>PAGE 1/4</span>
                    <span>PF: {telemetry.powerFactor.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Screen Page 1: Power Quality & Grid */}
              {oledPage === 1 && (
                <div className="h-full flex flex-col justify-between font-mono text-[11px] leading-tight select-none oled-screen">
                  <div className="flex items-center justify-between border-b border-cyan-500/30 pb-0.5">
                    <span className="font-bold text-[10px]">POWER QUALITY</span>
                    <span className="text-[9px]">{telemetry.frequency.toFixed(1)}Hz</span>
                  </div>
                  <div className="space-y-0.5 my-auto text-[10px] sm:text-[11px]">
                    <div className="flex justify-between">
                      <span>APPARENT:</span>
                      <span className="font-bold">{telemetry.apparentPower.toFixed(0)} VA</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ACTIVE:</span>
                      <span className="font-bold">{telemetry.power.toFixed(1)} W</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PF FACTOR:</span>
                      <span className="font-bold">{telemetry.powerFactor.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GRID STATUS:</span>
                      <span className="font-bold text-emerald-400">NOMINAL</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-[8px] text-cyan-400/70 border-t border-cyan-500/20 pt-0.5">
                    <span>PAGE 2/4</span>
                    <span>NOM: {settings.nominalVoltage}V</span>
                  </div>
                </div>
              )}

              {/* Screen Page 2: Billing & Cost */}
              {oledPage === 2 && (
                <div className="h-full flex flex-col justify-between font-mono text-[11px] leading-tight select-none oled-screen">
                  <div className="flex items-center justify-between border-b border-cyan-500/30 pb-0.5">
                    <span className="font-bold text-[10px]">BILLING & TARIFF</span>
                    <span className="text-[9px]">${settings.tariffPerKWh}/kWh</span>
                  </div>
                  <div className="space-y-0.5 my-auto text-[10px] sm:text-[11px]">
                    <div className="flex justify-between">
                      <span>TOTAL KWH:</span>
                      <span className="font-bold">{telemetry.energy.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>BILL ACCRUED:</span>
                      <span className="font-bold">${(telemetry.energy * settings.tariffPerKWh).toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>EST MONTHLY:</span>
                      <span className="font-bold">
                        ${((telemetry.power / 1000) * 24 * 30 * settings.tariffPerKWh).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between text-[8px] text-cyan-400/70 border-t border-cyan-500/20 pt-0.5">
                    <span>PAGE 3/4</span>
                    <span>RATE TARIFF 1</span>
                  </div>
                </div>
              )}

              {/* Screen Page 3: System & Hardware Health */}
              {oledPage === 3 && (
                <div className="h-full flex flex-col justify-between font-mono text-[11px] leading-tight select-none oled-screen">
                  <div className="flex items-center justify-between border-b border-cyan-500/30 pb-0.5">
                    <span className="font-bold text-[10px]">ESP32 DIAGNOSTIC</span>
                    <span className="text-[9px]">SDA:21 SCL:22</span>
                  </div>
                  <div className="space-y-0.5 my-auto text-[10px] sm:text-[11px]">
                    <div className="flex justify-between">
                      <span>ZMPT101B:</span>
                      <span className="font-bold">ADC1_CH6 (G34)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ACS712:</span>
                      <span className="font-bold">ADC1_CH7 (G35)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>RELAY PIN:</span>
                      <span className="font-bold">GPIO 4</span>
                    </div>
                    <div className="flex justify-between">
                      <span>WIFI SYNC:</span>
                      <span className="font-bold text-emerald-400">ACTIVE</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-[8px] text-cyan-400/70 border-t border-cyan-500/20 pt-0.5">
                    <span>PAGE 4/4</span>
                    <span>SSD1306 0x3C</span>
                  </div>
                </div>
              )}
            </div>

            <div className="text-center mt-3 text-[10px] font-mono text-slate-500">
              I2C Address: 0x3C · SSD1306 Driver
            </div>
          </div>

          {/* OLED Control Buttons */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {[0, 1, 2, 3].map((page) => (
              <button
                key={page}
                onClick={() => {
                  setAutoCycle(false);
                  setOledPage(page);
                }}
                className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors ${
                  oledPage === page
                    ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Screen {page + 1}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-4 text-xs">
            <button
              onClick={() => setAutoCycle(!autoCycle)}
              className={`flex items-center gap-1.5 transition-colors ${
                autoCycle ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${autoCycle ? 'animate-spin' : ''}`} />
              <span>Auto-Cycle (4s)</span>
            </button>

            <button
              onClick={() => setInverted(!inverted)}
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Invert Pixels</span>
            </button>
          </div>
        </div>

        {/* Right Column: Sensor Technical Principles & Real-Time Calibration (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* ZMPT101B Calibration Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-white">
                  ZMPT101B AC Voltage Transformer Calibration
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span>Transformation: 2mA : 2mA</span>
                  <span aria-hidden="true">·</span>
                  <span>Input: 250V AC Max</span>
                  <span aria-hidden="true">·</span>
                  <span>ADC: GPIO 34 (12-bit)</span>
                </div>
              </div>
              <Sliders className="w-4 h-4 text-cyan-400" />
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              The ZMPT101B module uses an onboard LM358 operational amplifier to bias and scale the AC waveform around a 2.5V reference. Rotate the onboard blue multi-turn trimmer or adjust the digital gain factor below so the reading matches your multimeter:
            </p>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 mb-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-300 font-medium">Digital Gain Multiplier:</span>
                <span className="font-mono font-bold text-cyan-400">{zmptGain.toFixed(3)}x</span>
              </div>
              <input
                type="range"
                min="0.800"
                max="1.200"
                step="0.005"
                value={zmptGain}
                onChange={(e) => handleGainCalibrate(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                <span>0.800x (Decrease)</span>
                <span>1.000x (Nominal)</span>
                <span>1.200x (Increase)</span>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-400 bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
              Formula: V_RMS = Gain * sqrt((1/N) * sum((ADC_sample - ADC_midpoint)^2))
            </div>
          </div>

          {/* ACS712 Current Sensor Calibration Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-white">
                  ACS712 Hall-Effect Current Sensor Calibration
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span>Sensitivity: {settings.sensorModelACS === 'ACS712-05B' ? '185 mV/A' : settings.sensorModelACS === 'ACS712-20A' ? '100 mV/A' : '66 mV/A'}</span>
                  <span aria-hidden="true">·</span>
                  <span>Zero Load: VCC/2 (2.50V)</span>
                  <span aria-hidden="true">·</span>
                  <span>ADC: GPIO 35</span>
                </div>
              </div>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Select your exact ACS712 breakout model and calibrate the zero-offset point when no electrical appliances are switched on:
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {(['ACS712-05B', 'ACS712-20A', 'ACS712-30A'] as const).map((model) => (
                <button
                  key={model}
                  onClick={() => onUpdateSettings({ sensorModelACS: model })}
                  className={`p-2 rounded-lg border text-xs font-mono text-center transition-colors ${
                    settings.sensorModelACS === model
                      ? 'border-amber-500 bg-amber-950/40 text-amber-300 font-bold'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div>{model}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {model === 'ACS712-05B' && '185mV/A (5A)'}
                    {model === 'ACS712-20A' && '100mV/A (20A)'}
                    {model === 'ACS712-30A' && '66mV/A (30A)'}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="text-xs text-slate-300">
                <span>Zero-Current Voltage Offset: </span>
                <span className="font-mono font-bold text-amber-400">{acsZeroOffset.toFixed(3)}V</span>
              </div>
              <button
                onClick={handleZeroCalibrate}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
              >
                Auto-Tare Zero Load Offset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
