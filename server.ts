import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TelemetryPoint {
  id: string;
  timestamp: number;
  voltage: number;
  current: number;
  power: number;
  apparentPower: number;
  powerFactor: number;
  frequency: number;
  energy: number;
  relayState: boolean;
  source: 'esp32' | 'simulated';
}

interface DeviceSettings {
  currency: string;
  tariffPerKWh: number;
  maxCurrentTrip: number; // in Amperes
  maxVoltageTrip: number; // in Volts
  minVoltageTrip: number; // in Volts
  autoTripEnabled: boolean;
  nominalVoltage: number; // 230 or 120
  sensorModelACS: 'ACS712-05B' | 'ACS712-20A' | 'ACS712-30A';
  simulationActive: boolean;
  activeLoadProfile: 'idle' | 'bulb_60w' | 'fridge_150w' | 'heater_1500w' | 'microwave_900w' | 'custom';
  customPowerWatts: number;
  customPowerFactor: number;
}

// In-memory application state
const settings: DeviceSettings = {
  currency: 'USD ($)',
  tariffPerKWh: 0.16,
  maxCurrentTrip: 10.0,
  maxVoltageTrip: 260.0,
  minVoltageTrip: 180.0,
  autoTripEnabled: true,
  nominalVoltage: 230.0,
  sensorModelACS: 'ACS712-20A',
  simulationActive: true,
  activeLoadProfile: 'bulb_60w',
  customPowerWatts: 350,
  customPowerFactor: 0.95,
};

let relayState = true;
let totalEnergyAccumulatedKWh = 0.084;
let lastSeenESP32: number | null = null;
let lastSource: 'esp32' | 'simulated' = 'simulated';

let currentTelemetry: TelemetryPoint = {
  id: 'init-0',
  timestamp: Date.now(),
  voltage: 230.8,
  current: 0.26,
  power: 59.8,
  apparentPower: 60.0,
  powerFactor: 0.99,
  frequency: 50.0,
  energy: totalEnergyAccumulatedKWh,
  relayState: true,
  source: 'simulated',
};

const history: TelemetryPoint[] = [];

// Seed initial 30 history points for instant telemetry charts
const now = Date.now();
for (let i = 29; i >= 0; i--) {
  const t = now - i * 2000;
  const v = 230 + (Math.sin(i * 0.3) * 2.2);
  const a = relayState ? (0.26 + Math.sin(i * 0.5) * 0.02) : 0;
  const p = Math.round(v * a * 0.98 * 10) / 10;
  history.push({
    id: `seed-${i}`,
    timestamp: t,
    voltage: Math.round(v * 10) / 10,
    current: Math.round(a * 100) / 100,
    power: p,
    apparentPower: Math.round(v * a * 10) / 10,
    powerFactor: 0.99,
    frequency: 50.0,
    energy: Math.round((totalEnergyAccumulatedKWh - (i * 0.00003)) * 10000) / 10000,
    relayState: relayState,
    source: 'simulated',
  });
}

// SSE client subscribers
const sseClients: Response[] = [];

function broadcastTelemetry(point: TelemetryPoint) {
  const data = JSON.stringify(point);
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.write(`data: ${data}\n\n`);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

// Check auto-trip protection
function checkProtectionRules(voltage: number, current: number): boolean {
  if (!settings.autoTripEnabled || !relayState) return false;

  let tripped = false;
  if (current > settings.maxCurrentTrip) {
    tripped = true;
    console.warn(`[SAFETY TRIP] Over-current detected: ${current}A > ${settings.maxCurrentTrip}A limit. Disabling relay.`);
  } else if (voltage > settings.maxVoltageTrip || (voltage < settings.minVoltageTrip && voltage > 50)) {
    tripped = true;
    console.warn(`[SAFETY TRIP] Voltage out of safe bounds: ${voltage}V. Disabling relay.`);
  }

  if (tripped) {
    relayState = false;
  }
  return tripped;
}

// Periodic simulator ticker (when ESP32 is not sending live data or simulation is enabled)
setInterval(() => {
  const esp32Active = lastSeenESP32 !== null && (Date.now() - lastSeenESP32 < 8000);

  if (esp32Active) {
    // Real ESP32 is actively streaming data, don't simulate
    return;
  }

  if (!settings.simulationActive) {
    return;
  }

  // Calculate simulated load based on profile
  let targetWatts = 0;
  let targetPf = 0.98;

  if (relayState) {
    switch (settings.activeLoadProfile) {
      case 'idle':
        targetWatts = 4.5 + Math.random() * 1.5;
        targetPf = 0.65;
        break;
      case 'bulb_60w':
        targetWatts = 60.0 + (Math.sin(Date.now() / 3000) * 1.8);
        targetPf = 0.99;
        break;
      case 'fridge_150w':
        // Cycle every 20s
        const cycle = Math.sin(Date.now() / 6000) > 0.1;
        targetWatts = cycle ? 145 + Math.sin(Date.now() / 2000) * 8 : 6.2;
        targetPf = cycle ? 0.82 : 0.6;
        break;
      case 'heater_1500w':
        targetWatts = 1480 + (Math.random() * 25 - 12);
        targetPf = 1.0;
        break;
      case 'microwave_900w':
        targetWatts = 920 + Math.sin(Date.now() / 1500) * 35;
        targetPf = 0.91;
        break;
      case 'custom':
        targetWatts = settings.customPowerWatts + (Math.random() * 4 - 2);
        targetPf = settings.customPowerFactor;
        break;
    }
  } else {
    targetWatts = 0;
    targetPf = 1.0;
  }

  // Grid voltage oscillation ~230V +/- 2.5V + slight random noise
  const voltageBase = settings.nominalVoltage;
  const gridJitter = Math.sin(Date.now() / 7000) * 2.2 + (Math.random() * 0.8 - 0.4);
  const voltage = Math.round((voltageBase + gridJitter) * 10) / 10;

  // Current calculation
  const current = relayState && targetWatts > 0 
    ? Math.round((targetWatts / (voltage * targetPf)) * 1000) / 1000
    : 0.0;

  const power = Math.round(voltage * current * targetPf * 10) / 10;
  const apparentPower = Math.round(voltage * current * 10) / 10;

  // Accumulate energy (P * dt in seconds / 3600 / 1000)
  // Interval is 1000ms = 1 sec
  const deltaKWh = (power / 1000) * (1 / 3600);
  totalEnergyAccumulatedKWh += deltaKWh;

  checkProtectionRules(voltage, current);

  const newPoint: TelemetryPoint = {
    id: `sim-${Date.now()}`,
    timestamp: Date.now(),
    voltage,
    current,
    power,
    apparentPower,
    powerFactor: targetPf,
    frequency: Math.round((50.0 + (Math.sin(Date.now() / 9000) * 0.08)) * 100) / 100,
    energy: Math.round(totalEnergyAccumulatedKWh * 10000) / 10000,
    relayState,
    source: 'simulated',
  };

  currentTelemetry = newPoint;
  lastSource = 'simulated';

  history.push(newPoint);
  if (history.length > 120) {
    history.shift();
  }

  broadcastTelemetry(newPoint);
}, 1000);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // 1. ESP32 Telemetry Ingestion Endpoint
  // ESP32 sends HTTP POST /api/telemetry
  app.post('/api/telemetry', (req: Request, res: Response) => {
    try {
      const {
        voltage,
        current,
        power,
        apparentPower,
        powerFactor,
        frequency,
        energy,
        relay,
      } = req.body;

      const v = typeof voltage === 'number' ? Math.round(voltage * 10) / 10 : currentTelemetry.voltage;
      const c = typeof current === 'number' ? Math.round(current * 1000) / 1000 : currentTelemetry.current;
      const pf = typeof powerFactor === 'number' ? Math.min(1, Math.max(0, powerFactor)) : 0.98;
      const p = typeof power === 'number' ? Math.round(power * 10) / 10 : Math.round(v * c * pf * 10) / 10;
      const s = typeof apparentPower === 'number' ? apparentPower : Math.round(v * c * 10) / 10;
      const f = typeof frequency === 'number' ? frequency : 50.0;
      
      if (typeof energy === 'number') {
        totalEnergyAccumulatedKWh = energy;
      } else {
        totalEnergyAccumulatedKWh += (p / 1000) * (1 / 3600);
      }

      if (typeof relay === 'boolean') {
        relayState = relay;
      }

      checkProtectionRules(v, c);

      lastSeenESP32 = Date.now();
      lastSource = 'esp32';

      const point: TelemetryPoint = {
        id: `esp-${Date.now()}`,
        timestamp: Date.now(),
        voltage: v,
        current: c,
        power: p,
        apparentPower: s,
        powerFactor: pf,
        frequency: f,
        energy: Math.round(totalEnergyAccumulatedKWh * 10000) / 10000,
        relayState,
        source: 'esp32',
      };

      currentTelemetry = point;
      history.push(point);
      if (history.length > 120) history.shift();

      broadcastTelemetry(point);

      // Respond to ESP32 with current requested relay state and auto-trip parameters
      res.json({
        success: true,
        relayState,
        maxCurrentTrip: settings.maxCurrentTrip,
        autoTripEnabled: settings.autoTripEnabled,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 2. Telemetry Retrieval
  app.get('/api/telemetry/latest', (req: Request, res: Response) => {
    const isESPOnline = lastSeenESP32 !== null && (Date.now() - lastSeenESP32 < 8000);
    res.json({
      latest: currentTelemetry,
      relayState,
      totalEnergyAccumulatedKWh: Math.round(totalEnergyAccumulatedKWh * 10000) / 10000,
      estimatedCost: Math.round(totalEnergyAccumulatedKWh * settings.tariffPerKWh * 100) / 100,
      source: lastSource,
      isESPOnline,
      lastSeenESP32,
    });
  });

  app.get('/api/telemetry/history', (req: Request, res: Response) => {
    res.json({
      history,
      latest: currentTelemetry,
      settings,
      relayState,
    });
  });

  // 3. Real-time SSE Stream
  app.get('/api/telemetry/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send immediate initial state
    res.write(`data: ${JSON.stringify(currentTelemetry)}\n\n`);
    sseClients.push(res);

    req.on('close', () => {
      const idx = sseClients.indexOf(res);
      if (idx !== -1) sseClients.splice(idx, 1);
    });
  });

  // 4. Relay Control Endpoints (used by Web App & ESP32 Polling)
  app.post('/api/relay', (req: Request, res: Response) => {
    const { state } = req.body;
    if (typeof state === 'boolean') {
      relayState = state;
      currentTelemetry.relayState = state;
      broadcastTelemetry(currentTelemetry);
      return res.json({ success: true, relayState });
    }
    res.status(400).json({ success: false, error: 'state must be a boolean' });
  });

  app.post('/api/relay/toggle', (req: Request, res: Response) => {
    relayState = !relayState;
    currentTelemetry.relayState = relayState;
    broadcastTelemetry(currentTelemetry);
    res.json({ success: true, relayState });
  });

  app.get('/api/relay/status', (req: Request, res: Response) => {
    res.json({
      relayState,
      maxCurrentTrip: settings.maxCurrentTrip,
      autoTripEnabled: settings.autoTripEnabled,
      timestamp: Date.now(),
    });
  });

  // 5. Settings Endpoints
  app.get('/api/settings', (req: Request, res: Response) => {
    res.json(settings);
  });

  app.post('/api/settings', (req: Request, res: Response) => {
    const newSettings = req.body;
    Object.assign(settings, newSettings);
    res.json({ success: true, settings });
  });

  // 6. Energy Counter Reset
  app.post('/api/telemetry/reset-energy', (req: Request, res: Response) => {
    totalEnergyAccumulatedKWh = 0;
    currentTelemetry.energy = 0;
    broadcastTelemetry(currentTelemetry);
    res.json({ success: true, energy: 0 });
  });

  // Vite Integration
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Smart Energy Meter Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
