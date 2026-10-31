export interface TelemetryPoint {
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

export interface DeviceSettings {
  currency: string;
  tariffPerKWh: number;
  maxCurrentTrip: number;
  maxVoltageTrip: number;
  minVoltageTrip: number;
  autoTripEnabled: boolean;
  nominalVoltage: number;
  sensorModelACS: 'ACS712-05B' | 'ACS712-20A' | 'ACS712-30A';
  simulationActive: boolean;
  activeLoadProfile: 'lamp_9w' | 'idle' | string;
  customPowerWatts: number;
  customPowerFactor: number;
}

export interface PinMapping {
  espPin: string;
  pinNumber: number;
  function: string;
  connectedTo: string;
  wireColor: string;
  notes: string;
}
