import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { LiveTelemetryView } from './components/LiveTelemetryView';
import { OledMirrorView } from './components/OledMirrorView';
import { HardwarePinoutView } from './components/HardwarePinoutView';
import { Esp32CodeGenerator } from './components/Esp32CodeGenerator';
import { TelemetryPoint, DeviceSettings } from './types/telemetry';

export default function App() {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'oled' | 'pinout' | 'firmware'>('telemetry');

  // Default initial telemetry
  const [telemetry, setTelemetry] = useState<TelemetryPoint>({
    id: 'init',
    timestamp: Date.now(),
    voltage: 230.4,
    current: 0.043,
    power: 9.0,
    apparentPower: 9.9,
    powerFactor: 0.91,
    frequency: 50.0,
    energy: 0.014,
    relayState: true,
    source: 'simulated',
  });

  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [relayState, setRelayState] = useState<boolean>(true);
  const [isESPOnline, setIsESPOnline] = useState<boolean>(false);
  const [isSimulated, setIsSimulated] = useState<boolean>(true);

  const [settings, setSettings] = useState<DeviceSettings>({
    currency: 'USD ($)',
    tariffPerKWh: 0.16,
    maxCurrentTrip: 10.0,
    maxVoltageTrip: 260.0,
    minVoltageTrip: 180.0,
    autoTripEnabled: true,
    nominalVoltage: 230.0,
    sensorModelACS: 'ACS712-20A',
    simulationActive: true,
    activeLoadProfile: 'lamp_9w',
    customPowerWatts: 9,
    customPowerFactor: 0.91,
  });

  // Fetch initial history & settings from backend
  useEffect(() => {
    fetch('/api/telemetry/history')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.history && Array.isArray(data.history)) {
            setHistory(data.history);
          }
          if (data.latest) {
            setTelemetry(data.latest);
            setRelayState(data.latest.relayState);
          }
          if (data.settings) {
            setSettings(data.settings);
          }
        }
      })
      .catch((err) => {
        console.warn('Initial fetch fallback to simulated state:', err);
      });
  }, []);

  // Connect to SSE real-time stream
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/telemetry/stream');

        eventSource.onmessage = (event) => {
          try {
            const data: TelemetryPoint = JSON.parse(event.data);
            setTelemetry(data);
            setRelayState(data.relayState);
            setIsESPOnline(data.source === 'esp32');
            setIsSimulated(data.source === 'simulated');

            setHistory((prev) => {
              const updated = [...prev, data];
              return updated.length > 120 ? updated.slice(-120) : updated;
            });
          } catch (e) {
            console.error('Error parsing SSE event:', e);
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Reconnect after 3 seconds
          reconnectTimeout = setTimeout(connectSSE, 3000);
        };
      } catch (err) {
        console.error('SSE initialization error:', err);
        reconnectTimeout = setTimeout(connectSSE, 3000);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  // Relay toggle handler
  const handleToggleRelay = useCallback(async () => {
    const newState = !relayState;
    setRelayState(newState);
    setTelemetry((prev) => ({ ...prev, relayState: newState }));

    try {
      await fetch('/api/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState }),
      });
    } catch (err) {
      console.error('Failed to update relay state on server:', err);
    }
  }, [relayState]);

  // Reset energy counter handler
  const handleResetEnergy = useCallback(async () => {
    setTelemetry((prev) => ({ ...prev, energy: 0 }));
    try {
      await fetch('/api/telemetry/reset-energy', { method: 'POST' });
    } catch (err) {
      console.error('Failed to reset energy counter:', err);
    }
  }, []);

  // Update settings handler
  const handleUpdateSettings = useCallback(
    async (newSettings: Partial<DeviceSettings>) => {
      setSettings((prev) => ({ ...prev, ...newSettings }));
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSettings),
        });
      } catch (err) {
        console.error('Failed to update settings:', err);
      }
    },
    []
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* 3-Zone Top Navigation Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        relayState={relayState}
        onToggleRelay={handleToggleRelay}
        isESPOnline={isESPOnline}
        isSimulated={isSimulated}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Dynamic Tab Views */}
        {activeTab === 'telemetry' && (
          <LiveTelemetryView
            telemetry={telemetry}
            history={history}
            settings={settings}
            relayState={relayState}
            onToggleRelay={handleToggleRelay}
            onResetEnergy={handleResetEnergy}
            onUpdateSettings={handleUpdateSettings}
            isESPOnline={isESPOnline}
          />
        )}

        {activeTab === 'oled' && (
          <OledMirrorView
            telemetry={telemetry}
            settings={settings}
            relayState={relayState}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {activeTab === 'pinout' && <HardwarePinoutView />}

        {activeTab === 'firmware' && <Esp32CodeGenerator settings={settings} />}
      </main>

      {/* Quiet, Anti-Slop Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 px-4 sm:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>ESP32-WROOM-32 Smart Energy Meter</span>
            <span aria-hidden="true">·</span>
            <span>ZMPT101B + ACS712 + 5V Relay + SSD1306</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Sampling: 400 Samples/Cycle RMS</span>
            <span aria-hidden="true">·</span>
            <span>Protocol: HTTP JSON / SSE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
