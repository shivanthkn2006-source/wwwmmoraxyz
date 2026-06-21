// ═══════════════════════════════════════════════════════════════════════════════
// VR OMEGA WORLD - COMPLETE USER MANUAL PDF GENERATOR
// Comprehensive guide: Controls, Voice Commands, F1 Circuit, Navigation, etc.
// ═══════════════════════════════════════════════════════════════════════════════

import { jsPDF } from 'jspdf';
import { VR_ACTION_ALIASES, VR_HANDLED_ACTIONS } from '@/constants/vrVoiceActionCoverage';

export const generateVRUserManual = (): void => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  let y = 20;

  const newPage = () => { doc.addPage(); y = 20; };
  const checkPage = (need = 14) => { if (y > 270 - need) newPage(); };

  const sanitizeText = (value: string) => value.replace(/[^\x20-\x7E\n\t]/g, '');

  const title = (t: string, sz = 20) => {
    doc.setFontSize(sz); doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(t), pw / 2, y, { align: 'center' }); y += sz * 0.6;
  };
  const section = (t: string) => {
    checkPage(20);
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 180, 180); doc.text(sanitizeText(t), 15, y); y += 7;
    doc.setDrawColor(0, 180, 180); doc.line(15, y, pw - 15, y); y += 5;
    doc.setTextColor(0, 0, 0);
  };
  const sub = (t: string) => {
    checkPage(12);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80); doc.text(sanitizeText(t), 18, y); y += 6;
    doc.setTextColor(0, 0, 0);
  };
  const txt = (t: string, indent = 15) => {
    checkPage();
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(sanitizeText(t), pw - 30);
    doc.text(lines, indent, y); y += lines.length * 4.5 + 2;
  };
  const bullet = (t: string) => txt(`• ${sanitizeText(t)}`, 20);
  const cmdRow = (cmd: string, action: string) => {
    checkPage(8);
    doc.setFontSize(8); doc.setFont('courier', 'normal');
    doc.text(sanitizeText(cmd), 22, y);
    doc.setFont('helvetica', 'normal');
    doc.text(sanitizeText(action), 105, y);
    y += 4.5;
  };

  // ═══════════════════ PAGE 1: COVER ═══════════════════
  y = 60;
  doc.setFillColor(3, 0, 20);
  doc.rect(0, 0, pw, doc.internal.pageSize.getHeight(), 'F');
  doc.setTextColor(0, 220, 220);
  title('VR OMEGA WORLD', 28);
  y += 5;
  doc.setTextColor(200, 200, 200);
  title('Complete User Manual & Controls Guide', 14);
  y += 15;
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(10);
  doc.text('Version 2.0 — M\'Mora Infinity Systems', pw / 2, y, { align: 'center' }); y += 8;
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pw / 2, y, { align: 'center' }); y += 25;

  // Stats summary
  doc.setTextColor(0, 200, 200);
  doc.setFontSize(9);
  const stats = [
    `Voice Commands: ${VR_HANDLED_ACTIONS.size}+`,
    `Aliases: ${Object.keys(VR_ACTION_ALIASES).length}`,
    'Platforms: 12 (4.1" to 95" 16K)',
    'F1 Circuit: 5 cars, 50 crowd, 5 pit garages',
    'City Grid: 250 avatars, 250 vehicles, 12 metro stations',
  ];
  stats.forEach(s => { doc.text(s, pw / 2, y, { align: 'center' }); y += 6; });

  // ═══════════════════ PAGE 2: TABLE OF CONTENTS ═══════════════════
  newPage();
  doc.setTextColor(0, 0, 0);
  section('TABLE OF CONTENTS');
  const toc = [
    '1. Getting Started & Entry Sequence',
    '2. Keyboard Controls (WASD, Jump, Run, Interact)',
    '3. Mouse & Trackpad Controls',
    '4. Touch Controls (Mobile/Tablet/Joystick)',
    '5. Gamepad Support (PS5/Xbox/Quest)',
    '6. Camera & View Presets',
    '7. Voice Commands — Full Registry',
    '8. F1 OMEGA Circuit Guide',
    '9. City Navigation & Metro System',
    '10. Seasons, Weather & Environment',
    '11. Avatar Controls & Interactions',
    '12. Vehicle Controls (Car/Train/F1)',
    '13. Building & World Creation',
    '14. UI Overlays & HUD Guide',
    '15. Troubleshooting & Performance',
  ];
  toc.forEach(t => bullet(t));

  // ═══════════════════ PAGE 3: GETTING STARTED ═══════════════════
  newPage();
  section('1. GETTING STARTED');
  txt('Welcome to ZOE DHF VR OMEGA WORLD — a cinematic 3D metaverse with voice AI, F1 racing, city exploration, and 160+ voice commands.');
  bullet('Navigate to /zoe-omega and click "Enter VR Mode"');
  bullet('The world begins with a cinematic satellite descent sequence');
  bullet('View transitions: Satellite (500m) → Aerial (120m) → Ground (eye level)');
  bullet('Movement unlocks automatically when ground level is reached');
  bullet('Press H for help overlay at any time');
  y += 3;
  sub('Entry Sequence Phases');
  bullet('Phase 1: Sky & atmosphere (instant)');
  bullet('Phase 2: Terrain & landmarks load');
  bullet('Phase 3: City structures appear');
  bullet('Phase 4: Interactive elements, NPCs, vehicles');
  bullet('Phase 5: Post-processing effects (bloom, vignette)');

  // ═══════════════════ PAGE 4: KEYBOARD CONTROLS ═══════════════════
  newPage();
  section('2. KEYBOARD CONTROLS');
  sub('Movement');
  cmdRow('W / Arrow Up', 'Walk forward');
  cmdRow('S / Arrow Down', 'Walk backward');
  cmdRow('A / Arrow Left', 'Strafe left');
  cmdRow('D / Arrow Right', 'Strafe right');
  cmdRow('Space', 'Jump');
  cmdRow('Shift + W', 'Run / Sprint forward');
  cmdRow('Shift + A/D', 'Run strafe left/right');
  y += 3;
  sub('Interaction');
  cmdRow('E', 'Interact with nearest object / Enter vehicle / Open door');
  cmdRow('H', 'Toggle Help / Controls overlay');
  cmdRow('Z', '5X Zoom Lens toggle');
  cmdRow('Escape', 'Close panel / Exit mode');
  y += 3;
  sub('Camera');
  cmdRow('Scroll Up/Down', 'Zoom in / out');
  cmdRow('Mouse Drag', 'Rotate camera / look around');

  // ═══════════════════ PAGE 5: MOUSE & TOUCH ═══════════════════
  newPage();
  section('3. MOUSE & TRACKPAD CONTROLS');
  cmdRow('Left Click + Drag', 'Rotate camera 360°');
  cmdRow('Scroll Wheel', 'Zoom in/out');
  cmdRow('Click Object', 'Select / interact');
  cmdRow('Hover Object', 'Highlight & show label');

  y += 8;
  section('4. TOUCH CONTROLS (MOBILE/TABLET)');
  sub('On-Screen Joysticks');
  bullet('Left Joystick (MOVE): Full 360° analog movement');
  bullet('Right Joystick (LOOK): Camera rotation');
  bullet('These do NOT interfere with other UI elements');
  y += 3;
  sub('Gestures');
  cmdRow('Single Finger Swipe', 'Rotate camera');
  cmdRow('Pinch', 'Zoom in/out');
  cmdRow('Tap Object', 'Select / interact');
  cmdRow('Double Tap', 'Reset camera view');
  cmdRow('Long Press', 'Context action');
  y += 3;
  sub('Touch Control Bar');
  bullet('Collapsible bar on right side with quick actions');
  bullet('360° turn buttons: 45°, 90°, 180° discrete rotations');
  bullet('Jump, Run, Sit buttons available in bar');

  // ═══════════════════ GAMEPAD ═══════════════════
  y += 5;
  section('5. GAMEPAD SUPPORT');
  bullet('PS5 DualSense: Full analog support with deadzone management');
  bullet('Xbox Controller: Standard mapping');
  bullet('Meta Quest: Compatible via browser gamepad API');
  cmdRow('Left Stick', 'Movement (walk/run based on pressure)');
  cmdRow('Right Stick', 'Camera look');
  cmdRow('A / X button', 'Jump');
  cmdRow('B / Circle', 'Interact / Enter vehicle');
  cmdRow('Triggers', 'Run (left) / Brake (right)');

  // ═══════════════════ PAGE 6: CAMERA PRESETS ═══════════════════
  newPage();
  section('6. CAMERA & VIEW PRESETS');
  bullet('Satellite View — Height: 500m, full world overview');
  bullet('Aerial View — Height: 120m, city-level zoom');
  bullet('Ground View — Eye level (1.6m), full interaction');
  bullet('Mountain View — Teleport to Everest range [2500, 0, -2000]');
  bullet('Summit View — Mountain peak vantage point');
  bullet('City Core — Center of the 1-mile city grid');
  bullet('F1 Circuit — Racing circuit at [1100, 0, -500]');
  y += 3;
  sub('Zoom Lens');
  bullet('Press Z or say "Zoe zoom in" for 5X magnification');
  bullet('Useful for scouting from mountain/satellite altitude');

  // ═══════════════════ PAGE 7-8: VOICE COMMANDS ═══════════════════
  newPage();
  section('7. VOICE COMMANDS — FULL REGISTRY');
  txt('Activate voice by clicking the microphone or saying "Hey Zoe". All commands follow the pattern: "Zoe [command]".');
  y += 3;

  const actionCategories: Record<string, string[]> = {
    'Navigation & Teleportation': ['open_vr', 'exit_vr', 'fly_to_location', 'teleport_to', 'navigate_to_kfc', 'navigate_to_mcdonalds', 'navigate_to_starbucks', 'navigate_to_hospital', 'navigate_to_hotel', 'navigate_to_school', 'navigate_to_park', 'navigate_to_stadium', 'navigate_to_f1', 'navigate_to_metro', 'navigate_to_fire_station', 'navigate_to_police', 'navigate_to_tower'],
    'Movement': ['walk_forward', 'run_forward', 'sprint', 'walk_backward', 'walk_left', 'walk_right', 'stop', 'turn_left_45', 'turn_right_45', 'turn_around_180'],
    'Jump & Aerial': ['jump', 'jump_high', 'double_jump', 'fly', 'fly_up', 'fly_down', 'hover', 'glide', 'land'],
    'Vehicle Control': ['drive', 'drive_slow', 'drive_medium', 'drive_fast', 'accelerate', 'brake', 'park', 'spawn_car', 'enter_vehicle', 'exit_vehicle', 'start_engine', 'stop_engine', 'autopilot', 'manual_drive'],
    'F1 Circuit': ['navigate_to_f1', 'enter_f1_car', 'exit_f1_car', 'start_f1_race', 'f1_pit_stop', 'f1_standings', 'f1_lap_time', 'f1_car_status'],
    'Camera & Views': ['look_up', 'look_down', 'look_left', 'look_right', 'look_around', 'zoom_in', 'zoom_out', 'zoom_5x', 'zoom_1x', 'reset_view', 'first_person', 'third_person', 'satellite_view', 'aerial_view', 'mountain_view', 'city_center_view'],
    'Building & Creation': ['build_house', 'build_building', 'build_road', 'build_bridge', 'build_hospital', 'build_school', 'build_shop', 'build_park', 'build_stadium', 'build_city', 'plant_tree', 'create_forest'],
    'Weather & Environment': ['set_day', 'set_night', 'set_dawn', 'set_dusk', 'set_sunny', 'set_rain', 'set_cloudy', 'set_snow', 'set_storm', 'set_fog', 'set_season_winter', 'set_season_spring', 'set_season_summer', 'set_season_autumn', 'sync_real_weather', 'sync_real_time'],
    'Avatar Interactions': ['interact', 'pickup', 'drop', 'sit', 'stand', 'crouch', 'lie_down', 'wave', 'dance', 'interact_avatar'],
    'Doors & Buildings': ['open_door', 'close_door', 'open_car_door', 'close_car_door', 'open_building_door', 'enter_building'],
    'System & UI': ['show_help', 'show_commands', 'show_tutorial', 'fullscreen_toggle', 'open_voice_panel', 'close_voice_panel', 'open_controls_panel', 'close_controls_panel', 'open_wallet', 'close_all_panels', 'minimize_all_panels', 'reset_panel_positions'],
    'OMEGA Special': ['bio_sync', 'restore_integrity', 'show_memories', 'select_engram', 'show_holowall', 'reset_world', 'show_zoe_orb', 'show_bicameral', 'show_timeline'],
  };

  for (const [cat, actions] of Object.entries(actionCategories)) {
    sub(cat);
    actions.forEach(a => {
      const display = a.replace(/_/g, ' ');
      cmdRow(`"Zoe ${display}"`, a);
    });
    y += 2;
  }

  // Aliases
  checkPage(20);
  sub('Voice Aliases (Natural Language Shortcuts)');
  txt('These phrases are automatically mapped to internal actions:');
  const aliasEntries = Object.entries(VR_ACTION_ALIASES);
  aliasEntries.forEach(([alias, target]) => {
    cmdRow(`"${alias.replace(/_/g, ' ')}"`, `→ ${target}`);
  });

  // ═══════════════════ F1 CIRCUIT ═══════════════════
  newPage();
  section('8. F1 OMEGA CIRCUIT GUIDE');
  txt('The F1 OMEGA Circuit is a high-speed racing environment located near the metro tracks, visible from city center and KFC/restaurant quarter.');
  y += 3;
  sub('Location & Access');
  bullet('Coordinates: [1100, 0, -500]');
  bullet('Voice: "Zoe take me to F1" or "Zoe navigate to F1"');
  bullet('Walk: Head east from city center past the commercial zone');
  bullet('Train: Visible from metro line, exit at nearest station');
  y += 3;
  sub('Circuit Features');
  bullet('5 F1 cars (Team Alpha 🇮🇹, Zenith 🇬🇧, Aurora 🇩🇪, Vortex 🇧🇷, Nova 🇯🇵)');
  bullet('Asymmetric oval track with chicane and hairpin');
  bullet('4 Grandstands: Main, Hairpin View, Pit View, Paddock');
  bullet('5 Pit garages with mechanic avatars');
  bullet('50 crowd avatars with dynamic head-tracking');
  bullet('Start/finish gantry with checkered pattern');
  bullet('Night racing lights');
  y += 3;
  sub('F1 Voice Commands');
  cmdRow('"Zoe take me to F1"', 'Teleport to circuit entrance');
  cmdRow('"Zoe enter F1 car"', 'Get into nearest F1 car');
  cmdRow('"Zoe start race"', 'Begin F1 race (lights out!)');
  cmdRow('"Zoe pit stop"', 'Initiate tire change & refuel');
  cmdRow('"Zoe race standings"', 'Hear P1, P2, P3 positions');
  cmdRow('"Zoe lap time"', 'Get your last lap time');
  cmdRow('"Zoe car status"', 'Tire wear, fuel, engine temp');
  cmdRow('"Zoe exit F1 car"', 'Exit racing car');

  // ═══════════════════ CITY & METRO ═══════════════════
  newPage();
  section('9. CITY NAVIGATION & METRO SYSTEM');
  sub('City Grid (1-mile radius)');
  bullet('250 crowd avatars walking the streets');
  bullet('250 vehicles on road network');
  bullet('Branded zones: KFC, McDonald\'s, Starbucks, fashion boutiques');
  bullet('Specialty: pet shops, laundry, vegetable/fruit markets');
  y += 3;
  sub('Metro System');
  bullet('Dual-track, bi-directional rail system');
  bullet('5 trains operating in opposite directions');
  bullet('12 stations with stairs, escalators, and lifts');
  bullet('Voice: "Zoe take me to metro" to navigate to nearest station');
  y += 3;
  sub('Points of Interest Voice Navigation');
  cmdRow('"Zoe take me to KFC"', 'Navigate to KFC restaurant');
  cmdRow('"Zoe take me to hospital"', 'Navigate to General Hospital');
  cmdRow('"Zoe take me to park"', 'Navigate to city park');
  cmdRow('"Zoe take me to stadium"', 'Navigate to main stadium');
  cmdRow('"Zoe take me to school"', 'Navigate to school');

  // ═══════════════════ SEASONS & WEATHER ═══════════════════
  newPage();
  section('10. SEASONS, WEATHER & ENVIRONMENT');
  sub('Season System');
  bullet('Auto-syncs to real-world season on entry');
  bullet('Winter: Snow terrain, ice castles, -5°C');
  bullet('Spring: Blooming flowers, greenhouses, 15°C');
  bullet('Summer: Bright sun, beach houses, 30°C');
  bullet('Fall: Orange foliage, harvest barns, 12°C');
  y += 3;
  sub('Weather Commands');
  cmdRow('"Zoe set rain"', 'Rain particles');
  cmdRow('"Zoe set snow"', 'Snow particles');
  cmdRow('"Zoe set sunny"', 'Clear skies');
  cmdRow('"Zoe set storm"', 'Thunderstorm');
  cmdRow('"Zoe set fog"', 'Dense fog');
  cmdRow('"Zoe set night"', 'Night mode');
  cmdRow('"Zoe set day"', 'Daytime');
  cmdRow('"Zoe set dawn"', 'Sunrise');
  cmdRow('"Zoe set dusk"', 'Sunset');

  // ═══════════════════ AVATAR & INTERACTIONS ═══════════════════
  section('11. AVATAR CONTROLS & INTERACTIONS');
  cmdRow('"Zoe sit"', 'Avatar sits down');
  cmdRow('"Zoe stand"', 'Avatar stands up');
  cmdRow('"Zoe crouch"', 'Avatar crouches');
  cmdRow('"Zoe wave"', 'Wave at other avatars');
  cmdRow('"Zoe dance"', 'Dance animation');
  cmdRow('"Zoe lie down"', 'Avatar lies down');
  cmdRow('"Zoe pickup"', 'Pick up nearest object');
  cmdRow('"Zoe drop"', 'Drop held object');

  // ═══════════════════ VEHICLE CONTROLS ═══════════════════
  newPage();
  section('12. VEHICLE CONTROLS');
  sub('General Vehicles');
  cmdRow('"Zoe spawn car"', 'Create a vehicle nearby');
  cmdRow('"Zoe enter vehicle"', 'Get into nearest vehicle');
  cmdRow('"Zoe exit vehicle"', 'Leave vehicle');
  cmdRow('"Zoe start engine"', 'Turn on engine');
  cmdRow('"Zoe stop engine"', 'Turn off engine');
  cmdRow('"Zoe drive"', 'Start driving');
  cmdRow('"Zoe drive fast"', 'Increase speed');
  cmdRow('"Zoe brake"', 'Slow down / stop');
  cmdRow('"Zoe park"', 'Park the vehicle');
  cmdRow('"Zoe autopilot"', 'Enable self-driving mode');
  y += 3;
  sub('Door Controls');
  cmdRow('"Zoe open car door"', 'Open car door');
  cmdRow('"Zoe close car door"', 'Close car door');
  cmdRow('"Zoe open door"', 'Open building/train door');
  cmdRow('"Zoe enter building"', 'Walk into nearest building');

  // ═══════════════════ BUILDING & CREATION ═══════════════════
  y += 5;
  section('13. BUILDING & WORLD CREATION');
  cmdRow('"Zoe build house"', 'Construct a residential house');
  cmdRow('"Zoe build hospital"', 'Build a hospital');
  cmdRow('"Zoe build school"', 'Build a school');
  cmdRow('"Zoe build road"', 'Create a road segment');
  cmdRow('"Zoe build bridge"', 'Construct a bridge');
  cmdRow('"Zoe build city"', 'Generate full city block');
  cmdRow('"Zoe plant tree"', 'Plant a single tree');
  cmdRow('"Zoe create forest"', 'Spawn a forest area');
  cmdRow('"Zoe build stadium"', 'Build a large stadium');

  // ═══════════════════ UI & OVERLAYS ═══════════════════
  newPage();
  section('14. UI OVERLAYS & HUD GUIDE');
  sub('Z-Index Hierarchy (Back → Front)');
  bullet('z-10: VR Canvas (3D world)');
  bullet('z-30: BiCameral HUD (Logic|Abstract split-brain)');
  bullet('z-30: Return/Exit Button');
  bullet('z-40: Time Manipulation Bar (Chrono-Echo timeline)');
  bullet('z-40: World State Controller (Dreamscape mood radar)');
  bullet('z-50: Voice/Controls Panels');
  bullet('z-50: Dissonance/Transition Overlays');
  y += 3;
  sub('Panel Commands');
  cmdRow('"Zoe show commands"', 'Open voice commands panel');
  cmdRow('"Zoe show controls"', 'Open controls panel');
  cmdRow('"Zoe open wallet"', 'Open economy wallet');
  cmdRow('"Zoe close all panels"', 'Minimize everything');
  cmdRow('"Zoe fullscreen"', 'Toggle fullscreen mode');

  // ═══════════════════ TROUBLESHOOTING ═══════════════════
  y += 5;
  section('15. TROUBLESHOOTING & PERFORMANCE');
  bullet('White screen on entry: Fog density auto-adjusts. Wait for satellite descent.');
  bullet('Low FPS: Graphics optimizer auto-downgrades quality. Target: 30+ FPS.');
  bullet('No sound: Check browser audio permissions.');
  bullet('Voice not recognized: Click microphone icon, ensure permission granted.');
  bullet('Controls not working: Click inside VR canvas first to focus.');
  bullet('Joystick interfering: Touch controls use data-exclude-phantom-tap isolation.');
  bullet('F1 car not responding: Say "Zoe enter F1 car" while near circuit.');
  bullet('Memory leak: System uses instanced rendering + 800m cull distance.');

  y += 10;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('© 2024-2026 VR OMEGA WORLD — M\'Mora Infinity Systems', pw / 2, y, { align: 'center' });
  y += 5;
  doc.text(`Total Voice Actions: ${VR_HANDLED_ACTIONS.size} | Aliases: ${Object.keys(VR_ACTION_ALIASES).length}`, pw / 2, y, { align: 'center' });

  doc.save('VR_OMEGA_World_Complete_Manual.pdf');
};

export default generateVRUserManual;
