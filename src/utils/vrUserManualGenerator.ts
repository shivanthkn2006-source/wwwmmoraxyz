// ═══════════════════════════════════════════════════════════════════════════════
// VR WORLD USER MANUAL GENERATOR - Downloadable PDF Guide
// Complete controller guide for ZOE DHF VR WORLD
// ═══════════════════════════════════════════════════════════════════════════════

import { jsPDF } from 'jspdf';

export const generateVRUserManual = (): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  const addTitle = (text: string, size: number = 20) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.text(text, pageWidth / 2, y, { align: 'center' });
    y += size * 0.6;
  };

  const addSection = (title: string) => {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 50, 150);
    doc.text(title, 15, y);
    y += 8;
    doc.setTextColor(0, 0, 0);
  };

  const addText = (text: string, indent: number = 15) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, pageWidth - 30);
    doc.text(lines, indent, y);
    y += lines.length * 5 + 3;
  };

  const addBullet = (text: string) => {
    addText(`• ${text}`, 20);
  };

  // Cover Page
  addTitle('ZOE DHF VR WORLD', 24);
  y += 5;
  addTitle('Complete User Manual', 16);
  y += 10;
  doc.setFontSize(12);
  doc.text('Version 1.0 - The Omega Realm Experience', pageWidth / 2, y, { align: 'center' });
  y += 30;

  // Table of Contents
  addSection('TABLE OF CONTENTS');
  addText('1. Getting Started');
  addText('2. Controls - Keyboard, Mouse & Touch');
  addText('3. Seasons System');
  addText('4. Avatar Customization');
  addText('5. Buildings & Vehicles');
  addText('6. Voice Commands');
  addText('7. VR/AR Features');
  addText('8. Troubleshooting');

  doc.addPage();
  y = 20;

  // Section 1: Getting Started
  addSection('1. GETTING STARTED');
  addText('Welcome to ZOE DHF VR WORLD - the Omega Realm Experience. This immersive 3D environment features dynamic seasons, customizable avatars, and Ready Player One-style terrain.');
  y += 5;
  addBullet('Navigate to /zoe-omega to enter the VR world');
  addBullet('Click "Enter VR Mode" to activate the 3D environment');
  addBullet('The world starts with a cinematic satellite entry sequence');

  // Section 2: Controls
  addSection('2. CONTROLS');
  y += 3;
  addText('KEYBOARD CONTROLS:', 15);
  addBullet('W/Arrow Up: Move Forward');
  addBullet('S/Arrow Down: Move Backward');
  addBullet('A/Arrow Left: Strafe Left');
  addBullet('D/Arrow Right: Strafe Right');
  addBullet('E: Interact with objects');
  addBullet('H: Toggle Help/Controls overlay');
  addBullet('Space: Jump (when available)');
  y += 3;
  addText('MOUSE CONTROLS:', 15);
  addBullet('Left Click + Drag: Rotate camera view');
  addBullet('Scroll Wheel: Zoom in/out');
  addBullet('Click on objects: Select/Interact');
  y += 3;
  addText('TOUCH CONTROLS (Mobile/Tablet):', 15);
  addBullet('Single finger swipe: Rotate camera');
  addBullet('Pinch gesture: Zoom in/out');
  addBullet('Tap: Select objects');
  addBullet('Double tap: Reset view');

  doc.addPage();
  y = 20;

  // Section 3: Seasons
  addSection('3. SEASONS SYSTEM');
  addText('The VR world features four dynamic seasons that change the environment:');
  y += 3;
  addText('WINTER:', 15);
  addBullet('Snow-covered terrain and frozen lakes');
  addBullet('Ice castles, igloos, and snow cabins');
  addBullet('Snowmobiles and dog sleds');
  addBullet('Avatars wear warm coats, scarves, and winter hats');
  y += 3;
  addText('SPRING:', 15);
  addBullet('Blooming flowers and green landscapes');
  addBullet('Flower cottages and greenhouses');
  addBullet('Bicycles and garden carts');
  addBullet('Avatars carry umbrellas and wear light jackets');
  y += 3;
  addText('SUMMER:', 15);
  addBullet('Bright sunny skies and lush vegetation');
  addBullet('Beach houses and tiki bars');
  addBullet('Jet skis and sailboats');
  addBullet('Avatars wear sunglasses, sun hats, and shorts');
  y += 3;
  addText('FALL:', 15);
  addBullet('Orange and red foliage with fallen leaves');
  addBullet('Harvest barns and pumpkin patches');
  addBullet('Tractors and hayride wagons');
  addBullet('Avatars wear cozy sweaters and beanies');

  doc.addPage();
  y = 20;

  // Section 4: Avatar
  addSection('4. AVATAR CUSTOMIZATION');
  addText('Your avatar automatically adapts to the current season with appropriate clothing and accessories.');
  addBullet('Skin tone customization');
  addBullet('Hair color and style options');
  addBullet('Season-specific clothing (coats, swimwear, etc.)');
  addBullet('Accessories (glasses, hats, headphones)');

  // Section 5: Buildings & Vehicles
  addSection('5. BUILDINGS & VEHICLES');
  addText('Each season features unique themed structures and transportation:');
  addBullet('Use voice command "build [type]" to construct buildings');
  addBullet('Use voice command "spawn vehicle" to create transport');
  addBullet('Click on vehicles to enter/exit');
  addBullet('Seasonal buildings include landmarks like the Ice Castle');

  // Section 6: Voice Commands
  addSection('6. VOICE COMMANDS');
  addText('Activate voice control by clicking the microphone button:');
  addBullet('"Set winter/spring/summer/fall" - Change season');
  addBullet('"Build city" - Generate a city');
  addBullet('"Spawn car/helicopter" - Create vehicles');
  addBullet('"Enter/Exit vehicle" - Vehicle control');
  addBullet('"Set rain/snow/clear" - Weather control');
  addBullet('"Teleport to [location]" - Fast travel');

  doc.addPage();
  y = 20;

  // Section 7: VR Features
  addSection('7. VR/AR FEATURES');
  addText('For immersive VR headset experience:');
  addBullet('Click "Enter VR" when using a compatible headset');
  addBullet('Look around using head tracking');
  addBullet('Use controllers for interaction');
  addBullet('Cardboard mode available for mobile VR viewers');

  // Section 8: Troubleshooting
  addSection('8. TROUBLESHOOTING');
  addBullet('Black screen: Refresh the page and try again');
  addBullet('Poor performance: Lower graphics quality in settings');
  addBullet('No sound: Check browser permissions and volume');
  addBullet('Controls not working: Click inside the VR window first');
  addBullet('Voice not recognized: Ensure microphone access is granted');

  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('© 2024 ZOE DHF VR WORLD - The Omega Realm', pageWidth / 2, y, { align: 'center' });

  // Save the PDF
  doc.save('ZOE_VR_World_User_Manual.pdf');
};

export default generateVRUserManual;
