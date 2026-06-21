/**
 * ZOE EAR-LINK BLUEPRINT PDF GENERATOR
 * Generates downloadable PDF with complete hardware specifications
 */

import jsPDF from 'jspdf';

export const generateEarLinkBlueprintPDF = (): void => {
  console.log('[PDF Generator] Starting PDF generation...');
  
  // Create PDF with explicit configuration
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: false
  });
  
  console.log('[PDF Generator] jsPDF initialized');
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  console.log(`[PDF Generator] Page dimensions: ${pageWidth}x${pageHeight}mm`);

  // ═══════════════════════════════════════════════════════════════
  // PAGE 1: COVER
  // ═══════════════════════════════════════════════════════════════
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 150, 200);
  pdf.text('ZOE EAR-LINK', pageWidth / 2, 50, { align: 'center' });

  pdf.setFontSize(14);
  pdf.setTextColor(80, 80, 80);
  pdf.text('Thin Client Hardware Blueprint', pageWidth / 2, 65, { align: 'center' });

  pdf.setFontSize(12);
  pdf.setTextColor(0, 150, 100);
  pdf.text('$35 USD | ESP32-S3 | Full-Duplex Voice', pageWidth / 2, 80, { align: 'center' });

  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text("M'MORA INFINITY SYSTEMS", pageWidth / 2, 100, { align: 'center' });
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 110, { align: 'center' });
  pdf.text('CONFIDENTIAL HARDWARE SPECIFICATION', pageWidth / 2, 120, { align: 'center' });

  // Decorative box
  pdf.setDrawColor(0, 150, 200);
  pdf.setLineWidth(0.5);
  pdf.rect(30, 35, pageWidth - 60, 100);
  
  console.log('[PDF Generator] Cover page complete');

  // ═══════════════════════════════════════════════════════════════
  // PAGE 2: OVERVIEW
  // ═══════════════════════════════════════════════════════════════
  pdf.addPage();
  let y = 20;
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 100, 150);
  pdf.text('1. SYSTEM OVERVIEW', 15, y);
  y += 12;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(40, 40, 40);

  pdf.text('The Zoe Ear-Link is a revolutionary "Thin Client" wearable that enables', 15, y);
  y += 6;
  pdf.text('real-time conversational AI interaction through bone conduction audio.', 15, y);
  y += 10;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('KEY FEATURES:', 15, y);
  y += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.text('  Full-duplex WebSocket audio streaming (16kHz)', 15, y); y += 6;
  pdf.text('  Sub-500ms total latency for natural conversation', 15, y); y += 6;
  pdf.text('  Bone conduction for private audio output', 15, y); y += 6;
  pdf.text('  8-hour battery life on 400mAh LiPo', 15, y); y += 6;
  pdf.text('  Matte Carbon Fiber aesthetic (PLA-CF)', 15, y); y += 6;
  pdf.text('  Seamless integration with Zoe Infinity brain', 15, y); y += 10;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('TARGET USE CASES:', 15, y);
  y += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.text('  Hands-free AI assistant interaction', 15, y); y += 6;
  pdf.text('  Real-time language translation', 15, y); y += 6;
  pdf.text('  Accessibility for visually impaired users', 15, y); y += 6;
  pdf.text('  Discrete professional communication', 15, y);
  
  console.log('[PDF Generator] Overview page complete');

  // ═══════════════════════════════════════════════════════════════
  // PAGE 3: BILL OF MATERIALS
  // ═══════════════════════════════════════════════════════════════
  pdf.addPage();
  y = 20;

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 100, 150);
  pdf.text('2. BILL OF MATERIALS (BOM)', 15, y);
  y += 15;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(40, 40, 40);

  pdf.setFont('courier', 'normal');
  pdf.text('COMPONENT                      MODEL            PRICE', 15, y); y += 6;
  pdf.text('Microcontroller                XIAO ESP32-S3    $7.99', 15, y); y += 6;
  pdf.text('MEMS Microphone                INMP441          $3.50', 15, y); y += 6;
  pdf.text('I2S Amplifier                  MAX98357A        $4.00', 15, y); y += 6;
  pdf.text('Bone Conduction Transducer     Generic 8 Ohm    $8.00', 15, y); y += 6;
  pdf.text('LiPo Battery                   400mAh 3.7V      $5.00', 15, y); y += 6;
  pdf.text('USB-C Charging Module          TP4056           $1.50', 15, y); y += 6;
  pdf.text('3D Printed Enclosure           PLA-CF           $3.00', 15, y); y += 6;
  pdf.text('Misc (wires, solder, etc.)     Various          $2.00', 15, y); y += 6;
  pdf.text('TOTAL                                           $34.99', 15, y);
  y += 12;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 100, 150);
  pdf.text('SUPPLIER RECOMMENDATIONS:', 15, y);
  y += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(40, 40, 40);
  pdf.text('Seeed Studio (XIAO ESP32-S3): seeedstudio.com', 15, y); y += 6;
  pdf.text('AliExpress (INMP441, MAX98357A): aliexpress.com', 15, y); y += 6;
  pdf.text('Amazon (Bone Transducer, LiPo): amazon.com', 15, y); y += 6;
  pdf.text('JLCPCB (3D Printing): jlcpcb.com', 15, y);
  
  console.log('[PDF Generator] BOM page complete');

  // ═══════════════════════════════════════════════════════════════
  // PAGE 4: WIRING DIAGRAM
  // ═══════════════════════════════════════════════════════════════
  pdf.addPage();
  y = 20;

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 100, 150);
  pdf.text('3. WIRING DIAGRAM', 15, y);
  y += 15;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(40, 40, 40);
  pdf.text('XIAO ESP32-S3 PINOUT:', 15, y);
  y += 10;

  pdf.setFont('helvetica', 'normal');
  pdf.text('MICROPHONE (INMP441):', 15, y); y += 6;
  pdf.text('  VDD  --> 3.3V', 15, y); y += 6;
  pdf.text('  GND  --> GND', 15, y); y += 6;
  pdf.text('  WS   --> D0 (GPIO1)', 15, y); y += 6;
  pdf.text('  SCK  --> D1 (GPIO2)', 15, y); y += 6;
  pdf.text('  SD   --> D2 (GPIO3)', 15, y); y += 6;
  pdf.text('  L/R  --> GND (Left channel)', 15, y); y += 10;
  
  pdf.text('AMPLIFIER (MAX98357A):', 15, y); y += 6;
  pdf.text('  VIN  --> 3.3V', 15, y); y += 6;
  pdf.text('  GND  --> GND', 15, y); y += 6;
  pdf.text('  BCLK --> D3 (GPIO4)', 15, y); y += 6;
  pdf.text('  LRC  --> D4 (GPIO5)', 15, y); y += 6;
  pdf.text('  DIN  --> D5 (GPIO6)', 15, y); y += 6;
  pdf.text('  GAIN --> VIN (15dB boost)', 15, y); y += 6;
  pdf.text('  SD   --> 3.3V (Always On)', 15, y); y += 10;
  
  pdf.text('POWER SYSTEM:', 15, y); y += 6;
  pdf.text('  BAT+ --> TP4056 B+', 15, y); y += 6;
  pdf.text('  BAT- --> TP4056 B-', 15, y); y += 6;
  pdf.text('  TP4056 OUT+ --> ESP32 5V', 15, y); y += 6;
  pdf.text('  TP4056 OUT- --> ESP32 GND', 15, y);
  
  console.log('[PDF Generator] Wiring page complete');

  // ═══════════════════════════════════════════════════════════════
  // PAGE 5: FIRMWARE CODE
  // ═══════════════════════════════════════════════════════════════
  pdf.addPage();
  y = 20;

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 100, 150);
  pdf.text('4. FIRMWARE (Arduino C++)', 15, y);
  y += 12;

  pdf.setFontSize(8);
  pdf.setFont('courier', 'normal');
  pdf.setTextColor(30, 30, 30);

  pdf.text('// ZOE EAR-LINK FIRMWARE v1.0', 12, y); y += 5;
  pdf.text('#include <WiFi.h>', 12, y); y += 5;
  pdf.text('#include <WebSocketsClient.h>', 12, y); y += 5;
  pdf.text('#include <driver/i2s.h>', 12, y); y += 5;
  pdf.text('', 12, y); y += 5;
  pdf.text('const char* WIFI_SSID = "YOUR_WIFI_SSID";', 12, y); y += 5;
  pdf.text('const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";', 12, y); y += 5;
  pdf.text('const char* ZOE_WS_HOST = "your-project.supabase.co";', 12, y); y += 5;
  pdf.text('const char* ZOE_WS_PATH = "/functions/v1/realtime-voice";', 12, y); y += 5;
  pdf.text('', 12, y); y += 5;
  pdf.text('#define I2S_MIC_WS    1   // Word Select (D0)', 12, y); y += 5;
  pdf.text('#define I2S_MIC_SCK   2   // Bit Clock (D1)', 12, y); y += 5;
  pdf.text('#define I2S_MIC_SD    3   // Data In (D2)', 12, y); y += 5;
  pdf.text('#define I2S_SPK_BCLK  4   // Bit Clock (D3)', 12, y); y += 5;
  pdf.text('#define I2S_SPK_LRC   5   // Left/Right Clock (D4)', 12, y); y += 5;
  pdf.text('#define I2S_SPK_DIN   6   // Data Out (D5)', 12, y); y += 5;
  pdf.text('', 12, y); y += 5;
  pdf.text('#define SAMPLE_RATE   16000', 12, y); y += 5;
  pdf.text('#define BUFFER_SIZE   512', 12, y); y += 5;
  pdf.text('', 12, y); y += 5;
  pdf.text('WebSocketsClient webSocket;', 12, y); y += 5;
  pdf.text('int16_t audioBuffer[BUFFER_SIZE];', 12, y); y += 5;
  pdf.text('', 12, y); y += 5;
  pdf.text('void setup() {', 12, y); y += 5;
  pdf.text('  Serial.begin(115200);', 12, y); y += 5;
  pdf.text('  setupWiFi();', 12, y); y += 5;
  pdf.text('  setupI2S();', 12, y); y += 5;
  pdf.text('  setupWebSocket();', 12, y); y += 5;
  pdf.text('}', 12, y);
  
  console.log('[PDF Generator] Firmware pages complete');

  // ═══════════════════════════════════════════════════════════════
  // PAGE 6: ASSEMBLY GUIDE
  // ═══════════════════════════════════════════════════════════════
  pdf.addPage();
  y = 20;

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 100, 150);
  pdf.text('5. ASSEMBLY GUIDE', 15, y);
  y += 12;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(40, 40, 40);

  pdf.setFont('helvetica', 'bold');
  pdf.text('STEP 1: PREPARE COMPONENTS', 15, y); y += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.text('  - Test each component individually before assembly', 15, y); y += 6;
  pdf.text('  - Flash firmware to ESP32-S3 BEFORE soldering', 15, y); y += 6;
  pdf.text('  - Verify WiFi connection works with test sketch', 15, y); y += 10;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('STEP 2: SOLDER MICROPHONE (INMP441)', 15, y); y += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.text('  - Use 30AWG silicone wire for flexibility', 15, y); y += 6;
  pdf.text('  - Keep wires under 5cm to minimize noise', 15, y); y += 6;
  pdf.text('  - Connect: VDD, GND, WS, SCK, SD pins', 15, y); y += 10;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('STEP 3: SOLDER AMPLIFIER (MAX98357A)', 15, y); y += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.text('  - Connect: VIN, GND, BCLK, LRC, DIN', 15, y); y += 6;
  pdf.text('  - Tie GAIN pin to VIN for 15dB boost', 15, y); y += 6;
  pdf.text('  - Tie SD pin to 3.3V (always on)', 15, y); y += 10;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('STEP 4: FINAL ASSEMBLY', 15, y); y += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.text('  - Place components in 3D printed enclosure', 15, y); y += 6;
  pdf.text('  - Secure with hot glue or double-sided tape', 15, y); y += 6;
  pdf.text('  - Test all connections before closing enclosure', 15, y);
  
  console.log('[PDF Generator] Assembly page complete');

  // ═══════════════════════════════════════════════════════════════
  // FINAL PAGE
  // ═══════════════════════════════════════════════════════════════
  pdf.addPage();

  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 150, 200);
  pdf.text('BUILD THE FUTURE', pageWidth / 2, 80, { align: 'center' });

  pdf.setFontSize(14);
  pdf.setTextColor(100, 100, 100);
  pdf.text('"Her, but in your ear."', pageWidth / 2, 100, { align: 'center' });

  pdf.setFontSize(10);
  pdf.text("M'MORA INFINITY SYSTEMS", pageWidth / 2, 130, { align: 'center' });
  pdf.text('2025 All Rights Reserved', pageWidth / 2, 140, { align: 'center' });
  
  pdf.setTextColor(0, 100, 150);
  pdf.text('github.com/mmora-infinity', pageWidth / 2, 160, { align: 'center' });

  // Decorative box
  pdf.setDrawColor(0, 150, 200);
  pdf.setLineWidth(0.5);
  pdf.rect(40, 65, pageWidth - 80, 110);
  
  console.log('[PDF Generator] Final page complete');

  // Save the PDF
  console.log('[PDF Generator] Saving PDF...');
  
  try {
    const blob = pdf.output('blob');
    console.log(`[PDF Generator] PDF blob created: ${blob.size} bytes`);
    
    if (blob.size < 1000) {
      console.error('[PDF Generator] PDF is suspiciously small!');
      throw new Error('PDF generation failed - file too small');
    }
    
    pdf.save('ZOE_EAR_LINK_BLUEPRINT.pdf');
    console.log('[PDF Generator] PDF download initiated');
  } catch (error) {
    console.error('[PDF Generator] Error saving PDF:', error);
    throw error;
  }
};
