import React, { useState } from 'react';
import { Copy, Check, Download, Wifi, ShieldAlert, Cpu } from 'lucide-react';
import { DeviceSettings } from '../types/telemetry';

interface Esp32CodeGeneratorProps {
  settings: DeviceSettings;
}

export const Esp32CodeGenerator: React.FC<Esp32CodeGeneratorProps> = ({ settings }) => {
  const [wifiSsid, setWifiSsid] = useState<string>('MyHomeWiFi');
  const [wifiPassword, setWifiPassword] = useState<string>('WiFiPassword123');
  const [serverUrl, setServerUrl] = useState<string>(
    typeof window !== 'undefined' ? window.location.origin : 'https://your-applet-url.run.app'
  );
  const [relayActiveLow, setRelayActiveLow] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Generate complete Arduino C++ code
  const code = `/*
 * =====================================================================
 * ESP32 Smart Energy Meter - IoT Telemetry & Relay Controller
 * =====================================================================
 * Target: ESP32-WROOM-32 (30-Pin Dev Board)
 * Sensors: ZMPT101B (Voltage), ACS712 (Current)
 * Display: 0.96" I2C OLED (SSD1306 128x64)
 * Actuator: 1-Channel 5V Relay Module
 * 
 * Required Libraries in Arduino Library Manager:
 * 1. "Adafruit SSD1306" by Adafruit
 * 2. "Adafruit GFX Library" by Adafruit
 * =====================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ---------- Network Configuration ----------
const char* ssid = "${wifiSsid}";
const char* password = "${wifiPassword}";
const char* serverTelemetryUrl = "${serverUrl}/api/telemetry";

// ---------- Hardware Pin Definitions (30-Pin ESP32) ----------
#define PIN_ZMPT101B      34    // ADC1_CH6 (Voltage Sensor Analog OUT)
#define PIN_ACS712        35    // ADC1_CH7 (Current Sensor Analog OUT)
#define PIN_RELAY          4    // Relay Control (Digital OUT)
#define OLED_SDA          21    // I2C Data
#define OLED_SCL          22    // I2C Clock

// ---------- OLED Display Setup ----------
#define SCREEN_WIDTH     128
#define SCREEN_HEIGHT     64
#define OLED_RESET        -1
#define SCREEN_ADDRESS  0x3C    // Common I2C address for 0.96" SSD1306
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ---------- Calibration Factors ----------
// ACS712 Sensitivity: 5A = 0.185 V/A, 20A = 0.100 V/A, 30A = 0.066 V/A
const float ACS_SENSITIVITY = ${
    settings.sensorModelACS === 'ACS712-05B'
      ? '0.185'
      : settings.sensorModelACS === 'ACS712-20A'
      ? '0.100'
      : '0.066'
  }; 
const float VCC_REFERENCE = 3.3;      // ESP32 ADC reference voltage
const int ADC_RESOLUTION = 4095;      // 12-bit ADC
const float V_CALIBRATION = 1.0;       // ZMPT101B scaling factor
const bool RELAY_ACTIVE_LOW = ${relayActiveLow ? 'true' : 'false'};

// ---------- Runtime Variables ----------
bool relayState = true;
float totalEnergyKWh = 0.0;
unsigned long lastSampleTime = 0;
unsigned long lastSyncTime = 0;
float currentV_RMS = 0.0;
float currentI_RMS = 0.0;
float currentPowerW = 0.0;

// Set relay coil state
void setRelay(bool state) {
  relayState = state;
  if (RELAY_ACTIVE_LOW) {
    digitalWrite(PIN_RELAY, state ? LOW : HIGH);
  } else {
    digitalWrite(PIN_RELAY, state ? HIGH : LOW);
  }
}

// Samples AC mains voltage from ZMPT101B over full cycles
float readVoltageRMS() {
  const int SAMPLES = 400;
  float sumSquaredDiff = 0;
  long sumRaw = 0;

  // First pass: find DC midpoint offset
  for (int i = 0; i < SAMPLES; i++) {
    sumRaw += analogRead(PIN_ZMPT101B);
    delayMicroseconds(50);
  }
  float midPoint = (float)sumRaw / SAMPLES;

  // Second pass: compute RMS of AC component
  for (int i = 0; i < SAMPLES; i++) {
    float raw = analogRead(PIN_ZMPT101B);
    float diff = raw - midPoint;
    sumSquaredDiff += (diff * diff);
    delayMicroseconds(50);
  }

  float rmsRaw = sqrt(sumSquaredDiff / SAMPLES);
  // Convert 12-bit ADC units to RMS Voltage
  float voltage = (rmsRaw / ADC_RESOLUTION) * VCC_REFERENCE * 230.0 * V_CALIBRATION;
  
  if (voltage < 15.0) voltage = 0.0; // Cut off ambient noise
  return voltage;
}

// Samples AC load current from ACS712 over full cycles
float readCurrentRMS() {
  if (!relayState) return 0.0;

  const int SAMPLES = 400;
  float sumSquaredDiff = 0;
  long sumRaw = 0;

  for (int i = 0; i < SAMPLES; i++) {
    sumRaw += analogRead(PIN_ACS712);
    delayMicroseconds(50);
  }
  float midPoint = (float)sumRaw / SAMPLES;

  for (int i = 0; i < SAMPLES; i++) {
    float raw = analogRead(PIN_ACS712);
    float diff = raw - midPoint;
    sumSquaredDiff += (diff * diff);
    delayMicroseconds(50);
  }

  float rmsRaw = sqrt(sumSquaredDiff / SAMPLES);
  float voltageRMS = (rmsRaw / ADC_RESOLUTION) * VCC_REFERENCE;
  float current = voltageRMS / ACS_SENSITIVITY;

  if (current < 0.05) current = 0.0; // Filter low idle noise
  return current;
}

// Update 0.96" OLED screen buffer
void updateOLED(float v, float i, float p, float e) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  // Header Bar
  display.setCursor(0, 0);
  display.print("SMART METER ");
  display.print(relayState ? "[ON]" : "[OFF]");
  display.drawLine(0, 9, 128, 9, SSD1306_WHITE);

  // Live Metrics
  display.setCursor(0, 13);
  display.print("V_RMS: ");
  display.print(v, 1);
  display.print(" V");

  display.setCursor(0, 24);
  display.print("I_RMS: ");
  display.print(i, 2);
  display.print(" A");

  display.setCursor(0, 35);
  display.print("POWER: ");
  display.print(p, 0);
  display.print(" W");

  display.setCursor(0, 46);
  display.print("ENGY:  ");
  display.print(e, 3);
  display.print(" kWh");

  // Footer status
  display.drawLine(0, 56, 128, 56, SSD1306_WHITE);
  display.setCursor(0, 57);
  display.print("WiFi: ");
  display.print(WiFi.status() == WL_CONNECTED ? "OK" : "RETRY");

  display.display();
}

// Sends real-time telemetry to the Web Server via HTTP POST
void sendTelemetryHttp(float v, float i, float p, float e) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(serverTelemetryUrl);
  http.addHeader("Content-Type", "application/json");

  // Format JSON payload
  String payload = "{";
  payload += "\\"voltage\\":" + String(v, 1) + ",";
  payload += "\\"current\\":" + String(i, 3) + ",";
  payload += "\\"power\\":" + String(p, 1) + ",";
  payload += "\\"energy\\":" + String(e, 5) + ",";
  payload += "\\"relay\\":" + String(relayState ? "true" : "false");
  payload += "}";

  int httpCode = http.POST(payload);
  if (httpCode == HTTP_CODE_OK) {
    String response = http.getString();
    // Parse relay response if command changed from dashboard
    if (response.indexOf("\\"relayState\\":false") != -1 && relayState) {
      setRelay(false);
    } else if (response.indexOf("\\"relayState\\":true") != -1 && !relayState) {
      setRelay(true);
    }
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(500);

  // Initialize Pins
  pinMode(PIN_RELAY, OUTPUT);
  setRelay(true); // Default ON

  analogReadResolution(12); // 12-bit ADC (0 - 4095)
  analogSetAttenuation(ADC_11db); // For full 0-3.3V range

  // Initialize OLED
  Wire.begin(OLED_SDA, OLED_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed!"));
  } else {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(10, 20);
    display.println("Smart Energy Meter");
    display.setCursor(10, 35);
    display.println("Connecting WiFi...");
    display.display();
  }

  // Connect WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\\nWiFi Connected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\\nWiFi not connected, will retry in loop.");
  }
}

void loop() {
  unsigned long now = millis();

  // 1. Sample Sensors every 500ms
  if (now - lastSampleTime >= 500) {
    unsigned long dt = now - lastSampleTime;
    lastSampleTime = now;

    currentV_RMS = readVoltageRMS();
    currentI_RMS = readCurrentRMS();
    currentPowerW = currentV_RMS * currentI_RMS * 0.98; // Approximate PF 0.98

    // Accumulate Energy (kWh = Watts * dt_hours / 1000)
    float deltaKWh = (currentPowerW / 1000.0) * (dt / 3600000.0);
    totalEnergyKWh += deltaKWh;

    // Safety trip check (> 10 Amps)
    if (currentI_RMS > ${settings.maxCurrentTrip.toFixed(1)} && relayState) {
      Serial.println("SAFETY TRIP: Current exceeded safe threshold!");
      setRelay(false);
    }

    // Refresh OLED
    updateOLED(currentV_RMS, currentI_RMS, currentPowerW, totalEnergyKWh);
  }

  // 2. Post Telemetry to Cloud Web Server every 1.5 seconds
  if (now - lastSyncTime >= 1500) {
    lastSyncTime = now;
    sendTelemetryHttp(currentV_RMS, currentI_RMS, currentPowerW, totalEnergyKWh);
  }
}
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ESP32_Smart_Energy_Meter.ino';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              Ready-to-Flash ESP32 Arduino C++ Firmware
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Fully configured sketch tailored to your 30-pin board, ZMPT101B, ACS712, 0.96" OLED, and 5V relay.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Code'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .ino</span>
            </button>
          </div>
        </div>
      </div>

      {/* Firmware Parameter Customizer */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Wifi className="w-4 h-4 text-cyan-400" />
          <span>In-Code Parameters (Dynamically Updates Arduino Sketch)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">WiFi Network SSID:</label>
            <input
              type="text"
              value={wifiSsid}
              onChange={(e) => setWifiSsid(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
              placeholder="Your WiFi SSID"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">WiFi Password:</label>
            <input
              type="text"
              value={wifiPassword}
              onChange={(e) => setWifiPassword(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
              placeholder="WiFi Password"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Web Server Endpoint:</label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
              placeholder="http://192.168.1.100:3000"
            />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-slate-300">5V Relay Module Logic:</span>
            <button
              onClick={() => setRelayActiveLow(true)}
              className={`px-2 py-0.5 rounded font-mono ${
                relayActiveLow ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'bg-slate-950 text-slate-400'
              }`}
            >
              Active LOW (Most Common)
            </button>
            <button
              onClick={() => setRelayActiveLow(false)}
              className={`px-2 py-0.5 rounded font-mono ${
                !relayActiveLow ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'bg-slate-950 text-slate-400'
              }`}
            >
              Active HIGH
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Current Sensor: {settings.sensorModelACS}
          </div>
        </div>
      </div>

      {/* Code Editor Preview Box */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>ESP32_Smart_Energy_Meter.ino</span>
          <span>C++ · Arduino Framework</span>
        </div>
        <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed select-text">
          <code>{code}</code>
        </pre>
      </div>

      {/* Step-by-step Flashing Guide */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>How to Flash onto your 30-Pin ESP32</span>
        </h4>
        <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
          <li>
            Open the <strong>Arduino IDE</strong> (v2.0+) or VS Code with <strong>PlatformIO</strong>.
          </li>
          <li>
            Go to <strong>Tools &rarr; Board &rarr; esp32 &rarr; ESP32 Dev Module</strong> (or DOIT ESP32 DEVKIT V1).
          </li>
          <li>
            Go to <strong>Sketch &rarr; Include Library &rarr; Manage Libraries</strong>, and install:
            <code className="text-cyan-400 mx-1">Adafruit SSD1306</code> and <code className="text-cyan-400 mx-1">Adafruit GFX Library</code>.
          </li>
          <li>
            Connect your ESP32 WROOM 30-pin board via micro-USB, select the COM Port, and click <strong>Upload</strong>.
          </li>
          <li>
            The OLED display will light up with the live dashboard, and telemetry will start streaming directly to this webpage!
          </li>
        </ol>
      </div>
    </div>
  );
};
