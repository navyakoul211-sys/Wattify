import React from 'react';
import { Cpu, Zap, ShieldCheck, AlertTriangle, ExternalLink } from 'lucide-react';
import { PinMapping } from '../types/telemetry';

export const HardwarePinoutView: React.FC = () => {
  const pinMappings: PinMapping[] = [
    {
      espPin: 'GPIO 34',
      pinNumber: 6,
      function: 'ADC1_CH6 (Input Only)',
      connectedTo: 'ZMPT101B Analog OUT',
      wireColor: 'text-amber-400',
      notes: 'Samples AC voltage sinusoidal wave around 2.5V DC offset. 12-bit ADC (0–4095).',
    },
    {
      espPin: 'GPIO 35',
      pinNumber: 7,
      function: 'ADC1_CH7 (Input Only)',
      connectedTo: 'ACS712 Analog OUT',
      wireColor: 'text-blue-400',
      notes: 'Samples load current with 100mV/A or 185mV/A sensitivity. Centered at VCC/2.',
    },
    {
      espPin: 'GPIO 21',
      pinNumber: 21,
      function: 'I2C SDA (Data)',
      connectedTo: '0.96" OLED Display SDA',
      wireColor: 'text-cyan-400',
      notes: 'Hardware I2C Data bus. Address 0x3C (SSD1306 driver).',
    },
    {
      espPin: 'GPIO 22',
      pinNumber: 22,
      function: 'I2C SCL (Clock)',
      connectedTo: '0.96" OLED Display SCL',
      wireColor: 'text-cyan-400',
      notes: 'Hardware I2C Clock bus. 400kHz Fast Mode.',
    },
    {
      espPin: 'GPIO 4',
      pinNumber: 19,
      function: 'Digital Output (High/Low)',
      connectedTo: '1-Channel 5V Relay IN',
      wireColor: 'text-emerald-400',
      notes: 'Controls relay coil. HIGH = Load Energized / LOW = Load Cut Off (Active Low/High selectable).',
    },
    {
      espPin: 'VIN (5V)',
      pinNumber: 30,
      function: 'Power Supply Input (+5V)',
      connectedTo: '5V DC Power Supply Positive Rail',
      wireColor: 'text-rose-400',
      notes: 'Powers ESP32 internal LDO voltage regulator, relay coil, and sensor VCC rails.',
    },
    {
      espPin: 'GND',
      pinNumber: 14,
      function: 'Ground (0V Reference)',
      connectedTo: 'Common Ground Rail',
      wireColor: 'text-slate-400',
      notes: 'Shared reference for ESP32, OLED, ZMPT101B, ACS712, and 5V relay module.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hardware Photography Showcase Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        <div className="relative aspect-[16/9] max-h-96 w-full bg-slate-950">
          <img
            src="/src/assets/images/smart_energy_meter_hardware_1793364550589.jpg"
            alt="ESP32 Smart Energy Meter Test Bench with ZMPT101B, ACS712, 5V Relay, and 0.96 OLED Display"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Graceful fallback container if image load errors
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2 pointer-events-auto">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 bg-slate-950/80 px-2.5 py-1 rounded border border-slate-700">
                Hardware Bench Setup
              </span>
              <h3 className="text-lg font-bold text-white mt-1.5">
                ESP32 WROOM-32 Smart Energy Meter Prototyping Rig
              </h3>
            </div>
            <div className="text-xs text-slate-300 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 font-mono">
              30-Pin ESP32 · ZMPT101B · ACS712 · 5V Relay · 0.96" OLED
            </div>
          </div>
        </div>
      </div>

      {/* Safety Alert for AC High Voltage */}
      <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 space-y-1">
          <span className="font-semibold text-amber-300">
            AC Mains Safety & Isolation Notice:
          </span>
          <p>
            You are measuring 110V/230V AC mains electricity. Always verify optical isolation on the 5V relay module and ensure the ZMPT101B voltage transformer secondary side is isolated from live line transients. Always install a 10A fast-acting inline fuse on the Live wire feeding the load. Never touch exposed terminal blocks while energized.
          </p>
        </div>
      </div>

      {/* 30-Pin Wiring Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h4 className="text-sm font-semibold text-white">
              ESP32-WROOM-32 (30-Pin) Hardware Interconnect Map
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified GPIO pin mappings for the 30-pin Development Board
            </p>
          </div>
          <div className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            <span>ESP32-WROOM-32D / 32U</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                <th className="py-2.5 px-3">ESP32 Pin</th>
                <th className="py-2.5 px-3">Pin #</th>
                <th className="py-2.5 px-3">Internal Function</th>
                <th className="py-2.5 px-3">Connected Module Pin</th>
                <th className="py-2.5 px-3">Engineering Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {pinMappings.map((row) => (
                <tr key={row.espPin} className="hover:bg-slate-800/40 transition-colors">
                  <td className={`py-3 px-3 font-bold ${row.wireColor}`}>
                    {row.espPin}
                  </td>
                  <td className="py-3 px-3 text-slate-400">#{row.pinNumber}</td>
                  <td className="py-3 px-3 text-slate-300">{row.function}</td>
                  <td className="py-3 px-3 text-white font-medium">{row.connectedTo}</td>
                  <td className="py-3 px-3 text-slate-400 font-sans text-[11px] leading-relaxed">
                    {row.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Module-by-Module Circuit Architecture Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Module 1: ZMPT101B Voltage Transformer */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <h5 className="text-sm font-semibold text-white">1. ZMPT101B AC Voltage Module</h5>
          </div>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Measures AC line voltage up to 250V RMS. The micro-transformer steps down the AC current to 2mA, passed through an LM358 operational amplifier that produces an analog sine wave centered around 2.5V DC.
          </p>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside font-mono">
            <li><span className="text-cyan-400">VCC</span>: Connect to 5V DC power rail</li>
            <li><span className="text-cyan-400">GND</span>: Connect to Common Ground</li>
            <li><span className="text-cyan-400">OUT</span>: Connect to ESP32 GPIO 34 (ADC1_CH6)</li>
            <li><span className="text-cyan-400">Terminal L / N</span>: Across AC mains line in parallel</li>
          </ul>
        </div>

        {/* Module 2: ACS712 Current Sensor */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <h5 className="text-sm font-semibold text-white">2. ACS712 Current Sensor Module</h5>
          </div>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Linear Hall-effect current sensor. The current-carrying conductor runs internally close to the Hall IC with 2.1kVRMS galvanic isolation. Produces proportional output voltage with 2.5V zero offset.
          </p>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside font-mono">
            <li><span className="text-blue-400">VCC</span>: Connect to 5V DC power rail</li>
            <li><span className="text-blue-400">GND</span>: Connect to Common Ground</li>
            <li><span className="text-blue-400">OUT</span>: Connect to ESP32 GPIO 35 (ADC1_CH7)</li>
            <li><span className="text-blue-400">Screw Terminals</span>: In series with the AC Load line</li>
          </ul>
        </div>

        {/* Module 3: 1-Channel 5V Relay */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <h5 className="text-sm font-semibold text-white">3. 1-Channel 5V Relay Module</h5>
          </div>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Electromechanical relay with optocoupler isolation. Allows ESP32 GPIO logic to remotely toggle AC loads up to 10A / 250V AC and execute automatic over-current trip disconnects.
          </p>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside font-mono">
            <li><span className="text-emerald-400">VCC</span>: 5V DC power supply (separate rail from 3.3V)</li>
            <li><span className="text-emerald-400">GND</span>: Common Ground</li>
            <li><span className="text-emerald-400">IN</span>: Connect to ESP32 GPIO 4</li>
            <li><span className="text-emerald-400">COM & NO</span>: In series with AC Live wire to appliance</li>
          </ul>
        </div>

        {/* Module 4: 0.96" I2C OLED Display */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <h5 className="text-sm font-semibold text-white">4. 0.96" SSD1306 OLED Display</h5>
          </div>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Crisp 128x64 self-illuminating display that displays real-time voltage, current, power, and accumulated energy on-device without needing a computer screen nearby.
          </p>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside font-mono">
            <li><span className="text-amber-400">VCC</span>: Connect to 3.3V or 5V rail (onboard regulator)</li>
            <li><span className="text-amber-400">GND</span>: Common Ground</li>
            <li><span className="text-amber-400">SCL</span>: Connect to ESP32 GPIO 22</li>
            <li><span className="text-amber-400">SDA</span>: Connect to ESP32 GPIO 21</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
