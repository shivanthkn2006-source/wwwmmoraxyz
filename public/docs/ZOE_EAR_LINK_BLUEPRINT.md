# 🎧 ZOE EAR-LINK COMPLETE BLUEPRINT
## $35 USD "Thin Client" AI Wearable - Technical Specification Document

**Version:** 1.0  
**Date:** January 2026  
**Platform:** Zoe Infinity  
**Target Latency:** ~500ms  

---

# 📋 TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Bill of Materials](#2-bill-of-materials)
3. [Hardware Architecture](#3-hardware-architecture)
4. [Wiring Diagrams](#4-wiring-diagrams)
5. [Complete Firmware Code](#5-complete-firmware-code)
6. [Cloud Integration](#6-cloud-integration)
7. [3D Printing Specifications](#7-3d-printing-specifications)
8. [Assembly Instructions](#8-assembly-instructions)
9. [Testing & Debugging](#9-testing--debugging)
10. [Troubleshooting Guide](#10-troubleshooting-guide)

---

# 1. EXECUTIVE SUMMARY

## 1.1 Project Vision

The **Zoe Ear-Link** is a "Thin Client" AI wearable inspired by the movie "Her" - providing an intimate, always-available AI companion experience. The device captures voice, streams it to the Zoe Infinity cloud brain, and plays back responses through bone conduction technology.

## 1.2 Key Features

| Feature | Description |
|---------|-------------|
| **Form Factor** | Lightweight ear-hook design (~15g) |
| **Audio Input** | High-fidelity MEMS microphone |
| **Audio Output** | Bone conduction (ears remain open) |
| **Connectivity** | WiFi 802.11 b/g/n + Bluetooth 5.0 |
| **Battery Life** | 2-3 hours continuous use |
| **Latency** | ~500ms end-to-end |
| **Cost** | $28-35 USD total |

## 1.3 Design Philosophy

```
┌─────────────────────────────────────────────────────────────┐
│                    THIN CLIENT ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   DEVICE (Simple)              CLOUD (Intelligent)         │
│   ┌─────────────┐              ┌─────────────────┐         │
│   │ • Capture   │   ──────▶   │ • Transcription │         │
│   │ • Stream    │              │ • AI Processing │         │
│   │ • Playback  │   ◀──────   │ • TTS Response  │         │
│   └─────────────┘              └─────────────────┘         │
│                                                             │
│   Intelligence lives in the cloud, not on the device.      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# 2. BILL OF MATERIALS

## 2.1 Complete Parts List

| # | Component | Model/Spec | Quantity | Unit Cost | Total |
|---|-----------|------------|----------|-----------|-------|
| 1 | Microcontroller | Seeed XIAO ESP32-S3 | 1 | $7.49 | $7.49 |
| 2 | MEMS Microphone | INMP441 I2S | 1 | $2.50 | $2.50 |
| 3 | I2S Amplifier | MAX98357A 3W | 1 | $3.00 | $3.00 |
| 4 | Bone Conduction | 4Ω 3W Transducer | 1 | $8.00 | $8.00 |
| 5 | LiPo Battery | 3.7V 250mAh 501230 | 1 | $4.00 | $4.00 |
| 6 | Slide Switch | SS12D00G3 SPDT | 1 | $0.20 | $0.20 |
| 7 | Push Button | 6x6x5mm Tactile | 1 | $0.10 | $0.10 |
| 8 | Wire | 28AWG Silicone (1m) | 1 | $1.00 | $1.00 |
| 9 | Heat Shrink | Assorted Pack | 1 | $1.00 | $1.00 |
| 10 | PLA-CF Filament | Matte Carbon 50g | 1 | $5.00 | $5.00 |
| 11 | Ear Cushion | Silicone Pad | 2 | $0.50 | $1.00 |
| 12 | USB-C Cable | Charging (0.5m) | 1 | $1.50 | $1.50 |
| | | | | **TOTAL** | **$34.79** |

## 2.2 Supplier Links

```
XIAO ESP32-S3:     https://www.seeedstudio.com/XIAO-ESP32S3-p-5627.html
INMP441:           https://www.aliexpress.com (search "INMP441 I2S")
MAX98357A:         https://www.adafruit.com/product/3006
Bone Transducer:   https://www.aliexpress.com (search "bone conduction driver")
LiPo 501230:       https://www.aliexpress.com (search "501230 lipo")
```

## 2.3 Tools Required

| Tool | Purpose | Est. Cost |
|------|---------|-----------|
| Soldering Iron | Fine tip, 350°C | $25 |
| Solder | 0.6mm 60/40 | $8 |
| Wire Strippers | 28-30 AWG | $10 |
| 3D Printer | FDM, 0.4mm nozzle | (varies) |
| Multimeter | Continuity testing | $15 |
| Hot Glue Gun | Assembly | $10 |

---

# 3. HARDWARE ARCHITECTURE

## 3.1 System Block Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ZOE EAR-LINK SYSTEM DIAGRAM                       │
└─────────────────────────────────────────────────────────────────────────┘

                              POWER SYSTEM
                    ┌──────────────────────────┐
                    │   LiPo 3.7V 250mAh       │
                    │   ┌──────────────────┐   │
                    │   │ + ────┬───────── │   │
                    │   │       │ Switch   │   │
                    │   │ - ────┼───────── │   │
                    │   └───────┼──────────┘   │
                    └───────────┼──────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         XIAO ESP32-S3                                    │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │   3V3  ●────────────────┬─────────────────────────● VDD (MIC)    │   │
│  │                         │                                         │   │
│  │   GND  ●────────────────┼─────────────────────────● GND (MIC)    │   │
│  │                         │                         ● GND (AMP)    │   │
│  │                         │                                         │   │
│  │   D0   ●────────────────│─────────────────────────● WS  (MIC)    │   │
│  │   D1   ●────────────────│─────────────────────────● SCK (MIC)    │   │
│  │   D2   ●────────────────│─────────────────────────● SD  (MIC)    │   │
│  │                         │                                         │   │
│  │   D3   ●────────────────│─────────────────────────● BCLK (AMP)   │   │
│  │   D4   ●────────────────│─────────────────────────● LRC  (AMP)   │   │
│  │   D5   ●────────────────│─────────────────────────● DIN  (AMP)   │   │
│  │                         │                                         │   │
│  │   3V3  ●────────────────┴─────────────────────────● VIN (AMP)    │   │
│  │                                                                   │   │
│  │   BAT+ ●──────────────────────────────────────────● LiPo (+)     │   │
│  │   BAT- ●──────────────────────────────────────────● LiPo (-)     │   │
│  │                                                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                    │                       │
                    ▼                       ▼
        ┌───────────────────┐   ┌───────────────────────────┐
        │     INMP441       │   │       MAX98357A           │
        │   MEMS Microphone │   │      I2S Amplifier        │
        │                   │   │           │               │
        │   24-bit audio    │   │           ▼               │
        │   I2S digital out │   │   ┌───────────────┐       │
        │   60dB SNR        │   │   │ Bone Driver   │       │
        │                   │   │   │ 4Ω 3W         │       │
        └───────────────────┘   │   └───────────────┘       │
                                └───────────────────────────┘
```

## 3.2 ESP32-S3 Pin Mapping

| GPIO | Function | Connected To |
|------|----------|--------------|
| D0 (GPIO1) | I2S_MIC_WS | INMP441 WS |
| D1 (GPIO2) | I2S_MIC_SCK | INMP441 SCK |
| D2 (GPIO3) | I2S_MIC_SD | INMP441 SD |
| D3 (GPIO4) | I2S_SPK_BCLK | MAX98357A BCLK |
| D4 (GPIO5) | I2S_SPK_LRC | MAX98357A LRC |
| D5 (GPIO6) | I2S_SPK_DIN | MAX98357A DIN |
| D6 (GPIO7) | BUTTON_PIN | Push Button |
| 3V3 | Power | MIC VDD, AMP VIN |
| GND | Ground | All GND |
| BAT+ | Battery | LiPo + |
| BAT- | Battery | LiPo - |

## 3.3 Component Specifications

### INMP441 MEMS Microphone
```
┌────────────────────────────────────────┐
│           INMP441 PINOUT               │
├────────────────────────────────────────┤
│                                        │
│   VDD ●───────── 3.3V Power           │
│   GND ●───────── Ground               │
│   SD  ●───────── Serial Data (I2S)    │
│   WS  ●───────── Word Select (LRCLK)  │
│   SCK ●───────── Serial Clock (BCLK)  │
│   L/R ●───────── Left/Right (GND=Left)│
│                                        │
│   Operating Voltage: 1.8V - 3.3V       │
│   Current Draw: 1.4mA                  │
│   SNR: 61dB                            │
│   Sensitivity: -26dBFS                 │
│   Frequency Response: 60Hz - 15kHz     │
│                                        │
└────────────────────────────────────────┘
```

### MAX98357A I2S Amplifier
```
┌────────────────────────────────────────┐
│          MAX98357A PINOUT              │
├────────────────────────────────────────┤
│                                        │
│   VIN  ●───────── 2.5V - 5.5V Power   │
│   GND  ●───────── Ground              │
│   SD   ●───────── Shutdown (float=on) │
│   GAIN ●───────── Gain Select         │
│   DIN  ●───────── I2S Data In         │
│   BCLK ●───────── I2S Bit Clock       │
│   LRC  ●───────── I2S L/R Clock       │
│                                        │
│   Output Power: 3.2W @ 4Ω             │
│   THD+N: 0.03%                         │
│   PSRR: 77dB                           │
│   Efficiency: 92%                      │
│                                        │
│   GAIN Settings:                       │
│   - GND = 9dB                          │
│   - Float = 12dB (default)             │
│   - VIN = 15dB                         │
│                                        │
└────────────────────────────────────────┘
```

---

# 4. WIRING DIAGRAMS

## 4.1 Complete Schematic

```
                                    +3.3V
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          │    ┌──────────────────────┴──────────────────────┐   │
          │    │                                              │   │
          │    │              XIAO ESP32-S3                   │   │
          │    │                                              │   │
          │    │   ┌────┐                          ┌────┐    │   │
          │    │   │USB │                          │ANT │    │   │
          │    │   └────┘                          └────┘    │   │
          │    │                                              │   │
          │    │  3V3 ● ─────────────────────────────────┐   │   │
          │    │  GND ● ──────────────────────────────┐  │   │   │
          │    │   D0 ● ───────────────────────────┐  │  │   │   │
          │    │   D1 ● ────────────────────────┐  │  │  │   │   │
          │    │   D2 ● ─────────────────────┐  │  │  │  │   │   │
          │    │   D3 ● ──────────────────┐  │  │  │  │  │   │   │
          │    │   D4 ● ───────────────┐  │  │  │  │  │  │   │   │
          │    │   D5 ● ────────────┐  │  │  │  │  │  │  │   │   │
          │    │   D6 ● ─────────┐  │  │  │  │  │  │  │  │   │   │
          │    │                 │  │  │  │  │  │  │  │  │   │   │
          │    │  BAT+ ● ─────┐  │  │  │  │  │  │  │  │  │   │   │
          │    │  BAT- ● ──┐  │  │  │  │  │  │  │  │  │  │   │   │
          │    │           │  │  │  │  │  │  │  │  │  │  │   │   │
          │    └───────────┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼───┘   │
          │                │  │  │  │  │  │  │  │  │  │  │       │
          │                │  │  │  │  │  │  │  │  │  │  │       │
          │    ┌───────────┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼───────┤
          │    │           │  │  │  │  │  │  │  │  │  │  │       │
          │    │  LIPO     │  │  │  │  │  │  │  │  │  │  │       │
          │    │  250mAh   │  │  │  │  │  │  │  │  │  │  │       │
          │    │  ┌────┐   │  │  │  │  │  │  │  │  │  │  │       │
          │    │  │ +  │───┘  │  │  │  │  │  │  │  │  │  │       │
          │    │  │ -  │──────┘  │  │  │  │  │  │  │  │  │       │
          │    │  └────┘         │  │  │  │  │  │  │  │  │       │
          │    │                 │  │  │  │  │  │  │  │  │       │
          │    └─────────────────┼──┼──┼──┼──┼──┼──┼──┼──┼───────┤
          │                      │  │  │  │  │  │  │  │  │       │
          │                      │  │  │  │  │  │  │  │  │       │
          │    ┌─────────────────┼──┼──┼──┼──┼──┼──┼──┼──┼───────┤
          │    │  BUTTON         │  │  │  │  │  │  │  │  │       │
          │    │  ┌──┐           │  │  │  │  │  │  │  │  │       │
          │    │  │  │───────────┘  │  │  │  │  │  │  │  │       │
          │    │  │  │──────────────┼──┼──┼──┼──┼──┼──┼──┘       │
          │    │  └──┘              │  │  │  │  │  │  │          │
          │    │                    │  │  │  │  │  │  │          │
          │    └────────────────────┼──┼──┼──┼──┼──┼──┼──────────┤
          │                         │  │  │  │  │  │  │          │
          │                         │  │  │  │  │  │  │          │
          │    ┌────────────────────┼──┼──┼──┼──┼──┼──┼──────────┤
          │    │  INMP441           │  │  │  │  │  │  │          │
          │    │  ┌───────────┐     │  │  │  │  │  │  │          │
          │    │  │ VDD ──────│─────┼──┼──┼──┼──┼──┼──┘          │
          │    │  │ GND ──────│─────┼──┼──┼──┼──┼──┘ (to GND)    │
          │    │  │ SD  ──────│─────┼──┼──┼──┼──┘                │
          │    │  │ WS  ──────│─────┼──┼──┼──┘                   │
          │    │  │ SCK ──────│─────┼──┼──┘                      │
          │    │  │ L/R ──────│─────┼──┘ (to GND for LEFT)       │
          │    │  └───────────┘     │                            │
          │    │                    │                            │
          │    └────────────────────┼────────────────────────────┤
          │                         │                            │
          │                         │                            │
          │    ┌────────────────────┼────────────────────────────┤
          │    │  MAX98357A         │                            │
          │    │  ┌───────────┐     │                            │
          │    │  │ VIN ──────│─────┼──────────────── (to 3V3)   │
          │    │  │ GND ──────│─────┼──────────────── (to GND)   │
          │    │  │ DIN ──────│─────┘ (from D5)                  │
          │    │  │ BCLK ─────│─────── (from D3)                 │
          │    │  │ LRC ──────│─────── (from D4)                 │
          │    │  │ GAIN ─────│─────── (float for 12dB)          │
          │    │  │ SD ───────│─────── (float for always on)     │
          │    │  │           │                                  │
          │    │  │ OUT+ ─────│───────┐                          │
          │    │  │ OUT- ─────│─────┐ │                          │
          │    │  └───────────┘     │ │                          │
          │    │                    │ │                          │
          │    └────────────────────┼─┼──────────────────────────┘
          │                         │ │
          │    ┌────────────────────┼─┼──────────────────────────┐
          │    │  BONE CONDUCTOR    │ │                          │
          │    │  ┌───────────┐     │ │                          │
          │    │  │    (+) ───│─────┘ │                          │
          │    │  │    (-) ───│───────┘                          │
          │    │  │  4Ω 3W    │                                  │
          │    │  └───────────┘                                  │
          │    │                                                 │
          │    └─────────────────────────────────────────────────┘
          │
          └───────────────────────────────────────────────────────┘
```

## 4.2 Wire Color Coding (Recommended)

| Wire | Color | Connection |
|------|-------|------------|
| Power 3.3V | RED | VDD pins |
| Ground | BLACK | GND pins |
| I2S Clock | YELLOW | SCK/BCLK |
| I2S WS/LRC | ORANGE | WS/LRC |
| I2S Data | GREEN | SD/DIN |
| Speaker + | WHITE | Bone + |
| Speaker - | BROWN | Bone - |
| Battery + | RED (thick) | LiPo + |
| Battery - | BLACK (thick) | LiPo - |

---

# 5. COMPLETE FIRMWARE CODE

## 5.1 Main Firmware (zoe_ear_link.ino)

```cpp
// ═══════════════════════════════════════════════════════════════════════════
// ZOE EAR-LINK FIRMWARE v1.0
// ESP32-S3 WebSocket Audio Streaming to Zoe Infinity Platform
// 
// Hardware: Seeed XIAO ESP32-S3 + INMP441 + MAX98357A
// Author: Zoe Infinity Team
// License: MIT
// ═══════════════════════════════════════════════════════════════════════════

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <driver/i2s.h>
#include <ArduinoJson.h>
#include "base64.h"

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION - EDIT THESE VALUES
// ═══════════════════════════════════════════════════════════════════════════

// WiFi Credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// Zoe Infinity WebSocket Endpoint
const char* ZOE_WS_HOST = "gpxuuydvlnuajqkroobp.supabase.co";
const uint16_t ZOE_WS_PORT = 443;
const char* ZOE_WS_PATH = "/functions/v1/realtime-voice";

// ═══════════════════════════════════════════════════════════════════════════
// PIN DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

// I2S Microphone Pins (INMP441)
#define I2S_MIC_WS      D0    // GPIO1 - Word Select
#define I2S_MIC_SCK     D1    // GPIO2 - Serial Clock
#define I2S_MIC_SD      D2    // GPIO3 - Serial Data

// I2S Speaker Pins (MAX98357A)
#define I2S_SPK_BCLK    D3    // GPIO4 - Bit Clock
#define I2S_SPK_LRC     D4    // GPIO5 - Left/Right Clock
#define I2S_SPK_DIN     D5    // GPIO6 - Data In

// Control
#define BUTTON_PIN      D6    // GPIO7 - Push to Talk
#define LED_PIN         LED_BUILTIN

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

#define SAMPLE_RATE         16000   // 16kHz for voice
#define BITS_PER_SAMPLE     16      // 16-bit audio
#define BUFFER_SIZE         512     // Samples per buffer
#define BUFFER_COUNT        4       // DMA buffer count

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL VARIABLES
// ═══════════════════════════════════════════════════════════════════════════

WebSocketsClient webSocket;
bool isConnected = false;
bool isRecording = false;
bool buttonPressed = false;
unsigned long lastButtonPress = 0;
const unsigned long DEBOUNCE_MS = 50;

// Audio buffers
int16_t micBuffer[BUFFER_SIZE];
int16_t spkBuffer[BUFFER_SIZE];

// ═══════════════════════════════════════════════════════════════════════════
// I2S MICROPHONE SETUP
// ═══════════════════════════════════════════════════════════════════════════

void setupMicrophone() {
    Serial.println("[ZoeEarLink] Initializing microphone...");
    
    i2s_config_t i2s_mic_config = {
        .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
        .sample_rate = SAMPLE_RATE,
        .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
        .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
        .communication_format = I2S_COMM_FORMAT_STAND_I2S,
        .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
        .dma_buf_count = BUFFER_COUNT,
        .dma_buf_len = BUFFER_SIZE,
        .use_apll = false,
        .tx_desc_auto_clear = false,
        .fixed_mclk = 0
    };

    i2s_pin_config_t mic_pins = {
        .bck_io_num = I2S_MIC_SCK,
        .ws_io_num = I2S_MIC_WS,
        .data_out_num = I2S_PIN_NO_CHANGE,
        .data_in_num = I2S_MIC_SD
    };

    esp_err_t err = i2s_driver_install(I2S_NUM_0, &i2s_mic_config, 0, NULL);
    if (err != ESP_OK) {
        Serial.printf("[ZoeEarLink] ERROR: Mic driver install failed: %d\n", err);
        return;
    }
    
    err = i2s_set_pin(I2S_NUM_0, &mic_pins);
    if (err != ESP_OK) {
        Serial.printf("[ZoeEarLink] ERROR: Mic pin config failed: %d\n", err);
        return;
    }
    
    Serial.println("[ZoeEarLink] ✓ Microphone initialized");
}

// ═══════════════════════════════════════════════════════════════════════════
// I2S SPEAKER SETUP
// ═══════════════════════════════════════════════════════════════════════════

void setupSpeaker() {
    Serial.println("[ZoeEarLink] Initializing speaker...");
    
    i2s_config_t i2s_spk_config = {
        .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
        .sample_rate = SAMPLE_RATE,
        .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
        .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
        .communication_format = I2S_COMM_FORMAT_STAND_I2S,
        .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
        .dma_buf_count = BUFFER_COUNT,
        .dma_buf_len = BUFFER_SIZE,
        .use_apll = false,
        .tx_desc_auto_clear = true,
        .fixed_mclk = 0
    };

    i2s_pin_config_t spk_pins = {
        .bck_io_num = I2S_SPK_BCLK,
        .ws_io_num = I2S_SPK_LRC,
        .data_out_num = I2S_SPK_DIN,
        .data_in_num = I2S_PIN_NO_CHANGE
    };

    esp_err_t err = i2s_driver_install(I2S_NUM_1, &i2s_spk_config, 0, NULL);
    if (err != ESP_OK) {
        Serial.printf("[ZoeEarLink] ERROR: Speaker driver install failed: %d\n", err);
        return;
    }
    
    err = i2s_set_pin(I2S_NUM_1, &spk_pins);
    if (err != ESP_OK) {
        Serial.printf("[ZoeEarLink] ERROR: Speaker pin config failed: %d\n", err);
        return;
    }
    
    Serial.println("[ZoeEarLink] ✓ Speaker initialized");
}

// ═══════════════════════════════════════════════════════════════════════════
// WEBSOCKET EVENT HANDLER
// ═══════════════════════════════════════════════════════════════════════════

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
    switch(type) {
        case WStype_DISCONNECTED:
            Serial.println("[ZoeEarLink] ✗ WebSocket disconnected");
            isConnected = false;
            digitalWrite(LED_PIN, LOW);
            break;
            
        case WStype_CONNECTED:
            Serial.println("[ZoeEarLink] ✓ Connected to Zoe Infinity!");
            isConnected = true;
            digitalWrite(LED_PIN, HIGH);
            
            // Send session initialization
            StaticJsonDocument<256> initDoc;
            initDoc["type"] = "session.create";
            initDoc["device"] = "ear-link";
            initDoc["version"] = "1.0";
            initDoc["sample_rate"] = SAMPLE_RATE;
            
            String initJson;
            serializeJson(initDoc, initJson);
            webSocket.sendTXT(initJson);
            break;
            
        case WStype_TEXT: {
            Serial.printf("[ZoeEarLink] ◀ Received: %s\n", payload);
            
            StaticJsonDocument<1024> doc;
            DeserializationError error = deserializeJson(doc, payload);
            
            if (error) {
                Serial.printf("[ZoeEarLink] JSON parse error: %s\n", error.c_str());
                return;
            }
            
            const char* msgType = doc["type"];
            
            if (strcmp(msgType, "connection") == 0) {
                Serial.println("[ZoeEarLink] Session established");
            }
            else if (strcmp(msgType, "response.audio_transcript.delta") == 0) {
                const char* text = doc["delta"];
                Serial.printf("[ZoeEarLink] 🎤 Zoe: %s\n", text);
                // Flash LED to indicate response
                blinkLED(2);
            }
            else if (strcmp(msgType, "response.audio_transcript.done") == 0) {
                Serial.println("[ZoeEarLink] Response complete");
            }
            else if (strcmp(msgType, "error") == 0) {
                const char* errorMsg = doc["message"];
                Serial.printf("[ZoeEarLink] ERROR: %s\n", errorMsg);
            }
            break;
        }
            
        case WStype_BIN:
            // Incoming audio data from Zoe - play it
            playAudio(payload, length);
            break;
            
        case WStype_ERROR:
            Serial.println("[ZoeEarLink] WebSocket error occurred");
            break;
            
        case WStype_PING:
            Serial.println("[ZoeEarLink] Ping received");
            break;
            
        case WStype_PONG:
            Serial.println("[ZoeEarLink] Pong received");
            break;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO CAPTURE & STREAMING
// ═══════════════════════════════════════════════════════════════════════════

void captureAndStreamAudio() {
    if (!isConnected || !isRecording) return;
    
    size_t bytesRead = 0;
    
    esp_err_t err = i2s_read(I2S_NUM_0, micBuffer, sizeof(micBuffer), &bytesRead, portMAX_DELAY);
    
    if (err != ESP_OK || bytesRead == 0) return;
    
    // Apply simple gain (optional - adjust as needed)
    for (int i = 0; i < bytesRead / 2; i++) {
        int32_t sample = micBuffer[i];
        sample = sample * 2; // 2x gain
        // Clamp to prevent clipping
        if (sample > 32767) sample = 32767;
        if (sample < -32768) sample = -32768;
        micBuffer[i] = (int16_t)sample;
    }
    
    // Base64 encode the audio data
    String base64Audio = base64::encode((uint8_t*)micBuffer, bytesRead);
    
    // Create JSON message
    StaticJsonDocument<8192> doc;
    doc["type"] = "input_audio_buffer.append";
    doc["audio"] = base64Audio;
    
    String jsonStr;
    serializeJson(doc, jsonStr);
    
    // Send to Zoe
    webSocket.sendTXT(jsonStr);
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO PLAYBACK
// ═══════════════════════════════════════════════════════════════════════════

void playAudio(uint8_t* data, size_t length) {
    size_t bytesWritten = 0;
    esp_err_t err = i2s_write(I2S_NUM_1, data, length, &bytesWritten, portMAX_DELAY);
    
    if (err != ESP_OK) {
        Serial.printf("[ZoeEarLink] Audio playback error: %d\n", err);
    }
}

// Play a simple beep tone
void playBeep(int frequency, int duration_ms) {
    const int samples = (SAMPLE_RATE * duration_ms) / 1000;
    int16_t buffer[256];
    
    for (int i = 0; i < samples; i += 256) {
        int count = min(256, samples - i);
        for (int j = 0; j < count; j++) {
            float t = (float)(i + j) / SAMPLE_RATE;
            buffer[j] = (int16_t)(sin(2.0 * PI * frequency * t) * 16000);
        }
        size_t written;
        i2s_write(I2S_NUM_1, buffer, count * 2, &written, portMAX_DELAY);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// BUTTON HANDLING
// ═══════════════════════════════════════════════════════════════════════════

void handleButton() {
    bool currentState = digitalRead(BUTTON_PIN) == LOW; // Active LOW
    unsigned long now = millis();
    
    // Debounce
    if (now - lastButtonPress < DEBOUNCE_MS) return;
    
    if (currentState && !buttonPressed) {
        // Button just pressed
        buttonPressed = true;
        lastButtonPress = now;
        
        isRecording = true;
        Serial.println("[ZoeEarLink] 🎙️ Recording started");
        playBeep(880, 100); // Short high beep
        
        // Notify server we're starting to speak
        if (isConnected) {
            StaticJsonDocument<128> doc;
            doc["type"] = "input_audio_buffer.start";
            String json;
            serializeJson(doc, json);
            webSocket.sendTXT(json);
        }
    }
    else if (!currentState && buttonPressed) {
        // Button just released
        buttonPressed = false;
        lastButtonPress = now;
        
        isRecording = false;
        Serial.println("[ZoeEarLink] 🎙️ Recording stopped");
        playBeep(440, 100); // Short low beep
        
        // Notify server we're done speaking
        if (isConnected) {
            StaticJsonDocument<128> doc;
            doc["type"] = "input_audio_buffer.commit";
            String json;
            serializeJson(doc, json);
            webSocket.sendTXT(json);
            
            // Request response
            StaticJsonDocument<256> responseDoc;
            responseDoc["type"] = "response.create";
            String responseJson;
            serializeJson(responseDoc, responseJson);
            webSocket.sendTXT(responseJson);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

void blinkLED(int times) {
    for (int i = 0; i < times; i++) {
        digitalWrite(LED_PIN, LOW);
        delay(100);
        digitalWrite(LED_PIN, HIGH);
        delay(100);
    }
}

void printWiFiStatus() {
    Serial.println();
    Serial.println("╔════════════════════════════════════════╗");
    Serial.println("║       ZOE EAR-LINK STATUS              ║");
    Serial.println("╠════════════════════════════════════════╣");
    Serial.printf("║ WiFi SSID: %-28s ║\n", WiFi.SSID().c_str());
    Serial.printf("║ IP Address: %-27s ║\n", WiFi.localIP().toString().c_str());
    Serial.printf("║ Signal: %d dBm                          ║\n", WiFi.RSSI());
    Serial.printf("║ WebSocket: %-28s ║\n", isConnected ? "Connected" : "Disconnected");
    Serial.println("╚════════════════════════════════════════╝");
    Serial.println();
}

// ═══════════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════════

void setup() {
    // Initialize serial
    Serial.begin(115200);
    delay(1000);
    
    Serial.println();
    Serial.println("╔═══════════════════════════════════════════════════════════╗");
    Serial.println("║                   ZOE EAR-LINK v1.0                       ║");
    Serial.println("║              Initializing Hardware...                     ║");
    Serial.println("╚═══════════════════════════════════════════════════════════╝");
    Serial.println();
    
    // Initialize pins
    pinMode(BUTTON_PIN, INPUT_PULLUP);
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);
    
    // Initialize audio hardware
    setupMicrophone();
    setupSpeaker();
    
    // Play startup sound
    playBeep(523, 100); // C
    delay(50);
    playBeep(659, 100); // E
    delay(50);
    playBeep(784, 200); // G
    
    // Connect to WiFi
    Serial.printf("[ZoeEarLink] Connecting to WiFi: %s", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
        blinkLED(1);
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println(" ✓ Connected!");
        printWiFiStatus();
        
        // Success melody
        playBeep(523, 100);
        playBeep(784, 200);
    } else {
        Serial.println(" ✗ Failed!");
        Serial.println("[ZoeEarLink] ERROR: Could not connect to WiFi");
        // Error sound
        playBeep(200, 500);
        return;
    }
    
    // Connect to Zoe Infinity WebSocket
    Serial.println("[ZoeEarLink] Connecting to Zoe Infinity...");
    webSocket.beginSSL(ZOE_WS_HOST, ZOE_WS_PORT, ZOE_WS_PATH);
    webSocket.onEvent(webSocketEvent);
    webSocket.setReconnectInterval(5000);
    webSocket.enableHeartbeat(15000, 3000, 2);
    
    Serial.println();
    Serial.println("╔═══════════════════════════════════════════════════════════╗");
    Serial.println("║                   READY FOR VOICE                         ║");
    Serial.println("║                                                           ║");
    Serial.println("║   Hold button to speak to Zoe                             ║");
    Serial.println("║   Release to send message                                 ║");
    Serial.println("║                                                           ║");
    Serial.println("╚═══════════════════════════════════════════════════════════╝");
    Serial.println();
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════════════════════════

void loop() {
    // Process WebSocket events
    webSocket.loop();
    
    // Handle push-to-talk button
    handleButton();
    
    // Stream audio when recording
    if (isRecording) {
        captureAndStreamAudio();
    }
    
    // Small delay to prevent watchdog issues
    delay(1);
}
```

## 5.2 Base64 Helper Library (base64.h)

Create this file in the same directory as the main sketch:

```cpp
// base64.h - Simple Base64 encoding for Arduino
#ifndef BASE64_H
#define BASE64_H

#include <Arduino.h>

namespace base64 {
    
    static const char* CHARS = 
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    
    String encode(const uint8_t* data, size_t length) {
        String result = "";
        result.reserve((length + 2) / 3 * 4);
        
        for (size_t i = 0; i < length; i += 3) {
            uint32_t n = ((uint32_t)data[i]) << 16;
            
            if (i + 1 < length) {
                n |= ((uint32_t)data[i + 1]) << 8;
            }
            if (i + 2 < length) {
                n |= data[i + 2];
            }
            
            result += CHARS[(n >> 18) & 0x3F];
            result += CHARS[(n >> 12) & 0x3F];
            result += (i + 1 < length) ? CHARS[(n >> 6) & 0x3F] : '=';
            result += (i + 2 < length) ? CHARS[n & 0x3F] : '=';
        }
        
        return result;
    }
    
    size_t decode(const String& input, uint8_t* output, size_t maxLen) {
        size_t len = input.length();
        size_t outLen = 0;
        
        for (size_t i = 0; i < len && outLen < maxLen; i += 4) {
            uint32_t n = 0;
            for (int j = 0; j < 4; j++) {
                char c = input[i + j];
                uint8_t v = 0;
                
                if (c >= 'A' && c <= 'Z') v = c - 'A';
                else if (c >= 'a' && c <= 'z') v = c - 'a' + 26;
                else if (c >= '0' && c <= '9') v = c - '0' + 52;
                else if (c == '+') v = 62;
                else if (c == '/') v = 63;
                else if (c == '=') v = 0;
                
                n = (n << 6) | v;
            }
            
            if (outLen < maxLen) output[outLen++] = (n >> 16) & 0xFF;
            if (outLen < maxLen && input[i + 2] != '=') output[outLen++] = (n >> 8) & 0xFF;
            if (outLen < maxLen && input[i + 3] != '=') output[outLen++] = n & 0xFF;
        }
        
        return outLen;
    }
}

#endif // BASE64_H
```

---

# 6. CLOUD INTEGRATION

## 6.1 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     COMPLETE SYSTEM ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌───────────────────────────────────────────────────────────────────────┐
   │                         ZOE EAR-LINK DEVICE                           │
   │                                                                        │
   │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐   │
   │  │  INMP441    │    │  ESP32-S3   │    │      MAX98357A          │   │
   │  │  Microphone │───▶│  Processor  │───▶│  + Bone Conductor       │   │
   │  │             │    │             │    │                         │   │
   │  │  Capture    │    │  Stream     │    │  Playback               │   │
   │  └─────────────┘    └──────┬──────┘    └─────────────────────────┘   │
   │                            │                                          │
   └────────────────────────────┼──────────────────────────────────────────┘
                                │
                                │ WebSocket (wss://)
                                │ Audio: Base64 encoded PCM 16kHz
                                │
                                ▼
   ┌───────────────────────────────────────────────────────────────────────┐
   │                     LOVABLE CLOUD BACKEND                             │
   │                                                                        │
   │   ┌─────────────────────────────────────────────────────────────┐    │
   │   │                 realtime-voice Edge Function                 │    │
   │   │                                                              │    │
   │   │  1. WebSocket connection handler                             │    │
   │   │  2. Receive Base64 audio chunks                              │    │
   │   │  3. Decode and buffer audio                                  │    │
   │   │  4. Send to Gemini for transcription                         │    │
   │   │  5. Forward text to Zoe Brain                                │    │
   │   │  6. Receive response                                         │    │
   │   │  7. Stream text back to device                               │    │
   │   │                                                              │    │
   │   │  Endpoint: /functions/v1/realtime-voice                      │    │
   │   │                                                              │    │
   │   └──────────────────────────┬───────────────────────────────────┘    │
   │                              │                                         │
   │                              ▼                                         │
   │   ┌─────────────────────────────────────────────────────────────┐    │
   │   │                 zoe-infinity-brain Edge Function             │    │
   │   │                                                              │    │
   │   │  ┌───────────┐  ┌───────────┐  ┌───────────┐               │    │
   │   │  │Soul Codex │  │ Hormones  │  │  Memory   │               │    │
   │   │  │(Persona)  │  │ (Mood)    │  │ (Context) │               │    │
   │   │  └───────────┘  └───────────┘  └───────────┘               │    │
   │   │                                                              │    │
   │   │  • Processes user intent                                     │    │
   │   │  • Applies personality traits                                │    │
   │   │  • Generates contextual response                             │    │
   │   │  • Logs to sovereign memory                                  │    │
   │   │                                                              │    │
   │   └──────────────────────────────────────────────────────────────┘    │
   │                                                                        │
   │   ┌─────────────────────────────────────────────────────────────┐    │
   │   │                      DATABASE LAYER                          │    │
   │   │                                                              │    │
   │   │  • zoe_sovereign_memory - Unified event log                  │    │
   │   │  • dhf_soul_codex - User personality profile                 │    │
   │   │  • zoe_infinity_messages - Chat history                      │    │
   │   │  • ecn_history - Emotional context                           │    │
   │   │                                                              │    │
   │   └──────────────────────────────────────────────────────────────┘    │
   │                                                                        │
   └───────────────────────────────────────────────────────────────────────┘
```

## 6.2 WebSocket Message Protocol

### Client → Server Messages

```json
// Session initialization
{
  "type": "session.create",
  "device": "ear-link",
  "version": "1.0",
  "sample_rate": 16000
}

// Start audio stream
{
  "type": "input_audio_buffer.start"
}

// Audio chunk (sent repeatedly while recording)
{
  "type": "input_audio_buffer.append",
  "audio": "<base64-encoded-pcm-data>"
}

// End audio stream
{
  "type": "input_audio_buffer.commit"
}

// Request AI response
{
  "type": "response.create"
}
```

### Server → Client Messages

```json
// Connection confirmed
{
  "type": "connection",
  "status": "connected",
  "message": "Zoe voice ready"
}

// Transcription result
{
  "type": "transcription",
  "text": "Hello Zoe, how are you?"
}

// AI response (streamed)
{
  "type": "response.audio_transcript.delta",
  "delta": "I'm doing great! "
}

// Response complete
{
  "type": "response.audio_transcript.done"
}

// Error
{
  "type": "error",
  "message": "Processing error occurred"
}
```

## 6.3 Edge Function Code Reference

The server-side WebSocket handler is located at:
```
supabase/functions/realtime-voice/index.ts
```

Key features:
- WebSocket upgrade handling
- Audio transcription via Gemini
- Integration with Zoe Brain
- Session management
- Error handling with fallbacks

---

# 7. 3D PRINTING SPECIFICATIONS

## 7.1 Enclosure Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EAR-LINK ENCLOSURE DESIGN                            │
└─────────────────────────────────────────────────────────────────────────────┘

                            TOP VIEW
                    ┌───────────────────────┐
                    │                       │
                    │   ┌───────────────┐   │
                    │   │   ESP32-S3    │   │
                    │   │   + Battery   │   │
                    │   └───────────────┘   │
                    │                       │
                    │   ┌─────┐   ┌─────┐   │
                    │   │ MIC │   │ BTN │   │
                    │   └─────┘   └─────┘   │
                    │                       │
                    └───────────────────────┘
                              │
                              │ EAR HOOK
                              │
                    ┌─────────┴─────────┐
                   /                     \
                  /                       \
                 /         ┌─────┐         \
                │          │BONE │          │
                │          │COND │          │
                 \         └─────┘         /
                  \                       /
                   \                     /
                    └───────────────────┘
                        TEMPLE CONTACT


                           SIDE VIEW

                    ┌───────────────────┐
                    │  ┌─────────────┐  │──── MIC HOLE
                    │  │             │  │
                    │  │   MAIN      │  │
                    │  │   BODY      │  │
                    │  │             │  │──── USB-C PORT
                    │  └─────────────┘  │
                    │        │          │
                    │        │ HOOK     │
                    │        │          │
                    │   ┌────┴────┐     │
                    │   │  BONE   │     │──── BONE DRIVER
                    │   │  DRIVER │     │
                    │   └─────────┘     │
                    └───────────────────┘
```

## 7.2 Print Settings

| Parameter | Value |
|-----------|-------|
| **Material** | PLA-CF (Carbon Fiber PLA) |
| **Nozzle** | 0.4mm hardened steel |
| **Layer Height** | 0.12mm |
| **Infill** | 20% Gyroid |
| **Walls** | 3 perimeters |
| **Top/Bottom** | 4 layers |
| **Supports** | Tree supports (ear hook only) |
| **Bed Temp** | 60°C |
| **Nozzle Temp** | 220°C |
| **Print Speed** | 50mm/s |
| **Cooling** | 100% after first layer |

## 7.3 Dimensions

```
MAIN BODY:
  Length: 45mm
  Width:  15mm
  Height: 25mm

EAR HOOK:
  Radius: 18mm (adjustable)
  Width:  8mm
  Thickness: 3mm

BONE DRIVER HOUSING:
  Diameter: 20mm
  Depth: 8mm

TOTAL WEIGHT (with components): ~15g
```

## 7.4 Post-Processing

1. **Remove supports** carefully with flush cutters
2. **Sand** any rough surfaces with 400-grit sandpaper
3. **Clean** microphone and USB-C port openings
4. **Optional**: Apply matte clear coat for fingerprint resistance

---

# 8. ASSEMBLY INSTRUCTIONS

## 8.1 Step-by-Step Assembly

### Step 1: Prepare Components
```
□ Test all electronic components before assembly
□ Flash firmware to ESP32-S3
□ Verify microphone and speaker work
□ Charge LiPo battery fully
```

### Step 2: Solder Microphone
```
INMP441 → ESP32-S3:
  VDD → 3V3 (red wire)
  GND → GND (black wire)
  WS  → D0  (orange wire)
  SCK → D1  (yellow wire)
  SD  → D2  (green wire)
  L/R → GND (black wire - for LEFT channel)

Wire length: 30mm
Use 28AWG silicone wire
```

### Step 3: Solder Amplifier
```
MAX98357A → ESP32-S3:
  VIN  → 3V3  (red wire)
  GND  → GND  (black wire)
  BCLK → D3   (yellow wire)
  LRC  → D4   (orange wire)
  DIN  → D5   (green wire)
  GAIN → float (no connection)
  SD   → float (no connection)

Wire length: 40mm
```

### Step 4: Solder Speaker
```
MAX98357A → Bone Conductor:
  OUT+ → Bone (+) (white wire)
  OUT- → Bone (-) (brown wire)

Wire length: 50mm
```

### Step 5: Solder Button
```
Push Button → ESP32-S3:
  Pin 1 → D6  (blue wire)
  Pin 2 → GND (black wire)

Internal pullup enabled in firmware
```

### Step 6: Solder Battery
```
LiPo Battery → ESP32-S3:
  (+) → BAT+ (via switch)
  (-) → BAT-

Add slide switch between battery + and BAT+
Use thicker 24AWG wire for battery
```

### Step 7: Final Assembly
```
□ Apply hot glue to secure components
□ Route wires to avoid pinching
□ Install in 3D printed case
□ Test all functions before sealing
□ Attach silicone ear cushions
```

## 8.2 Assembly Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ASSEMBLY CROSS-SECTION                             │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────┐
                    │          TOP SHELL              │
                    │  ┌──────┐                       │
                    │  │ MIC  │◄──── Microphone hole  │
                    │  └──────┘                       │
                    ├─────────────────────────────────┤
                    │                                 │
                    │  ┌─────────────────────────┐   │
                    │  │      ESP32-S3           │   │
                    │  │  ┌───────────────────┐  │   │
                    │  │  │                   │  │   │
                    │  │  └───────────────────┘  │   │
                    │  │         USB-C ──────────┼───┼───◄ Charging port
                    │  └─────────────────────────┘   │
                    │                                 │
                    │  ┌─────────────────────────┐   │
                    │  │      LiPo Battery       │   │
                    │  │      250mAh             │   │
                    │  └─────────────────────────┘   │
                    │                                 │
                    │  ┌──────┐  ┌──────┐            │
                    │  │ AMP  │  │ BTN  │◄─── Button │
                    │  └──────┘  └──────┘            │
                    │                                 │
                    ├─────────────────────────────────┤
                    │         BOTTOM SHELL            │
                    │                                 │
                    │  ──────────────────────────────│◄─── Ear hook
                    │        \                       │
                    │         \  ┌──────────────┐   │
                    │          \ │  BONE COND.  │   │
                    │           \└──────────────┘   │
                    │                                │
                    └────────────────────────────────┘
```

---

# 9. TESTING & DEBUGGING

## 9.1 Pre-Flight Checklist

```
HARDWARE TESTS:
□ Multimeter continuity test all solder joints
□ Verify 3.3V on power rails
□ Check battery voltage (3.7-4.2V)
□ USB-C charging works
□ Button clicks register

FIRMWARE TESTS:
□ Serial output shows boot messages
□ WiFi connects successfully
□ WebSocket connects to server
□ Microphone captures audio (monitor serial)
□ Speaker plays test tones
□ Button toggles recording

INTEGRATION TESTS:
□ Voice captured and sent to server
□ Server response received
□ Audio plays through bone conductor
□ Full conversation loop works
```

## 9.2 Serial Monitor Debug Codes

| Prefix | Module | Description |
|--------|--------|-------------|
| `[ZoeEarLink]` | Main | General system messages |
| `[ZoeEarLink] ✓` | Main | Success messages |
| `[ZoeEarLink] ✗` | Main | Error messages |
| `[ZoeEarLink] 🎙️` | Audio | Recording status |
| `[ZoeEarLink] 🎤` | Voice | Zoe's response |
| `[ZoeEarLink] ◀` | WebSocket | Received message |
| `[ZoeEarLink] ▶` | WebSocket | Sent message |

## 9.3 Common Debug Commands

Open Arduino Serial Monitor at 115200 baud:

```
// Firmware will print:
[ZoeEarLink] ═══ INITIALIZING ═══
[ZoeEarLink] ✓ Microphone initialized
[ZoeEarLink] ✓ Speaker initialized
[ZoeEarLink] Connecting to WiFi: YourNetwork... ✓ Connected!
[ZoeEarLink] Connecting to Zoe Infinity...
[ZoeEarLink] ✓ Connected to Zoe Infinity!

// When you press the button:
[ZoeEarLink] 🎙️ Recording started
[ZoeEarLink] 🎙️ Recording stopped
[ZoeEarLink] ◀ Received: {"type":"response.audio_transcript.delta","delta":"Hello!"}
[ZoeEarLink] 🎤 Zoe: Hello!
```

## 9.4 Server-Side Debugging

Check Edge Function logs at:
```
Lovable Cloud → Edge Functions → realtime-voice → Logs
```

Look for log prefixes:
```
[RealtimeVoice] ═══ REQUEST ═══     - New connection
[RealtimeVoice] Client connected    - WebSocket opened
[RealtimeVoice] Message:            - Received message type
[RealtimeVoice] Response:           - AI response generated
[RealtimeVoice] Client disconnected - WebSocket closed
```

---

# 10. TROUBLESHOOTING GUIDE

## 10.1 Common Issues

### WiFi Won't Connect
```
SYMPTOMS:
- Serial shows "Connecting to WiFi..." then fails
- LED never lights up

SOLUTIONS:
1. Verify SSID and password are correct (case-sensitive!)
2. Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
3. Move closer to router
4. Try mobile hotspot for testing
5. Check if router has MAC filtering
```

### WebSocket Disconnects
```
SYMPTOMS:
- Connects briefly then drops
- "WebSocket disconnected" in serial

SOLUTIONS:
1. Check internet connectivity
2. Verify server endpoint URL is correct
3. Look for errors in Edge Function logs
4. Reduce distance from WiFi router
5. Check if firewall blocks WebSocket
```

### No Audio Capture
```
SYMPTOMS:
- Button press works but no audio sent
- Serial shows 0 bytes read

SOLUTIONS:
1. Check INMP441 wiring (especially L/R to GND)
2. Verify 3.3V power to microphone
3. Check I2S pin assignments match code
4. Try blowing on mic to see activity
5. Check for cold solder joints
```

### No Audio Playback
```
SYMPTOMS:
- Zoe responds but no sound
- No beeps on button press

SOLUTIONS:
1. Check MAX98357A wiring
2. Verify bone conductor polarity
3. Check speaker wire connections
4. Increase gain (connect GAIN to VIN for 15dB)
5. Test speaker directly with multimeter tone
```

### Button Not Working
```
SYMPTOMS:
- No response when pressing button
- Recording never starts

SOLUTIONS:
1. Check button wiring (D6 to button, button to GND)
2. Verify INPUT_PULLUP in code
3. Test button with multimeter
4. Check for debounce issues (increase DEBOUNCE_MS)
5. Try different GPIO pin
```

## 10.2 Error Codes

| LED Pattern | Meaning |
|-------------|---------|
| Solid ON | Connected to Zoe |
| Solid OFF | Not connected |
| Slow blink | Connecting to WiFi |
| Fast blink | Receiving response |
| 3 quick blinks | Error occurred |

## 10.3 Factory Reset

If firmware becomes unresponsive:

1. Hold BOOT button while plugging in USB
2. Release BOOT when connected
3. ESP32 enters bootloader mode
4. Flash firmware again using Arduino IDE
5. Reconfigure WiFi credentials

---

# APPENDIX A: QUICK REFERENCE CARD

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    ZOE EAR-LINK QUICK REFERENCE                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  PIN MAPPING:                                                             ║
║  ┌────────┬─────────┬────────────────────────────────────────────┐       ║
║  │ D0     │ MIC WS  │ INMP441 Word Select                        │       ║
║  │ D1     │ MIC SCK │ INMP441 Serial Clock                       │       ║
║  │ D2     │ MIC SD  │ INMP441 Serial Data                        │       ║
║  │ D3     │ SPK BCLK│ MAX98357A Bit Clock                        │       ║
║  │ D4     │ SPK LRC │ MAX98357A L/R Clock                        │       ║
║  │ D5     │ SPK DIN │ MAX98357A Data In                          │       ║
║  │ D6     │ BUTTON  │ Push-to-Talk (to GND)                      │       ║
║  │ 3V3    │ POWER   │ Mic VDD, Amp VIN                           │       ║
║  │ GND    │ GROUND  │ All GND connections                        │       ║
║  │ BAT+/- │ BATTERY │ LiPo 3.7V via switch                       │       ║
║  └────────┴─────────┴────────────────────────────────────────────┘       ║
║                                                                           ║
║  AUDIO CONFIG:                                                            ║
║  • Sample Rate: 16000 Hz                                                  ║
║  • Bit Depth: 16-bit                                                      ║
║  • Channels: Mono (Left)                                                  ║
║  • Format: I2S Standard                                                   ║
║                                                                           ║
║  WEBSOCKET:                                                               ║
║  • Host: gpxuuydvlnuajqkroobp.supabase.co                                ║
║  • Port: 443 (SSL)                                                        ║
║  • Path: /functions/v1/realtime-voice                                     ║
║                                                                           ║
║  OPERATION:                                                               ║
║  1. Power on (slide switch)                                               ║
║  2. Wait for connection (LED solid)                                       ║
║  3. Hold button to speak                                                  ║
║  4. Release button to send                                                ║
║  5. Listen for Zoe's response                                             ║
║                                                                           ║
║  CHARGING:                                                                ║
║  • USB-C port on ESP32-S3                                                 ║
║  • Built-in LiPo charger                                                  ║
║  • Charge time: ~1 hour                                                   ║
║  • Runtime: 2-3 hours                                                     ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

# APPENDIX B: REVISION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial release |

---

**Document End**

*For support, visit the Zoe Infinity platform or check Edge Function logs for debugging.*
