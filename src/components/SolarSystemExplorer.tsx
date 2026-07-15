import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ZoomIn, ZoomOut, RotateCcw, HelpCircle, FileText, Save, Download, X, Rocket, Play, Pause, FastForward, Rewind, MapPin, Navigation, Clock, Volume2, Mic, Users, GraduationCap, Baby, FlaskConical, BookOpen, Globe, Sparkles, ChevronDown, ChevronUp, ArrowLeft, Settings, Menu, Eye, History, Radio, Zap, Shield, Star, Orbit, Telescope, Activity, Waves, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { speakAsZoe } from '@/utils/zoeVoice';
import { toast } from 'sonner';
import { useAutoSaveNotes } from '@/hooks/useAutoSaveNotes';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zeroThermalProtocol } from '@/services/ZeroThermalProtocol';

// Dynamic Three.js import
let THREE: typeof import('three') | null = null;

// Narration audience types
type NarrationAudience = 'kids' | 'students' | 'teachers' | 'researchers' | 'academics' | 'phd' | 'scientists' | 'explorers' | 'general';

interface AudienceStyle {
  name: string;
  icon: React.ReactNode;
  tone: string;
  complexity: 'simple' | 'moderate' | 'advanced' | 'expert';
}

const audienceStyles: Record<NarrationAudience, AudienceStyle> = {
  kids: { name: 'Kids Mode', icon: <Baby className="w-4 h-4" />, tone: 'fun and exciting with simple words', complexity: 'simple' },
  students: { name: 'Student Mode', icon: <BookOpen className="w-4 h-4" />, tone: 'educational and engaging', complexity: 'moderate' },
  teachers: { name: 'Teacher Mode', icon: <GraduationCap className="w-4 h-4" />, tone: 'informative with teaching points', complexity: 'moderate' },
  researchers: { name: 'Researcher Mode', icon: <FlaskConical className="w-4 h-4" />, tone: 'detailed with scientific context', complexity: 'advanced' },
  academics: { name: 'Academic Mode', icon: <BookOpen className="w-4 h-4" />, tone: 'scholarly with references', complexity: 'advanced' },
  phd: { name: 'PhD Scholar Mode', icon: <GraduationCap className="w-4 h-4" />, tone: 'expert-level with cutting-edge research', complexity: 'expert' },
  scientists: { name: 'Scientist Mode', icon: <FlaskConical className="w-4 h-4" />, tone: 'technical with precise measurements', complexity: 'expert' },
  explorers: { name: 'Space Explorer Mode', icon: <Rocket className="w-4 h-4" />, tone: 'adventurous like a mission briefing', complexity: 'moderate' },
  general: { name: 'General Mode', icon: <Globe className="w-4 h-4" />, tone: 'balanced and informative', complexity: 'moderate' }
};

// Generate narration based on audience
const generateNarration = (planet: PlanetInfo, audience: NarrationAudience, isStoryMode: boolean): string => {
  const style = audienceStyles[audience];
  
  if (isStoryMode) {
    // Story mode - full narrative journey
    switch (audience) {
      case 'kids':
        return `Wow! Welcome to ${planet.name}! ${planet.funFact} Imagine you're flying in a super cool spaceship right now! ${planet.name} is ${planet.distance} away from the Sun. That's really far! If you drove a car non-stop, it would take forever to get there! What do you think aliens would look like if they lived here?`;
      case 'students':
        return `Welcome to ${planet.name}, an incredible celestial body in our solar system. ${planet.description}. Here's a fascinating fact: ${planet.funFact} At ${planet.distance} from the Sun, with a radius of ${planet.radius}, this planet takes ${planet.orbitalPeriod} to complete one orbit. Consider how these characteristics influence its environment and potential for exploration.`;
      case 'teachers':
        return `Teaching point: ${planet.name}. ${planet.description}. Key learning objective: ${planet.funFact} Discuss with students: How does its distance of ${planet.distance} affect temperature? Why does its ${planet.orbitalPeriod} orbital period matter? Connect to curriculum: compare with Earth's characteristics for contrast.`;
      case 'researchers':
        return `Research briefing: ${planet.name}. ${planet.description}. Current data indicates orbital distance of ${planet.distance}, planetary radius of ${planet.radius}, and orbital period of ${planet.orbitalPeriod}. Notable finding: ${planet.funFact} This data supports ongoing studies in planetary formation and atmospheric dynamics.`;
      case 'academics':
        return `Academic overview of ${planet.name}: ${planet.description}. Per IAU classifications and current astrophysical models, this body presents significant research opportunities. ${planet.funFact} The ${planet.orbitalPeriod} orbital mechanics and ${planet.distance} heliocentric position merit further scholarly investigation.`;
      case 'phd':
        return `Doctoral-level analysis: ${planet.name} represents a critical case study in comparative planetology. ${planet.description}. The ${planet.radius} radius and ${planet.distance} semi-major axis yield specific gravitational and thermal parameters. ${planet.funFact} Consider implications for exoplanetary analog research and atmospheric escape mechanisms.`;
      case 'scientists':
        return `Technical specification: ${planet.name}. Classification parameters: radius ${planet.radius}, orbital distance ${planet.distance}, period ${planet.orbitalPeriod}. ${planet.description}. Observational note: ${planet.funFact} Cross-reference with current JPL ephemeris data for precise positioning calculations.`;
      case 'explorers':
        return `Mission briefing: Target ${planet.name}. ${planet.description}. Current mission parameters: distance from Sol ${planet.distance}, surface conditions variable, orbital period ${planet.orbitalPeriod}. Intel report: ${planet.funFact} Prepare for approach vector calculations and landing site reconnaissance.`;
      default:
        return `Welcome to ${planet.name}! ${planet.description}. ${planet.funFact} Located ${planet.distance} from the Sun with a radius of ${planet.radius}, it completes its orbit in ${planet.orbitalPeriod}. Explore its wonders and discover the mysteries of our cosmic neighborhood.`;
    }
  } else {
    // Quick fact mode
    return `${planet.name}. ${planet.funFact}`;
  }
};

interface PlanetInfo {
  name: string;
  description: string;
  distance: string;
  radius: string;
  orbitalPeriod: string;
  funFact: string;
  landmarks?: { name: string; description: string }[];
  moons?: string[];
}

interface SpaceMission {
  name: string;
  launch: number;
  target: string;
  status: string;
  description: string;
}

const planetData: PlanetInfo[] = [
  { name: 'Sun', description: 'The heart of our solar system, a G-type main-sequence star', distance: '0 AU', radius: '696,000 km', orbitalPeriod: 'N/A', funFact: 'The Sun is so big that 1 million Earths could fit inside it!', landmarks: [{ name: 'Solar Flares', description: 'Massive eruptions of plasma' }, { name: 'Sunspots', description: 'Cooler regions on the surface' }] },
  { name: 'Mercury', description: 'The smallest planet, closest to the Sun with extreme temperatures', distance: '0.39 AU', radius: '2,439 km', orbitalPeriod: '88 days', funFact: 'Mercury has no moons and is covered in craters!', landmarks: [{ name: 'Caloris Basin', description: 'One of the largest impact craters in the solar system' }] },
  { name: 'Venus', description: 'Earth\'s hot twin with thick toxic clouds', distance: '0.72 AU', radius: '6,051 km', orbitalPeriod: '225 days', funFact: 'Venus spins backwards compared to other planets!', landmarks: [{ name: 'Maxwell Montes', description: 'The highest mountain on Venus' }, { name: 'Ishtar Terra', description: 'Highland region the size of Australia' }] },
  { name: 'Earth', description: 'Our home, the blue marble with liquid water', distance: '1.0 AU', radius: '6,371 km', orbitalPeriod: '365.25 days', funFact: 'Earth is the only planet with liquid water on its surface!', moons: ['Moon'], landmarks: [{ name: 'Mount Everest', description: 'Highest point on Earth' }] },
  { name: 'Moon', description: 'Earth\'s only natural satellite, site of human exploration', distance: '384,400 km', radius: '1,737 km', orbitalPeriod: '27.3 days', funFact: 'Astronauts have walked on the Moon 6 times!', landmarks: [{ name: 'Sea of Tranquility', description: 'Apollo 11 landing site' }, { name: 'Tycho Crater', description: 'One of the most prominent craters' }] },
  { name: 'Mars', description: 'The red planet with giant volcanoes and canyons', distance: '1.52 AU', radius: '3,389 km', orbitalPeriod: '687 days', funFact: 'Mars has the tallest mountain in the solar system!', moons: ['Phobos', 'Deimos'], landmarks: [{ name: 'Olympus Mons', description: 'Tallest volcano - 72,000 ft high!' }, { name: 'Valles Marineris', description: 'Canyon system 4,000 km long' }, { name: 'Perseverance Landing Site', description: 'Jezero Crater - searching for ancient life' }] },
  { name: 'Jupiter', description: 'The largest planet, a massive gas giant', distance: '5.2 AU', radius: '69,911 km', orbitalPeriod: '11.86 years', funFact: 'Jupiter\'s Great Red Spot is a storm bigger than Earth!', moons: ['Io', 'Europa', 'Ganymede', 'Callisto'], landmarks: [{ name: 'Great Red Spot', description: 'Storm raging for 400+ years' }, { name: 'Europa Ocean', description: 'Possible alien life under the ice' }] },
  { name: 'Saturn', description: 'Famous for its spectacular ring system', distance: '9.54 AU', radius: '58,232 km', orbitalPeriod: '29.46 years', funFact: 'Saturn could float in a giant bathtub!', moons: ['Titan', 'Enceladus', 'Mimas'], landmarks: [{ name: 'Hexagonal Storm', description: 'Unique 6-sided storm at north pole' }, { name: 'Ring System', description: 'Made of billions of ice particles' }] },
  { name: 'Uranus', description: 'The ice giant that spins on its side', distance: '19.2 AU', radius: '25,362 km', orbitalPeriod: '84 years', funFact: 'Uranus is tilted 98 degrees - it rolls around the Sun!', moons: ['Miranda', 'Ariel', 'Titania'], landmarks: [{ name: 'Tilted Axis', description: '98° tilt causes extreme seasons' }] },
  { name: 'Neptune', description: 'The windiest planet with supersonic storms', distance: '30.1 AU', radius: '24,622 km', orbitalPeriod: '165 years', funFact: 'Neptune has winds faster than sound - over 1,200 mph!', moons: ['Triton'], landmarks: [{ name: 'Great Dark Spot', description: 'Massive storm system' }, { name: 'Triton Geysers', description: 'Nitrogen geysers on its moon' }] },
  { name: 'Pluto', description: 'The beloved dwarf planet at the edge', distance: '39.5 AU', radius: '1,188 km', orbitalPeriod: '248 years', funFact: 'Pluto has a heart-shaped glacier made of nitrogen ice!', moons: ['Charon'], landmarks: [{ name: 'Tombaugh Regio', description: 'Heart-shaped ice plain' }, { name: 'Sputnik Planitia', description: 'Vast nitrogen ice glacier' }] }
];

const spaceMissions: SpaceMission[] = [
  { name: 'Voyager 1', launch: 1977, target: 'Outer Solar System', status: 'Active - Interstellar Space', description: 'Farthest human-made object from Earth' },
  { name: 'Voyager 2', launch: 1977, target: 'Outer Planets', status: 'Active - Interstellar Space', description: 'Only spacecraft to visit all 4 outer planets' },
  { name: 'Perseverance', launch: 2020, target: 'Mars', status: 'Active - Mars Surface', description: 'Searching for ancient microbial life' },
  { name: 'Cassini-Huygens', launch: 1997, target: 'Saturn', status: 'Completed 2017', description: 'Studied Saturn system for 13 years' },
  { name: 'New Horizons', launch: 2006, target: 'Pluto', status: 'Active - Kuiper Belt', description: 'First spacecraft to flyby Pluto' },
  { name: 'Juno', launch: 2011, target: 'Jupiter', status: 'Active - Jupiter Orbit', description: 'Studying Jupiter\'s atmosphere and interior' },
  { name: 'JWST', launch: 2021, target: 'L2 Point', status: 'Active', description: 'Most powerful space telescope ever built' }
];

// Mission Simulations Data
interface MissionSimulation {
  name: string;
  year: number;
  type: 'historic' | 'future';
  description: string;
  keyMoments: string[];
  duration: string;
}

const missionSimulations: MissionSimulation[] = [
  { name: 'Apollo 11 Moon Landing', year: 1969, type: 'historic', description: 'First humans to walk on the Moon', keyMoments: ['Launch from Kennedy Space Center', 'Lunar orbit insertion', 'Eagle descent', '"One small step" moment'], duration: '8 days' },
  { name: 'Mars Curiosity Landing', year: 2012, type: 'historic', description: 'SUV-sized rover lands on Mars using sky crane', keyMoments: ['7 minutes of terror entry', 'Parachute deployment', 'Sky crane descent', 'Touchdown in Gale Crater'], duration: '7 minutes' },
  { name: 'Voyager Grand Tour', year: 1977, type: 'historic', description: 'Epic journey past all outer planets', keyMoments: ['Jupiter flyby', 'Saturn ring observation', 'Uranus encounter', 'Neptune approach', 'Entering interstellar space'], duration: '12+ years' },
  { name: 'Artemis III Moon Return', year: 2025, type: 'future', description: 'First woman and person of color on the Moon', keyMoments: ['SLS launch', 'Orion lunar transfer', 'Starship HLS descent', 'South pole exploration'], duration: '30 days' },
  { name: 'SpaceX Mars Colony', year: 2030, type: 'future', description: 'First human settlement on Mars', keyMoments: ['Starship fleet launch', '6-month transit', 'Aerobraking entry', 'Base establishment'], duration: '2+ years' },
  { name: 'Europa Clipper', year: 2024, type: 'future', description: 'Search for life in Europa\'s ocean', keyMoments: ['Launch window', 'Jupiter arrival', 'Multiple Europa flybys', 'Ice penetrating radar scans'], duration: '4 years to Jupiter' }
];

// Telescope Views Data
interface TelescopeView {
  telescope: string;
  target: string;
  description: string;
  wavelength: string;
  discovery: string;
}

const telescopeViews: TelescopeView[] = [
  { telescope: 'Hubble Space Telescope', target: 'Pillars of Creation', description: 'Star-forming region in Eagle Nebula', wavelength: 'Visible/Infrared', discovery: 'Revealed stellar nurseries in unprecedented detail' },
  { telescope: 'James Webb Space Telescope', target: 'Deep Field', description: 'Earliest galaxies ever observed', wavelength: 'Infrared', discovery: 'Galaxies from 13+ billion years ago' },
  { telescope: 'JWST', target: 'Exoplanet Atmospheres', description: 'Chemical signatures of distant worlds', wavelength: 'Mid-Infrared', discovery: 'Water vapor, CO2 in exoplanet atmospheres' },
  { telescope: 'Hubble', target: 'Jupiter Storm', description: 'Great Red Spot evolution', wavelength: 'Visible', discovery: 'Storm shrinking over decades' },
  { telescope: 'Chandra X-ray', target: 'Black Hole Jets', description: 'High-energy cosmic phenomena', wavelength: 'X-ray', discovery: 'Matter accelerated near light speed' }
];

// Space Exploration History
interface HistoryMilestone {
  year: number;
  event: string;
  significance: string;
  era: 'early' | 'space-race' | 'shuttle' | 'modern' | 'future';
}

const explorationHistory: HistoryMilestone[] = [
  { year: 1957, event: 'Sputnik 1', significance: 'First artificial satellite', era: 'space-race' },
  { year: 1961, event: 'Yuri Gagarin', significance: 'First human in space', era: 'space-race' },
  { year: 1969, event: 'Apollo 11', significance: 'First Moon landing', era: 'space-race' },
  { year: 1971, event: 'Mars 3', significance: 'First Mars soft landing', era: 'space-race' },
  { year: 1981, event: 'Space Shuttle', significance: 'First reusable spacecraft', era: 'shuttle' },
  { year: 1990, event: 'Hubble Launch', significance: 'Revolutionary space telescope', era: 'shuttle' },
  { year: 1998, event: 'ISS Construction', significance: 'International cooperation in orbit', era: 'modern' },
  { year: 2012, event: 'Curiosity Landing', significance: 'Most advanced Mars rover', era: 'modern' },
  { year: 2021, event: 'JWST Launch', significance: 'New era of cosmic observation', era: 'modern' },
  { year: 2024, event: 'Artemis Program', significance: 'Return to Moon begins', era: 'future' }
];

// Physical Phenomena Data
interface CosmicPhenomenon {
  name: string;
  type: 'solar' | 'planetary' | 'cosmic';
  description: string;
  effects: string[];
  dangerLevel: 'low' | 'moderate' | 'high';
}

const cosmicPhenomena: CosmicPhenomenon[] = [
  { name: 'Solar Flare', type: 'solar', description: 'Massive magnetic energy release from Sun', effects: ['Radio blackouts', 'GPS disruption', 'Aurora activity', 'Satellite damage risk'], dangerLevel: 'moderate' },
  { name: 'Coronal Mass Ejection', type: 'solar', description: 'Billion tons of solar plasma ejected', effects: ['Geomagnetic storms', 'Power grid stress', 'Beautiful auroras', 'Radiation exposure'], dangerLevel: 'high' },
  { name: 'Earth\'s Magnetosphere', type: 'planetary', description: 'Protective magnetic bubble around Earth', effects: ['Deflects solar wind', 'Traps charged particles', 'Creates Van Allen belts', 'Enables life'], dangerLevel: 'low' },
  { name: 'Jupiter\'s Radiation Belts', type: 'planetary', description: 'Most intense radiation in solar system', effects: ['Lethal to unshielded electronics', 'Powers Io volcanism', 'Creates powerful radio emissions'], dangerLevel: 'high' },
  { name: 'Saturn\'s Ring Dynamics', type: 'planetary', description: 'Billions of particles in orbital dance', effects: ['Moonlet formation', 'Wave patterns', 'Shepherd moon interactions', 'Slow rain onto Saturn'], dangerLevel: 'low' }
];

// Milky Way Context - Comprehensive Data
const milkyWayFacts = {
  solarSystemLocation: 'Orion Arm (Local Spur), ~27,000 light-years from galactic center',
  orbitalPeriod: '225-250 million years (one galactic year)',
  orbitalSpeed: '828,000 km/h around galactic center',
  localStars: ['Proxima Centauri (4.24 ly)', 'Alpha Centauri A/B (4.37 ly)', 'Barnard\'s Star (5.96 ly)', 'Wolf 359 (7.86 ly)', 'Lalande 21185 (8.29 ly)', 'Sirius A/B (8.6 ly)'],
  neighboringArms: ['Perseus Arm (outer)', 'Sagittarius Arm (inner)', 'Norma Arm', 'Scutum-Centaurus Arm'],
  galacticCore: 'Sagittarius A* - 4.1 million solar mass supermassive black hole',
  galaxyStats: {
    diameter: '100,000-180,000 light-years',
    thickness: '~1,000 light-years (disk), 12,000 ly (bulge)',
    stars: '100-400 billion stars',
    age: '13.6 billion years',
    type: 'Barred Spiral Galaxy (SBbc)',
    mass: '1.5 trillion solar masses (including dark matter)',
    halo: 'Extends 300,000+ light-years'
  },
  localGroup: {
    name: 'Local Group (50+ galaxies)',
    majorMembers: ['Andromeda Galaxy (M31) - 2.5 million ly', 'Triangulum Galaxy (M33) - 2.7 million ly', 'Large Magellanic Cloud - 160,000 ly', 'Small Magellanic Cloud - 200,000 ly'],
    andromedaCollision: '4.5 billion years - Milkomeda formation'
  },
  structures: [
    { name: 'Galactic Disk', description: 'Flat rotating disk containing spiral arms, young stars, gas, and dust' },
    { name: 'Galactic Bulge', description: 'Dense central region with older stars, 10,000 ly across' },
    { name: 'Galactic Halo', description: 'Spherical region of old stars, globular clusters, and dark matter' },
    { name: 'Central Bar', description: '27,000 ly long bar structure at galaxy core' },
    { name: 'Spiral Arms', description: 'Density waves where stars and gas compress, triggering star formation' }
  ],
  interestingObjects: [
    { name: 'Sagittarius A*', type: 'Supermassive Black Hole', distance: '27,000 ly' },
    { name: 'Crab Nebula', type: 'Supernova Remnant', distance: '6,500 ly' },
    { name: 'Orion Nebula', type: 'Stellar Nursery', distance: '1,344 ly' },
    { name: 'Cygnus X-1', type: 'Stellar Black Hole', distance: '6,100 ly' },
    { name: 'Omega Centauri', type: 'Largest Globular Cluster', distance: '15,800 ly' }
  ]
};

// Black Holes in the Milky Way
const blackHolesData = {
  totalEstimate: '400 million stellar black holes',
  knownBlackHoles: [
    { name: 'Sagittarius A*', type: 'Supermassive', mass: '4.1 million solar masses', distance: '27,000 ly', description: 'The supermassive black hole at the center of our galaxy' },
    { name: 'Cygnus X-1', type: 'Stellar', mass: '21 solar masses', distance: '6,100 ly', description: 'First black hole ever discovered, binary system with blue supergiant' },
    { name: 'V616 Monocerotis (A0620-00)', type: 'Stellar', mass: '6.6 solar masses', distance: '3,300 ly', description: 'Closest known black hole to Earth' },
    { name: 'GRS 1915+105', type: 'Stellar', mass: '12.4 solar masses', distance: '36,000 ly', description: 'First galactic source to show superluminal jets' },
    { name: 'Gaia BH1', type: 'Stellar', mass: '10 solar masses', distance: '1,560 ly', description: 'Closest dormant black hole, discovered 2022' },
    { name: 'Gaia BH2', type: 'Stellar', mass: '9 solar masses', distance: '3,800 ly', description: 'Second closest dormant black hole' }
  ],
  formation: 'Stellar black holes form when massive stars (>25 solar masses) collapse at end of life',
  facts: [
    'Black holes don\'t actually "suck" - you can orbit safely at distance',
    'Time slows dramatically near the event horizon',
    'Information paradox: Does info falling in get destroyed?',
    'Hawking radiation: Black holes slowly evaporate over trillions of years',
    'Most black holes are "dormant" - not actively eating matter'
  ]
};

// Meteors and Shooting Stars
const meteorData = {
  description: 'Meteors are space debris burning up in Earth\'s atmosphere at 25,000-160,000 mph',
  showers: [
    { name: 'Perseids', peak: 'August 11-13', rate: '100/hour', parent: 'Comet Swift-Tuttle', description: 'Most popular meteor shower, bright with long trails' },
    { name: 'Geminids', peak: 'December 13-14', rate: '150/hour', parent: 'Asteroid 3200 Phaethon', description: 'Most reliable shower, multicolored meteors' },
    { name: 'Leonids', peak: 'November 17-18', rate: '15-1000/hour', parent: 'Comet Tempel-Tuttle', description: 'Famous for occasional meteor storms' },
    { name: 'Quadrantids', peak: 'January 3-4', rate: '120/hour', parent: 'Asteroid 2003 EH1', description: 'Brief but intense peak, blue meteors' },
    { name: 'Orionids', peak: 'October 21-22', rate: '20/hour', parent: 'Comet Halley', description: 'Fast meteors from famous comet' },
    { name: 'Lyrids', peak: 'April 22-23', rate: '20/hour', parent: 'Comet Thatcher', description: 'One of oldest known showers (2,700 years)' }
  ],
  types: [
    { type: 'Meteor', description: 'Light streak in sky (shooting star)' },
    { type: 'Meteoroid', description: 'Space rock before entering atmosphere' },
    { type: 'Meteorite', description: 'Rock that survives to hit ground' },
    { type: 'Fireball', description: 'Very bright meteor (brighter than Venus)' },
    { type: 'Bolide', description: 'Exploding fireball with sonic boom' }
  ],
  famousImpacts: [
    { name: 'Chicxulub', when: '66 million years ago', size: '10-15 km', effect: 'Dinosaur extinction event' },
    { name: 'Tunguska', when: '1908', size: '50-60 m', effect: 'Flattened 2,000 km² of Siberian forest' },
    { name: 'Chelyabinsk', when: '2013', size: '20 m', effect: 'Injured 1,500 people in Russia' }
  ]
};

// Planet Interior Exploration Data
const planetInteriors = [
  {
    name: 'Mercury',
    layers: [
      { name: 'Iron Core', depth: '0-1,800 km', description: 'Massive iron core, 85% of planet radius', temp: '~1,500°C' },
      { name: 'Silicate Mantle', depth: '1,800-2,400 km', description: 'Thin rocky mantle layer', temp: '~1,200°C' },
      { name: 'Crust', depth: '2,400-2,440 km', description: 'Ancient, heavily cratered surface', temp: '-180°C to 430°C' }
    ],
    uniqueFeature: 'Largest core relative to size - 85% of radius'
  },
  {
    name: 'Venus',
    layers: [
      { name: 'Iron Core', depth: '0-3,200 km', description: 'Liquid iron-nickel core, no magnetic field', temp: '~5,000°C' },
      { name: 'Rocky Mantle', depth: '3,200-5,900 km', description: 'Silicate mantle with possible volcanism', temp: '~3,000°C' },
      { name: 'Crust', depth: '5,900-6,050 km', description: 'Basaltic surface, 1,000+ volcanoes', temp: '465°C' }
    ],
    uniqueFeature: 'Hottest planet surface due to runaway greenhouse effect'
  },
  {
    name: 'Earth',
    layers: [
      { name: 'Inner Core', depth: '0-1,220 km', description: 'Solid iron-nickel ball', temp: '5,400°C' },
      { name: 'Outer Core', depth: '1,220-3,480 km', description: 'Liquid iron generating magnetic field', temp: '4,500°C' },
      { name: 'Mantle', depth: '3,480-6,350 km', description: 'Convecting silicate rock driving tectonics', temp: '1,000-3,700°C' },
      { name: 'Crust', depth: '6,350-6,371 km', description: 'Oceanic (5-10 km) and continental (30-50 km)', temp: '-89°C to 57°C' }
    ],
    uniqueFeature: 'Active plate tectonics and liquid water oceans'
  },
  {
    name: 'Mars',
    layers: [
      { name: 'Core', depth: '0-1,700 km', description: 'Iron-sulfur core, partially liquid', temp: '~1,500°C' },
      { name: 'Mantle', depth: '1,700-3,200 km', description: 'Silicate rock, possibly convecting', temp: '~1,000°C' },
      { name: 'Crust', depth: '3,200-3,390 km', description: 'Iron-rich basalt, no active volcanism', temp: '-125°C to 20°C' }
    ],
    uniqueFeature: 'Largest volcano (Olympus Mons) and deepest canyon (Valles Marineris)'
  },
  {
    name: 'Jupiter',
    layers: [
      { name: 'Core', depth: '0-~20,000 km', description: 'Rocky/icy core, 10-20 Earth masses', temp: '~20,000°C' },
      { name: 'Metallic Hydrogen', depth: '~20,000-58,000 km', description: 'Liquid metallic hydrogen, generates magnetic field', temp: '~10,000°C' },
      { name: 'Molecular Hydrogen', depth: '58,000-69,000 km', description: 'Liquid hydrogen ocean transitioning to gas', temp: '~2,000°C' },
      { name: 'Atmosphere', depth: '69,000-70,000 km', description: 'H2/He gas with colorful cloud bands', temp: '-145°C to -110°C' }
    ],
    uniqueFeature: 'No solid surface - gas transitions to liquid under pressure'
  },
  {
    name: 'Saturn',
    layers: [
      { name: 'Core', depth: '0-~25,000 km', description: 'Dense rocky/icy core', temp: '~11,700°C' },
      { name: 'Metallic Hydrogen', depth: '~25,000-45,000 km', description: 'Conducting hydrogen layer', temp: '~6,000°C' },
      { name: 'Molecular Hydrogen', depth: '45,000-58,000 km', description: 'Liquid hydrogen ocean', temp: '~2,000°C' },
      { name: 'Atmosphere', depth: '58,000-58,232 km', description: 'H2/He with ammonia ice clouds', temp: '-178°C' }
    ],
    uniqueFeature: 'Lowest density planet - would float on water!'
  },
  {
    name: 'Uranus',
    layers: [
      { name: 'Core', depth: '0-~5,000 km', description: 'Small rocky core', temp: '~5,000°C' },
      { name: 'Ice Mantle', depth: '~5,000-21,000 km', description: 'Water, ammonia, methane "ices" under pressure', temp: '~2,000°C' },
      { name: 'Atmosphere', depth: '21,000-25,362 km', description: 'H2/He with methane giving blue color', temp: '-224°C' }
    ],
    uniqueFeature: 'Rotates on its side (98° tilt) - extreme seasons'
  },
  {
    name: 'Neptune',
    layers: [
      { name: 'Core', depth: '0-~7,000 km', description: 'Rocky silicate core', temp: '~7,000°C' },
      { name: 'Ice Mantle', depth: '~7,000-20,000 km', description: 'Hot, dense water-ammonia-methane ocean', temp: '~2,000°C' },
      { name: 'Atmosphere', depth: '20,000-24,622 km', description: 'H2/He with methane, supersonic winds', temp: '-218°C' }
    ],
    uniqueFeature: 'Strongest winds in solar system - 2,100 km/h!'
  }
];

// Soundscape Types
type SoundscapeType = 'solar-wind' | 'planet-atmosphere' | 'spacecraft' | 'cosmic-background' | 'aurora';
const soundscapeDescriptions: Record<SoundscapeType, string> = {
  'solar-wind': 'Sonified solar wind particles streaming past',
  'planet-atmosphere': 'Converted atmospheric data to audio frequencies',
  'spacecraft': 'Actual recordings from space missions',
  'cosmic-background': 'Cosmic microwave background radiation as sound',
  'aurora': 'Electromagnetic waves from auroral activity'
};

// All voice commands Zoe can use
const voiceCommandsHelp = [
  { command: 'show [planet]', description: 'Navigate to any planet (Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto)' },
  { command: 'zoom in / zoom out', description: 'Adjust view distance' },
  { command: 'pause / play', description: 'Control time simulation' },
  { command: 'fast forward / slow down', description: 'Change time speed' },
  { command: 'show missions', description: 'Open mission tracker' },
  { command: 'start tour / full tour', description: 'Begin guided solar system tour' },
  { command: 'story mode', description: 'Enable immersive narration' },
  { command: 'kids mode / student mode / scientist mode', description: 'Change narration style' },
  { command: 'tell me about [planet]', description: 'Get detailed narration' },
  { command: 'show landmarks', description: 'Display planet landmarks' },
  { command: 'notes / save notes', description: 'Access notes panel' },
  { command: 'help / tutorial', description: 'Show help guide' },
  { command: 'reset view', description: 'Return to default position' }
];

// Kid-friendly tutorial with voice commands
const HologramTutorial: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 overflow-auto">
    <Card className="max-w-lg w-full bg-gradient-to-br from-purple-900/90 to-cyan-900/90 border-2 border-cyan-400/50 p-6 rounded-3xl max-h-[90vh] overflow-auto">
      <div className="text-center space-y-5">
        <div className="flex justify-center gap-3 text-4xl">
          <span className="animate-bounce">🚀</span>
          <span className="animate-pulse">🪐</span>
          <span className="animate-bounce delay-100">🌟</span>
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
          3D Hologram Space Tour!
        </h2>
        <div className="space-y-3 text-left text-sm">
          <div className="flex items-center gap-3 p-2 bg-cyan-500/20 rounded-xl">
            <span className="text-2xl">👆</span>
            <div><p className="font-bold text-cyan-300">Click & Drag</p><p className="text-cyan-100/80">Rotate around the solar system!</p></div>
          </div>
          <div className="flex items-center gap-3 p-2 bg-pink-500/20 rounded-xl">
            <span className="text-2xl">🖱️</span>
            <div><p className="font-bold text-pink-300">Scroll Wheel</p><p className="text-pink-100/80">Zoom in close or zoom out far!</p></div>
          </div>
          <div className="flex items-center gap-3 p-2 bg-yellow-500/20 rounded-xl">
            <span className="text-2xl">🪐</span>
            <div><p className="font-bold text-yellow-300">Click Planets</p><p className="text-yellow-100/80">Learn about landmarks & missions!</p></div>
          </div>
          <div className="flex items-center gap-3 p-2 bg-green-500/20 rounded-xl">
            <span className="text-2xl">⏰</span>
            <div><p className="font-bold text-green-300">Time Travel</p><p className="text-green-100/80">See past & future positions!</p></div>
          </div>
          <div className="flex items-center gap-3 p-2 bg-purple-500/20 rounded-xl">
            <span className="text-2xl">🎤</span>
            <div><p className="font-bold text-purple-300">Voice Commands</p><p className="text-purple-100/80">Say "Hey Zoe, show Jupiter" or "start tour"!</p></div>
          </div>
        </div>
        
        {/* Voice Commands Quick Reference */}
        <div className="mt-4 p-3 bg-black/40 rounded-xl text-left">
          <p className="text-xs font-bold text-cyan-400 mb-2 flex items-center gap-2"><Mic className="w-3 h-3" /> Zoe Voice Commands</p>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            {voiceCommandsHelp.slice(0, 8).map((v, i) => (
              <p key={i} className="text-cyan-100/70">"<span className="text-cyan-300">{v.command}</span>"</p>
            ))}
          </div>
        </div>
        
        <Button onClick={onClose} className="w-full py-3 font-bold bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 rounded-xl">
          🚀 Start Exploring! 🚀
        </Button>
      </div>
    </Card>
  </motion.div>
);

export const SolarSystemExplorer: React.FC = () => {
  const navigate = useNavigate();
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const planetsRef = useRef<any[]>([]);
  const animationRef = useRef<number>();
  const clockRef = useRef<any>(null);
  
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [showNarrationPanel, setShowNarrationPanel] = useState(false);
  const [timeSpeed, setTimeSpeed] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [currentYear, setCurrentYear] = useState(2024);
  const [selectedMission, setSelectedMission] = useState<SpaceMission | null>(null);
  const [narrationEnabled, setNarrationEnabled] = useState(true);
  const [narrationAudience, setNarrationAudience] = useState<NarrationAudience>('general');
  const [isStoryMode, setIsStoryMode] = useState(false);
  const [isGuidedTour, setIsGuidedTour] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [controlsExpanded, setControlsExpanded] = useState(true); // Expanded by default for smooth access
  const [timeTravelExpanded, setTimeTravelExpanded] = useState(false);
  
  // New Discovery Panel States
  const [showDiscoveryPanel, setShowDiscoveryPanel] = useState(false);
  const [discoveryTab, setDiscoveryTab] = useState<'simulations' | 'telescope' | 'phenomena' | 'blackholes' | 'meteors' | 'interiors' | 'history' | 'milkyway'>('simulations');
  const [activeSoundscape, setActiveSoundscape] = useState<SoundscapeType | null>(null);
  const [showARInfo, setShowARInfo] = useState(false);
  const [showLabels, setShowLabels] = useState(true); // Visible by default
  const [labelPositions, setLabelPositions] = useState<{name: string; x: number; y: number; visible: boolean}[]>([]);
  
  const { currentNote, setCurrentNote, saveCurrentNote, exportToPDF } = useAutoSaveNotes('heliosphere');

  useEffect(() => {
    const seen = localStorage.getItem('hologram-tour-v3');
    if (!seen) setShowTutorial(true);
  }, []);

  const initScene = useCallback(async () => {
    if (!mountRef.current) return;

    try {
      THREE = await import('three');
      if (!mountRef.current) return;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000008);
      sceneRef.current = scene;

      // Camera
      const camera = new THREE.PerspectiveCamera(60, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 10000);
      camera.position.set(0, 100, 300);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      rendererRef.current = renderer;
      mountRef.current.appendChild(renderer.domElement);

      // Clock for time simulation
      clockRef.current = new THREE.Clock();

      // Holographic starfield
      const starGeometry = new THREE.BufferGeometry();
      const starVertices: number[] = [];
      for (let i = 0; i < 15000; i++) {
        starVertices.push((Math.random() - 0.5) * 3000, (Math.random() - 0.5) * 3000, (Math.random() - 0.5) * 3000);
      }
      starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
      const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, transparent: true, opacity: 0.9 });
      scene.add(new THREE.Points(starGeometry, starMaterial));

      // Holographic grid (AR-style)
      const gridHelper = new THREE.GridHelper(500, 50, 0x00ffff, 0x004444);
      gridHelper.position.y = -50;
      const gridMat = gridHelper.material as any;
      gridMat.transparent = true;
      gridMat.opacity = 0.15;
      scene.add(gridHelper);

      // Sun with holographic glow
      const sunGeometry = new THREE.SphereGeometry(18, 64, 64);
      const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
      const sun = new THREE.Mesh(sunGeometry, sunMaterial);
      sun.userData = { name: 'Sun', info: planetData[0] };
      scene.add(sun);

      // Sun glow layers
      for (let i = 1; i <= 3; i++) {
        const glowGeo = new THREE.SphereGeometry(18 + i * 3, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.2 / i, side: THREE.BackSide });
        scene.add(new THREE.Mesh(glowGeo, glowMat));
      }

      // Sun light
      const sunLight = new THREE.PointLight(0xffffff, 2, 1000);
      scene.add(sunLight);
      scene.add(new THREE.AmbientLight(0x404040, 0.4));

      // Planet configuration - sizes increased for better visibility with emojis
      const planetConfigs = [
        { name: 'Mercury ☿️', color: 0x8c7853, size: 2.2, orbit: 28, speed: 0.008, info: planetData[1] },
        { name: 'Venus ♀️', color: 0xffc649, size: 4, orbit: 40, speed: 0.006, info: planetData[2] },
        { name: 'Earth 🌍', color: 0x4488ff, size: 4.5, orbit: 55, speed: 0.005, info: planetData[3], hasMoon: true },
        { name: 'Mars ♂️', color: 0xff4422, size: 3.5, orbit: 75, speed: 0.004, info: planetData[5], hasLandmarks: true },
        { name: 'Jupiter 🪐', color: 0xffaa66, size: 14, orbit: 110, speed: 0.002, info: planetData[6], hasSpot: true },
        { name: 'Saturn 💫', color: 0xddbb88, size: 12, orbit: 150, speed: 0.0015, info: planetData[7], hasRings: true, hasHexStorm: true },
        { name: 'Uranus 🔵', color: 0x99ccff, size: 7.5, orbit: 190, speed: 0.001, info: planetData[8], tilted: true, hasRings: true },
        { name: 'Neptune 🔷', color: 0x3366ff, size: 7, orbit: 230, speed: 0.0008, info: planetData[9] },
        { name: 'Pluto ❄️', color: 0xccbbaa, size: 1.8, orbit: 280, speed: 0.0005, info: planetData[10] }
      ];

      const planets: any[] = [];

      planetConfigs.forEach((config, idx) => {
        // Orbit path with holographic effect
        const orbitGeo = new THREE.TorusGeometry(config.orbit, 0.15, 8, 128);
        const orbitMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.2 });
        const orbit = new THREE.Mesh(orbitGeo, orbitMat);
        orbit.rotation.x = Math.PI / 2;
        scene.add(orbit);

        // Planet with holographic outline
        const planetGeo = new THREE.SphereGeometry(config.size, 32, 32);
        const planetMat = new THREE.MeshPhongMaterial({ 
          color: config.color, 
          emissive: config.color, 
          emissiveIntensity: 0.15,
          shininess: 30 
        });
        const planet = new THREE.Mesh(planetGeo, planetMat);
        planet.userData = { name: config.name, info: config.info };
        planet.castShadow = true;
        scene.add(planet);

        // Holographic outline
        const outlineGeo = new THREE.SphereGeometry(config.size * 1.02, 16, 16);
        const outlineMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.1, wireframe: true });
        planet.add(new THREE.Mesh(outlineGeo, outlineMat));

        // Saturn/Uranus rings
        if (config.hasRings) {
          const innerR = config.name === 'Saturn' ? config.size * 1.3 : config.size * 1.2;
          const outerR = config.name === 'Saturn' ? config.size * 2.2 : config.size * 1.5;
          const ringGeo = new THREE.RingGeometry(innerR, outerR, 64);
          const ringMat = new THREE.MeshBasicMaterial({ 
            color: config.name === 'Saturn' ? 0xffeecc : 0x99ccff, 
            side: THREE.DoubleSide, 
            transparent: true, 
            opacity: config.name === 'Saturn' ? 0.8 : 0.4 
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = config.tilted ? 0 : Math.PI / 2;
          planet.add(ring);
        }

        // Earth's moon
        if (config.hasMoon) {
          const moonGeo = new THREE.SphereGeometry(0.8, 16, 16);
          const moonMat = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
          const moon = new THREE.Mesh(moonGeo, moonMat);
          moon.userData = { name: 'Moon', info: planetData[4] };
          moon.position.set(6, 0, 0);
          planet.add(moon);
          planet.userData.moon = moon;
        }

        // Jupiter's Great Red Spot (simple representation)
        if (config.hasSpot) {
          const spotGeo = new THREE.CircleGeometry(3, 32);
          const spotMat = new THREE.MeshBasicMaterial({ color: 0xcc4400, transparent: true, opacity: 0.7 });
          const spot = new THREE.Mesh(spotGeo, spotMat);
          spot.position.set(config.size * 0.7, 0, config.size * 0.7);
          spot.lookAt(0, 0, 0);
          planet.add(spot);
        }

        // Uranus tilt
        if (config.tilted) {
          planet.rotation.z = Math.PI / 2;
        }

        planets.push({ mesh: planet, orbit: config.orbit, speed: config.speed, angle: Math.random() * Math.PI * 2 });
      });

      planetsRef.current = planets;

      // Add visible black holes at outer edges
      const blackHoleConfigs = [
        { name: 'Sagittarius A*', x: 350, y: 50, z: -200, size: 8 },
        { name: 'Cygnus X-1', x: -300, y: -30, z: 250, size: 5 },
        { name: 'TON 618', x: -400, y: 80, z: -100, size: 10 }
      ];
      
      blackHoleConfigs.forEach(bh => {
        // Black hole core (dark sphere)
        const bhGeo = new THREE.SphereGeometry(bh.size, 32, 32);
        const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const blackHole = new THREE.Mesh(bhGeo, bhMat);
        blackHole.position.set(bh.x, bh.y, bh.z);
        blackHole.userData = { name: bh.name, isBlackHole: true };
        scene.add(blackHole);
        
        // Event horizon glow ring
        const ringGeo = new THREE.TorusGeometry(bh.size * 1.5, bh.size * 0.3, 16, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.7 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        blackHole.add(ring);
        
        // Accretion disk
        const diskGeo = new THREE.RingGeometry(bh.size * 2, bh.size * 4, 64);
        const diskMat = new THREE.MeshBasicMaterial({ 
          color: 0xff6600, 
          side: THREE.DoubleSide, 
          transparent: true, 
          opacity: 0.4 
        });
        const disk = new THREE.Mesh(diskGeo, diskMat);
        disk.rotation.x = Math.PI / 3;
        blackHole.add(disk);
        
        // Outer glow
        const glowGeo = new THREE.SphereGeometry(bh.size * 1.8, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({ 
          color: 0x4400ff, 
          transparent: true, 
          opacity: 0.2,
          wireframe: true
        });
        blackHole.add(new THREE.Mesh(glowGeo, glowMat));
      });

      // Raycaster for planet selection
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const onClick = (e: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        
        const allObjects = [sun, ...planets.map(p => p.mesh)];
        planets.forEach(p => { if (p.mesh.userData.moon) allObjects.push(p.mesh.userData.moon); });
        
        const intersects = raycaster.intersectObjects(allObjects, true);
        if (intersects.length > 0) {
          let obj = intersects[0].object;
          while (obj && !obj.userData?.info) obj = obj.parent as any;
          if (obj?.userData?.info) {
            setSelectedPlanet(obj.userData.info);
            if (narrationEnabled) speakAsZoe(`${obj.userData.info.name}. ${obj.userData.info.funFact}`);
          }
        }
      };

      // Camera controls
      let isDragging = false;
      let prevX = 0, prevY = 0;
      let theta = 0, phi = Math.PI / 4;
      let radius = 300;

      const updateCamera = () => {
        camera.position.x = radius * Math.sin(phi) * Math.cos(theta);
        camera.position.y = radius * Math.cos(phi);
        camera.position.z = radius * Math.sin(phi) * Math.sin(theta);
        camera.lookAt(0, 0, 0);
      };

      const onMouseDown = (e: MouseEvent) => { isDragging = true; prevX = e.clientX; prevY = e.clientY; };
      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        theta += (e.clientX - prevX) * 0.005;
        phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi + (e.clientY - prevY) * 0.005));
        prevX = e.clientX; prevY = e.clientY;
        updateCamera();
      };
      const onMouseUp = () => { isDragging = false; };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        radius = Math.max(50, Math.min(600, radius + e.deltaY * 0.3));
        updateCamera();
      };

      // Touch controls
      let lastTouchDist = 0;
      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }
        else if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          lastTouchDist = Math.hypot(dx, dy);
        }
      };
      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        if (e.touches.length === 1 && isDragging) {
          theta += (e.touches[0].clientX - prevX) * 0.008;
          phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi + (e.touches[0].clientY - prevY) * 0.008));
          prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
          updateCamera();
        } else if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.hypot(dx, dy);
          if (lastTouchDist > 0) {
            radius = Math.max(50, Math.min(600, radius + (lastTouchDist - dist) * 0.5));
            updateCamera();
          }
          lastTouchDist = dist;
        }
      };
      const onTouchEnd = () => { isDragging = false; lastTouchDist = 0; };

      renderer.domElement.addEventListener('click', onClick);
      renderer.domElement.addEventListener('mousedown', onMouseDown);
      renderer.domElement.addEventListener('mousemove', onMouseMove);
      renderer.domElement.addEventListener('mouseup', onMouseUp);
      renderer.domElement.addEventListener('mouseleave', onMouseUp);
      renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
      renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: false });
      renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: false });
      renderer.domElement.addEventListener('touchend', onTouchEnd);

      const handleResize = () => {
        if (!mountRef.current) return;
        camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      };
      window.addEventListener('resize', handleResize);

      // Animation loop - PROTOCOL ZERO-THERMAL ENFORCED (THE 3 LAWS)
      const frameInterval = zeroThermalProtocol.getFrameInterval();
      let lastFrameTime = 0;
      let isIdlePaused = false;

      // Register with Zero-Thermal Protocol for LAW #3 (Idle Sleep)
      const unregisterThermal = zeroThermalProtocol.registerAnimation({
        id: 'solar-system-explorer-3d',
        type: '3d',
        pause: () => { isIdlePaused = true; },
        resume: () => { isIdlePaused = false; },
        isActive: true,
      });
      
      const animate = (currentTime: number) => {
        animationRef.current = requestAnimationFrame(animate);
        
        // LAW #3: Skip if paused by Idle Sleep
        if (isIdlePaused) {
          return;
        }
        
        // LAW #1: Skip every other frame on low-power devices (30 FPS cap)
        if (zeroThermalProtocol.shouldSkipFrame()) {
          return;
        }
        
        // Throttle frame rate to save battery
        if (currentTime - lastFrameTime < frameInterval) {
          return;
        }
        lastFrameTime = currentTime;
        
        const thermalState = zeroThermalProtocol.getState();
        const speedMultiplier = thermalState.is30FPSCapped ? 0.8 : 1;
        
        if (!isPaused) {
          const delta = clockRef.current.getDelta() * timeSpeed * speedMultiplier;
          
          // Update year display (1 real second = 1 simulated year at speed 1)
          setCurrentYear(prev => Math.round(prev + delta * 10 * timeSpeed));

          planets.forEach(p => {
            p.angle += p.speed * timeSpeed * speedMultiplier * (isPaused ? 0 : 1);
            p.mesh.position.x = Math.cos(p.angle) * p.orbit;
            p.mesh.position.z = Math.sin(p.angle) * p.orbit;
            p.mesh.rotation.y += 0.005 * timeSpeed * speedMultiplier;
            
            // Moon orbit
            if (p.mesh.userData.moon) {
              const moonAngle = p.angle * 12;
              p.mesh.userData.moon.position.x = Math.cos(moonAngle) * 6;
              p.mesh.userData.moon.position.z = Math.sin(moonAngle) * 6;
            }
          });

          sun.rotation.y += 0.001 * timeSpeed * speedMultiplier;
        }

        // Update label positions (project 3D to 2D)
        const newPositions: {name: string; x: number; y: number; visible: boolean}[] = [];
        const width = renderer.domElement.clientWidth;
        const height = renderer.domElement.clientHeight;
        
        // Sun label
        const sunPos = sun.position.clone().project(camera);
        newPositions.push({
          name: 'Sun ☀️',
          x: (sunPos.x * 0.5 + 0.5) * width,
          y: (-sunPos.y * 0.5 + 0.5) * height,
          visible: sunPos.z < 1
        });
        
        // Planet labels
        planets.forEach(p => {
          const pos = p.mesh.position.clone().project(camera);
          newPositions.push({
            name: p.mesh.userData.name,
            x: (pos.x * 0.5 + 0.5) * width,
            y: (-pos.y * 0.5 + 0.5) * height,
            visible: pos.z < 1
          });
          
          // Moon label
          if (p.mesh.userData.moon) {
            const moonWorldPos = new THREE.Vector3();
            p.mesh.userData.moon.getWorldPosition(moonWorldPos);
            const moonPos = moonWorldPos.project(camera);
            newPositions.push({
              name: 'Moon',
              x: (moonPos.x * 0.5 + 0.5) * width,
              y: (-moonPos.y * 0.5 + 0.5) * height,
              visible: moonPos.z < 1
            });
          }
        });
        
        // Black hole labels
        const bhPositions = [
          { name: 'Sagittarius A*', x: 350, y: 50, z: -200 },
          { name: 'Cygnus X-1', x: -300, y: -30, z: 250 },
          { name: 'TON 618', x: -400, y: 80, z: -100 }
        ];
        bhPositions.forEach(bh => {
          const bhVec = new THREE.Vector3(bh.x, bh.y, bh.z).project(camera);
          newPositions.push({
            name: `🕳️ ${bh.name}`,
            x: (bhVec.x * 0.5 + 0.5) * width,
            y: (-bhVec.y * 0.5 + 0.5) * height,
            visible: bhVec.z < 1 && bhVec.z > -1
          });
        });
        
        setLabelPositions(newPositions);

        renderer.render(scene, camera);
      };

      animationRef.current = requestAnimationFrame(animate);
      setIsLoading(false);
      
      setTimeout(() => {
        if (narrationEnabled) speakAsZoe('Welcome to the 3D Holographic Solar System Tour! Drag to rotate, scroll to zoom, click any planet to explore landmarks and learn fun facts.');
        toast.success('🌌 Hologram Tour Ready!', { description: 'Full 3D exploration with time travel & missions', duration: 4000 });
      }, 500);

      return () => {
        window.removeEventListener('resize', handleResize);
        renderer.domElement.removeEventListener('click', onClick);
        renderer.domElement.removeEventListener('mousedown', onMouseDown);
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
        renderer.domElement.removeEventListener('mouseup', onMouseUp);
        renderer.domElement.removeEventListener('wheel', onWheel);
      };

    } catch (err) {
      console.error('Failed to init 3D scene:', err);
      setError('Failed to load 3D visualization. Your browser may not support WebGL.');
      setIsLoading(false);
    }
  }, [isPaused, timeSpeed, narrationEnabled]);

  useEffect(() => {
    initScene();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (mountRef.current && rendererRef.current.domElement.parentNode === mountRef.current) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, []);

  // Guided tour function
  const startGuidedTour = useCallback(() => {
    setIsGuidedTour(true);
    setIsStoryMode(true);
    setTourIndex(0);
    const firstPlanet = planetData[0];
    setSelectedPlanet(firstPlanet);
    speakAsZoe(`Welcome to the Solar System Guided Tour! I'm Zoe, your cosmic guide. Let's begin our journey from the heart of our solar system. ${generateNarration(firstPlanet, narrationAudience, true)}`);
    toast.success('🚀 Guided Tour Started!', { description: 'Zoe will guide you through each planet' });
  }, [narrationAudience]);

  const nextTourStop = useCallback(() => {
    const nextIdx = tourIndex + 1;
    if (nextIdx < planetData.length) {
      setTourIndex(nextIdx);
      const planet = planetData[nextIdx];
      setSelectedPlanet(planet);
      speakAsZoe(generateNarration(planet, narrationAudience, true));
    } else {
      setIsGuidedTour(false);
      speakAsZoe('That concludes our solar system tour! You have explored all the major bodies in our cosmic neighborhood. Feel free to explore on your own or start another tour.');
      toast.success('🎉 Tour Complete!', { description: 'You explored the entire solar system!' });
    }
  }, [tourIndex, narrationAudience]);

  // Comprehensive voice commands
  useEffect(() => {
    const handleVoice = (e: CustomEvent) => {
      const cmd = e.detail.command?.toLowerCase() || '';
      
      // Zoom commands
      if (cmd.includes('zoom in') || cmd.includes('closer')) { 
        cameraRef.current && (cameraRef.current.position.multiplyScalar(0.8)); 
        speakAsZoe('Zooming in');
      }
      else if (cmd.includes('zoom out') || cmd.includes('farther')) { 
        cameraRef.current && (cameraRef.current.position.multiplyScalar(1.2)); 
        speakAsZoe('Zooming out');
      }
      // Time controls
      else if (cmd.includes('pause') || cmd.includes('stop time')) { setIsPaused(true); speakAsZoe('Time simulation paused'); }
      else if (cmd.includes('play') || cmd.includes('resume') || cmd.includes('start time')) { setIsPaused(false); speakAsZoe('Time simulation resumed'); }
      else if (cmd.includes('fast forward') || cmd.includes('speed up') || cmd.includes('faster')) { setTimeSpeed(p => Math.min(10, p * 2)); speakAsZoe('Speeding up time'); }
      else if (cmd.includes('slow down') || cmd.includes('slower') || cmd.includes('rewind')) { setTimeSpeed(p => Math.max(0.1, p / 2)); speakAsZoe('Slowing down time'); }
      else if (cmd.includes('normal speed') || cmd.includes('reset speed')) { setTimeSpeed(1); speakAsZoe('Time speed reset to normal'); }
      // Panels
      else if (cmd.includes('mission') || cmd.includes('spacecraft')) { setShowMissions(true); speakAsZoe('Opening space missions tracker'); }
      else if (cmd.includes('tutorial') || cmd.includes('help') || cmd.includes('guide')) { setShowTutorial(true); }
      else if (cmd.includes('notes') || cmd.includes('note')) { setShowNotes(true); speakAsZoe('Opening notes panel'); }
      else if (cmd.includes('save note')) { saveCurrentNote(); speakAsZoe('Notes saved'); }
      else if (cmd.includes('export') || cmd.includes('download')) { exportToPDF(); speakAsZoe('Exporting to PDF'); }
      // Narration controls
      else if (cmd.includes('narration panel') || cmd.includes('narration settings')) { setShowNarrationPanel(true); speakAsZoe('Opening narration settings'); }
      else if (cmd.includes('story mode on') || cmd.includes('enable story') || cmd.includes('story mode')) { setIsStoryMode(true); speakAsZoe('Story mode enabled. I will provide detailed immersive narrations.'); }
      else if (cmd.includes('story mode off') || cmd.includes('disable story')) { setIsStoryMode(false); speakAsZoe('Story mode disabled. Quick facts only.'); }
      else if (cmd.includes('mute') || cmd.includes('silence') || cmd.includes('quiet')) { setNarrationEnabled(false); speakAsZoe('Narration muted'); }
      else if (cmd.includes('unmute') || cmd.includes('speak') || cmd.includes('voice on')) { setNarrationEnabled(true); speakAsZoe('Narration enabled'); }
      // Audience modes
      else if (cmd.includes('kids mode') || cmd.includes('child mode')) { setNarrationAudience('kids'); speakAsZoe('Switching to kids mode! Get ready for fun space adventures!'); }
      else if (cmd.includes('student mode')) { setNarrationAudience('students'); speakAsZoe('Student mode activated. Educational content optimized for learning.'); }
      else if (cmd.includes('teacher mode')) { setNarrationAudience('teachers'); speakAsZoe('Teacher mode activated. Content includes teaching points and discussion topics.'); }
      else if (cmd.includes('researcher mode')) { setNarrationAudience('researchers'); speakAsZoe('Researcher mode activated. Detailed scientific context provided.'); }
      else if (cmd.includes('academic mode')) { setNarrationAudience('academics'); speakAsZoe('Academic mode activated. Scholarly approach with reference-level detail.'); }
      else if (cmd.includes('phd mode') || cmd.includes('doctoral mode') || cmd.includes('scholar mode')) { setNarrationAudience('phd'); speakAsZoe('PhD Scholar mode activated. Expert-level analysis with cutting-edge research context.'); }
      else if (cmd.includes('scientist mode') || cmd.includes('science mode')) { setNarrationAudience('scientists'); speakAsZoe('Scientist mode activated. Technical specifications and precise measurements.'); }
      else if (cmd.includes('explorer mode') || cmd.includes('space explorer')) { setNarrationAudience('explorers'); speakAsZoe('Space Explorer mode activated. Mission briefing style narration.'); }
      else if (cmd.includes('general mode') || cmd.includes('normal mode')) { setNarrationAudience('general'); speakAsZoe('General mode activated. Balanced, informative narration for everyone.'); }
      // Tour commands
      else if (cmd.includes('start tour') || cmd.includes('full tour') || cmd.includes('guided tour') || cmd.includes('begin tour')) { startGuidedTour(); }
      else if (cmd.includes('next planet') || cmd.includes('continue tour') || cmd.includes('next stop')) { if (isGuidedTour) nextTourStop(); else speakAsZoe('No tour in progress. Say start tour to begin.'); }
      else if (cmd.includes('stop tour') || cmd.includes('end tour')) { setIsGuidedTour(false); speakAsZoe('Tour ended. Feel free to explore on your own.'); }
      // Reset
      else if (cmd.includes('reset view') || cmd.includes('reset camera') || cmd.includes('default view')) { 
        if (cameraRef.current) { cameraRef.current.position.set(0, 100, 300); cameraRef.current.lookAt(0, 0, 0); }
        speakAsZoe('View reset to default');
      }
      // Planet navigation with "tell me about" for detailed info
      else if (cmd.includes('tell me about') || cmd.includes('describe') || cmd.includes('explain')) {
        const planet = planetData.find(p => cmd.includes(p.name.toLowerCase()));
        if (planet) { 
          setSelectedPlanet(planet); 
          speakAsZoe(generateNarration(planet, narrationAudience, true)); 
        }
      }
      // Show landmarks
      else if (cmd.includes('landmark') || cmd.includes('feature')) {
        if (selectedPlanet?.landmarks?.length) {
          const landmarkText = selectedPlanet.landmarks.map(l => `${l.name}: ${l.description}`).join('. ');
          speakAsZoe(`Landmarks on ${selectedPlanet.name}: ${landmarkText}`);
        } else {
          speakAsZoe('Select a planet first to hear about its landmarks.');
        }
      }
      // Show moons
      else if (cmd.includes('moon')) {
        if (selectedPlanet?.moons?.length) {
          speakAsZoe(`${selectedPlanet.name} has ${selectedPlanet.moons.length} notable moons: ${selectedPlanet.moons.join(', ')}`);
        } else if (selectedPlanet) {
          speakAsZoe(`${selectedPlanet.name} has no major moons.`);
        } else {
          speakAsZoe('Select a planet first to learn about its moons.');
        }
      }
      // Direct planet navigation (fallback)
      else {
        const planet = planetData.find(p => cmd.includes(p.name.toLowerCase()));
        if (planet) { 
          setSelectedPlanet(planet); 
          if (narrationEnabled) speakAsZoe(generateNarration(planet, narrationAudience, isStoryMode)); 
        }
      }
    };
    window.addEventListener('zoe-command' as any, handleVoice);
    return () => window.removeEventListener('zoe-command' as any, handleVoice);
  }, [narrationEnabled, narrationAudience, isStoryMode, isGuidedTour, tourIndex, selectedPlanet, startGuidedTour, nextTourStop, saveCurrentNote, exportToPDF]);

  const focusOnPlanet = (planetName: string) => {
    const planet = planetData.find(p => p.name === planetName);
    if (planet) {
      setSelectedPlanet(planet);
      if (narrationEnabled) speakAsZoe(generateNarration(planet, narrationAudience, isStoryMode));
    }
  };

  return (
    <div className="relative w-full h-[100dvh] bg-black overflow-hidden">
      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xl text-cyan-400 animate-pulse">Initializing Hologram...</p>
            <p className="text-sm text-cyan-300/60">Loading 3D Solar System</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-50 p-4">
          <Card className="bg-red-900/50 border-red-500/50 p-6 max-w-md text-center">
            <p className="text-red-300 mb-4">{error}</p>
            <Button onClick={() => { setError(null); setIsLoading(true); initScene(); }} className="bg-cyan-600 hover:bg-cyan-500">Retry</Button>
          </Card>
        </div>
      )}

      {/* 3D Mount - Full viewport */}
      <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Planet Name Labels Overlay - Text only with glow - no pointer events blocking */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {showLabels && labelPositions.map((label, i) => (
          label.visible && (
            <div
              key={`${label.name}-${i}`}
              className="absolute transform -translate-x-1/2 pointer-events-none animate-fade-in"
              style={{ 
                left: Math.max(30, Math.min(label.x, window.innerWidth - 50)), 
                top: Math.max(45, label.y - 18),
                zIndex: label.name === 'Sun ☀️' ? 50 : 40 - i
              }}
            >
              {/* Clean text-only label with glow effect - includes emojis */}
              <span 
                className="text-[10px] sm:text-[11px] font-bold whitespace-nowrap tracking-wide"
                style={{
                  color: label.name.includes('🕳️') ? '#ff6644' : label.name.includes('☀️') ? '#ffcc00' : '#00ffff',
                  textShadow: label.name.includes('🕳️') 
                    ? '0 0 8px #ff4400, 0 0 12px #ff6644, 0 0 20px rgba(255,68,0,0.5)' 
                    : label.name.includes('☀️')
                    ? '0 0 10px #ffaa00, 0 0 15px #ffcc00, 0 0 25px rgba(255,200,0,0.6)'
                    : '0 0 8px #00ffff, 0 0 12px #0088ff, 0 0 20px rgba(0,255,255,0.5), 0 1px 2px rgba(0,0,0,0.8)'
                }}
              >
                {label.name}
              </span>
            </div>
          )
        ))}
      </div>

      {/* Header Bar - Centered title only (parent modal has Close button) */}
      <div className="absolute top-2 sm:top-3 left-0 right-0 z-50 flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 safe-area-inset-top">
        {/* Header Title - Centered */}
        <div className="bg-gradient-to-r from-black/80 to-purple-900/60 backdrop-blur-md border border-cyan-400/40 px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg flex items-center gap-2 sm:gap-3 shadow-lg shadow-purple-500/20">
          <h2 className="text-xs sm:text-sm md:text-base font-bold bg-gradient-to-r from-cyan-300 via-white to-purple-300 bg-clip-text text-transparent whitespace-nowrap">
            🌌 4K Heliosphere Explorer
          </h2>
          <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-cyan-200 bg-cyan-500/30 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md border border-cyan-400/30">
            <Clock className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
            <span className="tabular-nums font-medium">{currentYear}</span>
          </div>
        </div>
      </div>

      {/* Time Travel Controls - Fixed position with proper spacing */}
      <div className="absolute bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2 z-40 w-[92%] sm:w-auto max-w-lg pb-safe">
        <div className="bg-black/95 backdrop-blur-xl border border-cyan-500/40 rounded-lg sm:rounded-xl overflow-hidden">
          {/* Main Time Controls Row - Compact on mobile */}
          <div className="px-1.5 sm:px-3 py-1.5 sm:py-2 flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap sm:flex-nowrap">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setCurrentYear(y => Math.max(1900, y - 100))} 
              className="text-cyan-300 h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-cyan-500/20"
              title="Rewind 100 years"
            >
              <Rewind className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setIsPaused(!isPaused)} 
              className="text-white h-7 w-7 sm:h-8 sm:w-8 p-0 bg-cyan-500/30 hover:bg-cyan-500/50 rounded-full"
            >
              {isPaused ? <Play className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> : <Pause className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setCurrentYear(y => Math.min(3000, y + 100))} 
              className="text-cyan-300 h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-cyan-500/20"
              title="Forward 100 years"
            >
              <FastForward className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </Button>
            
            <div className="hidden sm:block w-px h-5 bg-cyan-500/30 mx-0.5 sm:mx-1" />
            
            {/* Year Display - Responsive */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-cyan-500/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg">
              <Clock className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-cyan-400" />
              <span className="text-[10px] sm:text-xs font-bold text-cyan-300 tabular-nums">{currentYear}</span>
            </div>
            
            {/* Speed Control - Hidden on very small screens */}
            <div className="hidden xs:flex items-center gap-0.5 sm:gap-1 bg-purple-500/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg">
              <span className="text-[9px] sm:text-[10px] text-purple-300">{timeSpeed}x</span>
              <div className="flex gap-0.5">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setTimeSpeed(p => Math.max(0.1, p / 2))} 
                  className="h-4 w-4 sm:h-5 sm:w-5 p-0 text-purple-300 hover:bg-purple-500/30 text-[9px] sm:text-[10px]"
                >−</Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setTimeSpeed(p => Math.min(10, p * 2))} 
                  className="h-4 w-4 sm:h-5 sm:w-5 p-0 text-purple-300 hover:bg-purple-500/30 text-[9px] sm:text-[10px]"
                >+</Button>
              </div>
            </div>
            
            <div className="hidden sm:block w-px h-5 bg-cyan-500/30 mx-0.5 sm:mx-1" />
            
            {/* Story Mode Toggle - Responsive */}
            <Button 
              size="sm" 
              onClick={() => { setIsStoryMode(!isStoryMode); speakAsZoe(isStoryMode ? 'Quick facts mode' : 'Story mode enabled'); }} 
              className={`h-7 sm:h-8 px-1.5 sm:px-2 text-[9px] sm:text-[10px] font-bold rounded-lg ${isStoryMode ? 'bg-green-500 text-white border-2 border-green-300' : 'bg-black/60 text-white/80 border border-white/30'}`}
            >
              <Sparkles className="w-2.5 sm:w-3 h-2.5 sm:h-3 mr-0.5 sm:mr-1" />
              <span className="hidden xs:inline">{isStoryMode ? 'ON' : 'Story'}</span>
            </Button>
            
            {/* Narration Toggle */}
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setNarrationEnabled(!narrationEnabled)} 
              className={`h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg ${narrationEnabled ? 'bg-green-500/30 text-green-300' : 'bg-black/40 text-white/50'}`}
            >
              <Volume2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </Button>
            
            {/* Expand Time Travel */}
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setTimeTravelExpanded(!timeTravelExpanded)} 
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-cyan-300 hover:bg-cyan-500/20"
            >
              {timeTravelExpanded ? <ChevronDown className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> : <ChevronUp className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
            </Button>
          </div>
          
          {/* Expanded Time Travel Panel */}
          {timeTravelExpanded && (
            <div className="px-3 py-2 border-t border-cyan-500/20 bg-black/50">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-[10px] text-cyan-400">Quick Jump:</span>
                {[1969, 2024, 2050, 2100, 2500].map(yr => (
                  <Button 
                    key={yr} 
                    size="sm" 
                    onClick={() => { setCurrentYear(yr); speakAsZoe(`Time traveling to year ${yr}`); }}
                    className={`h-6 px-2 text-[10px] rounded ${currentYear === yr ? 'bg-cyan-500 text-white' : 'bg-black/40 text-cyan-300 hover:bg-cyan-500/30'}`}
                  >
                    {yr}
                  </Button>
                ))}
              </div>
              <p className="text-[9px] text-cyan-400/60 text-center">Use voice: "time travel to 1969" or "go to year 2100"</p>
            </div>
          )}
        </div>
        
        {/* Current Mode Badge */}
        {isStoryMode && (
          <div className="flex justify-center mt-2">
            <div className="bg-green-600/90 border-2 border-green-400 px-3 py-1 rounded-full flex items-center gap-2 shadow-lg shadow-green-500/30">
              {audienceStyles[narrationAudience].icon}
              <span className="text-xs font-bold text-white">{audienceStyles[narrationAudience].name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Compact Control Panel - Right side, below header */}
      <div className="absolute top-14 sm:top-16 right-2 sm:right-3 z-40 flex flex-col gap-1 max-w-[120px] sm:max-w-[140px] md:max-w-[150px]">
        {/* Controls Toggle Button - Improved styling */}
        <Button 
          onClick={() => setControlsExpanded(!controlsExpanded)}
          className="w-full bg-gradient-to-r from-black/95 to-gray-900/95 hover:from-gray-800/95 hover:to-gray-700/95 border-2 border-cyan-500/60 text-cyan-200 rounded-xl flex items-center justify-between px-3 py-2.5 h-10 shadow-lg shadow-cyan-500/20 transition-all duration-300"
        >
          <div className="flex items-center gap-2">
            <Menu className="w-4 h-4" />
            <span className="text-xs font-bold">Controls</span>
          </div>
          {controlsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
        
        {/* Expanded Controls - Smooth animation */}
        <AnimatePresence mode="wait">
          {controlsExpanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0, scale: 0.95 }} 
              animate={{ opacity: 1, height: 'auto', scale: 1 }} 
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden mt-1"
            >
              <div className="bg-gradient-to-b from-black/95 to-gray-900/95 backdrop-blur-xl border-2 border-cyan-500/40 p-2 rounded-xl space-y-1.5 shadow-xl shadow-black/50">
                <Button size="sm" onClick={() => setShowTutorial(true)} className="w-full bg-cyan-600/80 hover:bg-cyan-500 text-white font-medium rounded-lg flex items-center gap-1.5 sm:gap-2 justify-start text-[10px] sm:text-xs h-7 sm:h-8">
                  <HelpCircle className="w-3 h-3" /> <span className="truncate">Tutorial</span>
                </Button>
                <Button size="sm" onClick={() => setShowMissions(!showMissions)} className="w-full bg-purple-600/80 hover:bg-purple-500 text-white font-medium rounded-lg flex items-center gap-1.5 sm:gap-2 justify-start text-[10px] sm:text-xs h-7 sm:h-8">
                  <Rocket className="w-3 h-3" /> <span className="truncate">Missions</span>
                </Button>
                <Button size="sm" onClick={() => setShowNotes(!showNotes)} className="w-full bg-pink-600/80 hover:bg-pink-500 text-white font-medium rounded-lg flex items-center gap-1.5 sm:gap-2 justify-start text-[10px] sm:text-xs h-7 sm:h-8">
                  <FileText className="w-3 h-3" /> <span className="truncate">Notes</span>
                </Button>
                
                {/* Zoe Narration Mode Button */}
                <Button 
                  size="sm" 
                  onClick={() => setShowNarrationPanel(!showNarrationPanel)} 
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5 sm:gap-2 justify-start text-[10px] sm:text-xs h-7 sm:h-9 border border-green-400 shadow-lg shadow-green-500/20"
                >
                  <Sparkles className="w-3 sm:w-4 h-3 sm:h-4" /> <span className="truncate">Narration</span>
                </Button>
                
                {/* Discovery & Science Button */}
                <Button 
                  size="sm" 
                  onClick={() => setShowDiscoveryPanel(!showDiscoveryPanel)} 
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-lg flex items-center gap-1.5 sm:gap-2 justify-start text-[10px] sm:text-xs h-7 sm:h-9 border border-indigo-400 shadow-lg shadow-indigo-500/20"
                >
                  <Telescope className="w-3 sm:w-4 h-3 sm:h-4" /> <span className="truncate">Discovery</span>
                </Button>
                
                {/* Quick Milky Way Access Button */}
                <Button 
                  size="sm" 
                  onClick={() => { setShowDiscoveryPanel(true); setDiscoveryTab('milkyway'); speakAsZoe('Opening Milky Way galactic context'); }} 
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-lg flex items-center gap-1.5 sm:gap-2 justify-start text-[10px] sm:text-xs h-7 sm:h-9 border border-purple-400 shadow-lg shadow-purple-500/20"
                >
                  <Globe className="w-3 sm:w-4 h-3 sm:h-4" /> <span className="truncate">🌌 Milky Way</span>
                </Button>
                
                {/* Labels Toggle Button */}
                <Button 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); setShowLabels(!showLabels); }} 
                  className={`w-full font-bold rounded-lg flex items-center gap-1.5 sm:gap-2 justify-start text-[10px] sm:text-xs h-7 sm:h-9 border ${
                    showLabels 
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-400 text-white shadow-lg shadow-cyan-500/20' 
                      : 'bg-black/60 border-white/30 text-white/70'
                  }`}
                >
                  <Eye className="w-3 sm:w-4 h-3 sm:h-4" /> <span className="truncate">{showLabels ? 'Names ON' : 'Tap to Show'}</span>
                </Button>
                
                {/* Zoom Controls - Compact with handlers */}
                <div className="flex gap-0.5 sm:gap-1 pt-0.5 sm:pt-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
                      if (cameraRef.current) {
                        const cam = cameraRef.current;
                        cam.position.multiplyScalar(0.85);
                        cam.updateProjectionMatrix();
                      }
                    }}
                    className="flex-1 h-6 sm:h-7 bg-black/40 text-cyan-300 hover:bg-cyan-500/30 text-[10px] sm:text-xs rounded"
                  >
                    <ZoomIn className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
                      if (cameraRef.current) {
                        const cam = cameraRef.current;
                        cam.position.multiplyScalar(1.15);
                        cam.updateProjectionMatrix();
                      }
                    }}
                    className="flex-1 h-6 sm:h-7 bg-black/40 text-cyan-300 hover:bg-cyan-500/30 text-[10px] sm:text-xs rounded"
                  >
                    <ZoomOut className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                  </Button>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => {
                    if (cameraRef.current) {
                      const cam = cameraRef.current;
                      cam.position.set(0, 150, 300);
                      cam.lookAt(0, 0, 0);
                      cam.updateProjectionMatrix();
                    }
                  }}
                  className="w-full h-6 sm:h-7 bg-black/40 text-cyan-300 hover:bg-cyan-500/30 text-[10px] sm:text-xs rounded flex items-center gap-1 justify-center"
                >
                  <RotateCcw className="w-2.5 sm:w-3 h-2.5 sm:h-3" /> <span className="truncate">Reset</span>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Guided Tour Controls - Responsive */}
        <div className="bg-gradient-to-br from-yellow-900/95 to-orange-900/95 backdrop-blur-xl border border-yellow-400 p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-lg shadow-yellow-500/20">
          <p className="text-[9px] sm:text-[10px] font-bold text-yellow-200 mb-1 sm:mb-1.5 text-center flex items-center justify-center gap-0.5 sm:gap-1">
            <Sparkles className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-yellow-300" /> Tour
          </p>
          {!isGuidedTour ? (
            <Button 
              size="sm" 
              onClick={startGuidedTour} 
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold rounded-lg flex items-center gap-1 sm:gap-2 justify-center text-[10px] sm:text-xs h-7 sm:h-9 shadow-lg"
            >
              <Play className="w-3 sm:w-4 h-3 sm:h-4" /> <span className="truncate">Start</span>
            </Button>
          ) : (
            <div className="space-y-1 sm:space-y-1.5">
              <div className="flex gap-0.5 sm:gap-1">
                <Button 
                  size="sm" 
                  onClick={nextTourStop} 
                  className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg text-[10px] sm:text-xs h-6 sm:h-8"
                >
                  Next →
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => setIsGuidedTour(false)} 
                  className="bg-red-500 hover:bg-red-400 text-white h-6 w-6 sm:h-8 sm:w-8 p-0 rounded-lg"
                >
                  <X className="w-3 sm:w-4 h-3 sm:h-4" />
                </Button>
              </div>
              <div className="bg-black/40 rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1">
                <p className="text-[9px] sm:text-[10px] font-bold text-yellow-200 text-center">
                  {tourIndex + 1}/{planetData.length}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Quick Planet Access - Responsive */}
        <div className="bg-black/80 backdrop-blur-xl border border-white/20 p-1.5 sm:p-2 rounded-lg sm:rounded-xl">
          <p className="text-[9px] sm:text-[10px] text-cyan-300 mb-0.5 sm:mb-1 text-center font-medium">Quick</p>
          <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
            {['Mar', 'Jup', 'Sat'].map((p, i) => (
              <Button 
                key={p} 
                size="sm" 
                variant="ghost" 
                onClick={() => focusOnPlanet(['Mars', 'Jupiter', 'Saturn'][i])} 
                className="h-6 sm:h-7 text-[9px] sm:text-[10px] text-white bg-cyan-500/30 hover:bg-cyan-500/50 rounded font-medium px-1"
              >
                {p}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Zoe Narration Style Panel - Top Center Overlay */}
      <AnimatePresence>
        {showNarrationPanel && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }} 
            className="absolute top-12 left-1/2 -translate-x-1/2 z-[60] w-[300px] max-w-[90vw]"
          >
            <Card className="bg-gradient-to-br from-emerald-900/98 to-blue-900/98 border-2 border-green-400 p-4 rounded-xl backdrop-blur-xl shadow-2xl shadow-green-500/30">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-green-300" /> Zoe Narration Style
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setShowNarrationPanel(false)} className="h-7 w-7 p-0 bg-black/40 text-white hover:bg-red-500/50 rounded-lg">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Story Mode Toggle */}
              <div className="flex items-center justify-between mb-3 p-2.5 bg-black/50 rounded-lg border border-green-500/30">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-green-300" />
                  <span className="text-xs text-white font-medium">Story Mode</span>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => { setIsStoryMode(!isStoryMode); speakAsZoe(isStoryMode ? 'Story mode disabled' : 'Story mode enabled for immersive narrations'); }} 
                  className={`h-8 px-4 text-xs font-bold rounded-lg ${isStoryMode ? 'bg-green-500 text-white border-2 border-green-300' : 'bg-black/50 text-white border border-white/30'}`}
                >
                  {isStoryMode ? 'ON' : 'OFF'}
                </Button>
              </div>
              
              {/* Audience Selector */}
              <div className="mb-3">
                <p className="text-xs text-green-200 font-medium mb-2">Select Your Audience</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.entries(audienceStyles) as [NarrationAudience, AudienceStyle][]).map(([key, style]) => (
                    <Button
                      key={key}
                      size="sm"
                      onClick={() => { setNarrationAudience(key); speakAsZoe(`${style.name} activated`); }}
                      className={`flex flex-col items-center gap-0.5 h-auto py-2 px-1 text-[9px] rounded-lg transition-all ${
                        narrationAudience === key 
                          ? 'bg-green-500 border-2 border-green-300 text-white font-bold shadow-lg shadow-green-500/30' 
                          : 'bg-black/50 text-white hover:bg-green-600/50 border border-green-500/30'
                      }`}
                    >
                      {style.icon}
                      <span className="truncate w-full text-center">{style.name.replace(' Mode', '')}</span>
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Current Mode Info */}
              <div className="p-2.5 bg-black/50 rounded-lg text-center border border-green-500/30">
                <p className="text-xs text-white font-bold">
                  {audienceStyles[narrationAudience].name}
                </p>
                <p className="text-[10px] text-green-200/90 mt-0.5">
                  Tone: {audienceStyles[narrationAudience].tone}
                </p>
                <p className="text-[10px] text-green-200/70 mt-0.5">
                  Complexity: <span className="capitalize">{audienceStyles[narrationAudience].complexity}</span>
                </p>
              </div>
              
              {/* Quick Test Button */}
              <Button 
                size="sm" 
                onClick={() => {
                  const testPlanet = selectedPlanet || planetData[5]; // Mars as default
                  speakAsZoe(generateNarration(testPlanet, narrationAudience, isStoryMode));
                }}
                className="w-full mt-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold text-xs h-9 rounded-lg shadow-lg"
              >
                🎤 Test Narration Style
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tutorial */}
      <AnimatePresence>
        {showTutorial && <HologramTutorial onClose={() => { setShowTutorial(false); localStorage.setItem('hologram-tour-v3', 'true'); }} />}
      </AnimatePresence>

      {/* Planet Info Panel - Left Side - Below header */}
      <AnimatePresence>
        {selectedPlanet && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }} 
            className="absolute top-11 left-2 z-40 w-56 md:w-64 max-h-[50vh] overflow-auto"
          >
            <Card className="bg-gradient-to-br from-purple-900/98 to-blue-900/98 border-2 border-cyan-400/60 p-2.5 md:p-3 rounded-xl backdrop-blur-xl">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-base md:text-lg font-bold text-white">{selectedPlanet.name}</h3>
                <Button size="sm" variant="ghost" onClick={() => setSelectedPlanet(null)} className="h-7 w-7 p-0 bg-black/40 text-white hover:bg-red-500/50 rounded-lg">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-8 bg-black/50 rounded-lg">
                  <TabsTrigger value="info" className="text-[10px] md:text-xs text-white data-[state=active]:bg-cyan-500 data-[state=active]:text-white rounded">Info</TabsTrigger>
                  <TabsTrigger value="landmarks" className="text-[10px] md:text-xs text-white data-[state=active]:bg-cyan-500 data-[state=active]:text-white rounded">Sites</TabsTrigger>
                  <TabsTrigger value="moons" className="text-[10px] md:text-xs text-white data-[state=active]:bg-cyan-500 data-[state=active]:text-white rounded">Moons</TabsTrigger>
                </TabsList>
                
                <TabsContent value="info" className="mt-2 space-y-2">
                  <p className="text-xs text-white/90">{selectedPlanet.description}</p>
                  <p className="text-xs text-yellow-300 font-medium bg-yellow-500/20 p-2 rounded-lg">🌟 {selectedPlanet.funFact}</p>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-white/80 bg-black/30 p-2 rounded-lg">
                    <p>📏 {selectedPlanet.radius}</p>
                    <p>🛤️ {selectedPlanet.distance}</p>
                    <p className="col-span-2">🔄 {selectedPlanet.orbitalPeriod}</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="landmarks" className="mt-2 space-y-1 max-h-32 overflow-auto">
                  {selectedPlanet.landmarks?.length ? selectedPlanet.landmarks.map((l, i) => (
                    <div key={i} className="p-2 bg-black/40 rounded-lg border border-pink-500/30">
                      <p className="text-xs font-bold text-pink-300 flex items-center gap-1"><MapPin className="w-3 h-3" />{l.name}</p>
                      <p className="text-[10px] text-white/70">{l.description}</p>
                    </div>
                  )) : <p className="text-xs text-white/50 text-center py-2">No major landmarks recorded</p>}
                </TabsContent>
                
                <TabsContent value="moons" className="mt-2 space-y-1 max-h-32 overflow-auto">
                  {selectedPlanet.moons?.length ? selectedPlanet.moons.map((m, i) => (
                    <div key={i} className="p-2 bg-black/40 rounded-lg flex items-center gap-2 border border-cyan-500/30">
                      <span className="text-lg">🌙</span>
                      <p className="text-xs text-white font-medium">{m}</p>
                    </div>
                  )) : <p className="text-xs text-white/50 text-center py-2">No known moons</p>}
                </TabsContent>
              </Tabs>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Missions Panel - Left side, above time controls */}
      <AnimatePresence>
        {showMissions && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 20 }} 
            className="absolute bottom-32 sm:bottom-36 left-2 z-50 w-56 md:w-64 max-h-44"
          >
            <Card className="bg-black/95 border-2 border-purple-400/60 p-3 rounded-xl backdrop-blur-xl">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><Rocket className="w-4 h-4 text-purple-400" /> Space Missions</h3>
                <Button size="sm" variant="ghost" onClick={() => setShowMissions(false)} className="h-7 w-7 p-0 bg-black/40 text-white hover:bg-red-500/50 rounded-lg">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-auto">
                {spaceMissions.map((m, i) => (
                  <div 
                    key={i} 
                    className="p-2 bg-purple-900/40 rounded-lg cursor-pointer hover:bg-purple-700/50 border border-purple-500/30 transition-colors" 
                    onClick={() => { setSelectedMission(m); if (narrationEnabled) speakAsZoe(`${m.name}, launched in ${m.launch}. ${m.description}`); }}
                  >
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold text-white">{m.name}</p>
                      <span className="text-[9px] text-purple-300 bg-purple-500/30 px-1.5 py-0.5 rounded">{m.launch}</span>
                    </div>
                    <p className="text-[10px] text-white/70">{m.target} • {m.status}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes Panel - Right side, above time controls */}
      <AnimatePresence>
        {showNotes && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 20 }} 
            className="absolute bottom-32 sm:bottom-36 right-2 z-50 w-56 md:w-64"
          >
            <Card className="bg-black/95 border-2 border-pink-400/60 p-3 rounded-xl backdrop-blur-xl">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-white">📝 Space Notes</h3>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => saveCurrentNote()} className="h-7 w-7 p-0 bg-green-500/30 text-green-300 hover:bg-green-500/50 rounded-lg">
                    <Save className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => exportToPDF()} className="h-7 w-7 p-0 bg-blue-500/30 text-blue-300 hover:bg-blue-500/50 rounded-lg">
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNotes(false)} className="h-7 w-7 p-0 bg-black/40 text-white hover:bg-red-500/50 rounded-lg">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <Textarea 
                value={currentNote} 
                onChange={(e) => setCurrentNote(e.target.value)} 
                placeholder="Record your discoveries..." 
                className="bg-black/60 border-pink-500/40 min-h-20 text-xs text-white placeholder:text-white/40" 
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discovery & Science Panel - Right Side Drawer */}
      <AnimatePresence>
        {showDiscoveryPanel && (
          <motion.div 
            initial={{ opacity: 0, x: 50 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: 50 }} 
            className="absolute top-11 right-[150px] md:right-[160px] z-[55] w-[280px] md:w-[320px] max-h-[70vh] overflow-hidden"
          >
            <Card className="bg-gradient-to-br from-indigo-900/98 to-violet-900/98 border-2 border-indigo-400 rounded-xl backdrop-blur-xl shadow-2xl">
              {/* Header */}
              <div className="flex justify-between items-center p-3 border-b border-indigo-500/30">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Telescope className="w-4 h-4 text-indigo-300" /> Mission & Discovery Center
                </h3>
                <div className="flex items-center gap-2">
                  {/* Soundscape Toggle */}
                  <Button 
                    size="sm" 
                    onClick={() => setActiveSoundscape(activeSoundscape ? null : 'solar-wind')}
                    className={`h-7 px-2 text-[10px] rounded-lg ${activeSoundscape ? 'bg-violet-500 text-white' : 'bg-black/40 text-white/70'}`}
                  >
                    <Waves className="w-3 h-3 mr-1" /> {activeSoundscape ? 'Sound ON' : 'Sound'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowDiscoveryPanel(false)} className="h-7 w-7 p-0 bg-black/40 text-white hover:bg-red-500/50 rounded-lg">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Tab Navigation */}
              <div className="flex gap-1 p-2 bg-black/30 overflow-x-auto">
                {[
                  { id: 'simulations', label: 'Missions', icon: <Rocket className="w-3 h-3" /> },
                  { id: 'telescope', label: 'Telescope', icon: <Eye className="w-3 h-3" /> },
                  { id: 'phenomena', label: 'Phenomena', icon: <Zap className="w-3 h-3" /> },
                  { id: 'blackholes', label: 'Black Holes', icon: <Shield className="w-3 h-3" /> },
                  { id: 'meteors', label: 'Meteors', icon: <Sparkles className="w-3 h-3" /> },
                  { id: 'interiors', label: 'Interiors', icon: <Globe className="w-3 h-3" /> },
                  { id: 'history', label: 'History', icon: <History className="w-3 h-3" /> },
                  { id: 'milkyway', label: 'Milky Way', icon: <Star className="w-3 h-3" /> },
                ].map(tab => (
                  <Button
                    key={tab.id}
                    size="sm"
                    onClick={() => setDiscoveryTab(tab.id as any)}
                    className={`flex items-center gap-1 h-7 px-2 text-[10px] rounded-lg whitespace-nowrap ${
                      discoveryTab === tab.id 
                        ? 'bg-indigo-500 text-white font-bold' 
                        : 'bg-black/30 text-white/70 hover:bg-indigo-500/30'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </Button>
                ))}
              </div>
              
              {/* Content Area - Scrollable */}
              <div className="p-2 max-h-[45vh] overflow-auto">
                {/* Mission Simulations Tab */}
                {discoveryTab === 'simulations' && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-indigo-200/80 mb-2">🚀 Historic & Future Mission Simulations</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {missionSimulations.map((sim, i) => (
                        <div 
                          key={i} 
                          className={`p-2.5 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${
                            sim.type === 'historic' 
                              ? 'bg-amber-900/40 border-amber-500/40 hover:bg-amber-800/50' 
                              : 'bg-cyan-900/40 border-cyan-500/40 hover:bg-cyan-800/50'
                          }`}
                          onClick={() => {
                            if (narrationEnabled) speakAsZoe(`${sim.name}, ${sim.year}. ${sim.description}. Key moments include: ${sim.keyMoments.slice(0, 2).join(', ')}.`);
                          }}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-xs font-bold text-white">{sim.name}</p>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${sim.type === 'historic' ? 'bg-amber-500/40 text-amber-200' : 'bg-cyan-500/40 text-cyan-200'}`}>
                              {sim.year}
                            </span>
                          </div>
                          <p className="text-[10px] text-white/70 mb-1.5">{sim.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {sim.keyMoments.slice(0, 3).map((m, j) => (
                              <span key={j} className="text-[8px] bg-black/30 text-white/60 px-1.5 py-0.5 rounded">{m}</span>
                            ))}
                          </div>
                          <p className="text-[9px] text-white/50 mt-1">Duration: {sim.duration}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Telescope Views Tab */}
                {discoveryTab === 'telescope' && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-indigo-200/80 mb-2">🔭 Simulated Telescope Views (Hubble, JWST, Chandra)</p>
                    <div className="space-y-2">
                      {telescopeViews.map((view, i) => (
                        <div 
                          key={i} 
                          className="p-2.5 bg-black/40 rounded-lg border border-violet-500/30 hover:bg-violet-900/30 cursor-pointer transition-all"
                          onClick={() => {
                            if (narrationEnabled) speakAsZoe(`${view.telescope} observing ${view.target}. ${view.description}. Discovery: ${view.discovery}`);
                          }}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-xs font-bold text-violet-300">{view.target}</p>
                            <span className="text-[9px] bg-violet-500/30 text-violet-200 px-1.5 py-0.5 rounded">{view.telescope}</span>
                          </div>
                          <p className="text-[10px] text-white/80">{view.description}</p>
                          <div className="flex justify-between mt-1.5">
                            <span className="text-[9px] text-cyan-300/70">📡 {view.wavelength}</span>
                            <span className="text-[9px] text-yellow-300/70">💡 {view.discovery}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Real-time Updates Info */}
                    <div className="mt-3 p-2 bg-green-900/30 border border-green-500/30 rounded-lg">
                      <p className="text-[10px] font-bold text-green-300 flex items-center gap-1"><Activity className="w-3 h-3" /> Real-Time Updates</p>
                      <p className="text-[9px] text-green-200/70">Live data feeds from NASA, ESA, and JWST mission control update planetary positions and telescope observations.</p>
                    </div>
                  </div>
                )}
                
                {/* Physical Phenomena Tab */}
                {discoveryTab === 'phenomena' && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-indigo-200/80 mb-2">⚡ Cosmic Physical Phenomena Simulations</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {cosmicPhenomena.map((phen, i) => (
                        <div 
                          key={i} 
                          className={`p-2.5 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${
                            phen.dangerLevel === 'high' ? 'bg-red-900/40 border-red-500/40' :
                            phen.dangerLevel === 'moderate' ? 'bg-orange-900/40 border-orange-500/40' :
                            'bg-blue-900/40 border-blue-500/40'
                          }`}
                          onClick={() => {
                            if (narrationEnabled) speakAsZoe(`${phen.name}. ${phen.description}. Effects include: ${phen.effects.slice(0, 2).join(', ')}.`);
                          }}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-xs font-bold text-white">{phen.name}</p>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${
                              phen.dangerLevel === 'high' ? 'bg-red-500/50 text-red-100' :
                              phen.dangerLevel === 'moderate' ? 'bg-orange-500/50 text-orange-100' :
                              'bg-blue-500/50 text-blue-100'
                            }`}>
                              {phen.dangerLevel.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[10px] text-white/70 mb-1.5">{phen.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {phen.effects.slice(0, 3).map((e, j) => (
                              <span key={j} className="text-[8px] bg-black/40 text-white/60 px-1.5 py-0.5 rounded">{e}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* AR Overlay Info */}
                    <div className="mt-3 p-2 bg-purple-900/30 border border-purple-500/30 rounded-lg">
                      <p className="text-[10px] font-bold text-purple-300 flex items-center gap-1"><Eye className="w-3 h-3" /> AR Overlay Mode</p>
                      <p className="text-[9px] text-purple-200/70">Enable AR on supported devices to project phenomena visualizations into your physical space.</p>
                    </div>
                  </div>
                )}
                
                {/* Black Holes Tab - 400 Million in Milky Way */}
                {discoveryTab === 'blackholes' && (
                  <div className="space-y-3">
                    <p className="text-[10px] text-indigo-200/80 mb-2">🕳️ {blackHolesData.totalEstimate} in Our Galaxy</p>
                    
                    {/* Formation Info */}
                    <div className="p-2 bg-gradient-to-r from-gray-900/80 to-black/80 rounded-lg border border-gray-500/40">
                      <p className="text-[10px] font-bold text-gray-300 mb-1">How Black Holes Form</p>
                      <p className="text-[9px] text-white/70">{blackHolesData.formation}</p>
                    </div>
                    
                    {/* Known Black Holes */}
                    <div className="p-2.5 bg-black/50 rounded-lg border border-purple-500/40">
                      <p className="text-[10px] font-bold text-purple-300 mb-2">🔭 Known Black Holes</p>
                      <div className="space-y-1.5">
                        {blackHolesData.knownBlackHoles.map((bh, i) => (
                          <div 
                            key={i}
                            className="p-2 bg-purple-900/30 rounded cursor-pointer hover:bg-purple-800/40 transition-all"
                            onClick={() => narrationEnabled && speakAsZoe(`${bh.name}. ${bh.description}. Mass: ${bh.mass}, Distance: ${bh.distance}.`)}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-[10px] text-white font-bold">{bh.name}</span>
                              <span className="text-[8px] bg-purple-500/40 text-purple-200 px-1.5 py-0.5 rounded">{bh.type}</span>
                            </div>
                            <p className="text-[9px] text-white/60 mb-1">{bh.description}</p>
                            <div className="flex gap-2 text-[8px]">
                              <span className="text-cyan-300/70">⚖️ {bh.mass}</span>
                              <span className="text-yellow-300/70">📍 {bh.distance}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Black Hole Facts */}
                    <div className="p-2.5 bg-black/40 rounded-lg border border-gray-500/30">
                      <p className="text-[10px] font-bold text-gray-300 mb-1.5">🧠 Fascinating Facts</p>
                      <div className="space-y-1">
                        {blackHolesData.facts.map((fact, i) => (
                          <p key={i} className="text-[9px] text-white/70 pl-2 border-l border-purple-500/50">• {fact}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Meteors & Shooting Stars Tab */}
                {discoveryTab === 'meteors' && (
                  <div className="space-y-3">
                    <p className="text-[10px] text-indigo-200/80 mb-2">☄️ Meteors & Shooting Stars</p>
                    <p className="text-[9px] text-white/60 mb-2">{meteorData.description}</p>
                    
                    {/* Meteor Showers */}
                    <div className="p-2.5 bg-black/40 rounded-lg border border-orange-500/40">
                      <p className="text-[10px] font-bold text-orange-300 mb-2">🌠 Major Meteor Showers</p>
                      <div className="space-y-1.5">
                        {meteorData.showers.map((shower, i) => (
                          <div 
                            key={i}
                            className="p-2 bg-orange-900/30 rounded cursor-pointer hover:bg-orange-800/40 transition-all"
                            onClick={() => narrationEnabled && speakAsZoe(`${shower.name} meteor shower. ${shower.description}. Peak: ${shower.peak}, up to ${shower.rate}. Parent body: ${shower.parent}.`)}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-[10px] text-white font-bold">{shower.name}</span>
                              <span className="text-[8px] bg-orange-500/40 text-orange-200 px-1.5 py-0.5 rounded">{shower.peak}</span>
                            </div>
                            <p className="text-[9px] text-white/60">{shower.description}</p>
                            <div className="flex gap-2 text-[8px] mt-1">
                              <span className="text-yellow-300/70">⭐ {shower.rate}</span>
                              <span className="text-cyan-300/70">🪐 {shower.parent}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Meteor Types */}
                    <div className="p-2.5 bg-black/40 rounded-lg border border-cyan-500/30">
                      <p className="text-[10px] font-bold text-cyan-300 mb-1.5">📖 Meteor Terminology</p>
                      <div className="grid grid-cols-2 gap-1">
                        {meteorData.types.map((type, i) => (
                          <div key={i} className="p-1.5 bg-cyan-900/20 rounded">
                            <span className="text-[9px] text-cyan-200 font-bold">{type.type}:</span>
                            <p className="text-[8px] text-white/60">{type.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Famous Impacts */}
                    <div className="p-2.5 bg-black/40 rounded-lg border border-red-500/30">
                      <p className="text-[10px] font-bold text-red-300 mb-1.5">💥 Famous Impacts</p>
                      <div className="space-y-1">
                        {meteorData.famousImpacts.map((impact, i) => (
                          <div 
                            key={i}
                            className="p-1.5 bg-red-900/20 rounded cursor-pointer hover:bg-red-800/30"
                            onClick={() => narrationEnabled && speakAsZoe(`${impact.name} impact, ${impact.when}. Size: ${impact.size}. ${impact.effect}.`)}
                          >
                            <div className="flex justify-between">
                              <span className="text-[9px] text-white font-bold">{impact.name}</span>
                              <span className="text-[8px] text-red-300/70">{impact.when}</span>
                            </div>
                            <p className="text-[8px] text-white/60">{impact.effect}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Planet Interiors Tab */}
                {discoveryTab === 'interiors' && (
                  <div className="space-y-3">
                    <p className="text-[10px] text-indigo-200/80 mb-2">🌍 Planet Interior Exploration</p>
                    
                    {/* Planet Selector */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {planetInteriors.map((planet, i) => (
                        <Button
                          key={i}
                          size="sm"
                          onClick={() => {
                            if (narrationEnabled) speakAsZoe(`${planet.name} interior. ${planet.uniqueFeature}. It has ${planet.layers.length} main layers.`);
                          }}
                          className="h-6 px-2 text-[9px] bg-gradient-to-r from-blue-900/60 to-cyan-900/60 text-white border border-cyan-500/30 hover:bg-cyan-800/50 rounded"
                        >
                          {planet.name}
                        </Button>
                      ))}
                    </div>
                    
                    {/* Interior Details */}
                    <div className="space-y-2">
                      {planetInteriors.map((planet, idx) => (
                        <div key={idx} className="p-2.5 bg-black/40 rounded-lg border border-blue-500/30">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] font-bold text-blue-300">{planet.name}</p>
                            <span className="text-[8px] bg-blue-500/30 text-blue-200 px-1.5 py-0.5 rounded">{planet.layers.length} Layers</span>
                          </div>
                          <p className="text-[9px] text-yellow-300/80 mb-2">✨ {planet.uniqueFeature}</p>
                          <div className="space-y-1">
                            {planet.layers.map((layer, i) => (
                              <div 
                                key={i}
                                className="p-1.5 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded cursor-pointer hover:from-blue-800/40 hover:to-purple-800/40"
                                onClick={() => narrationEnabled && speakAsZoe(`${planet.name}'s ${layer.name}. ${layer.description}. Temperature: ${layer.temp}. Depth: ${layer.depth}.`)}
                              >
                                <div className="flex justify-between items-start">
                                  <span className="text-[9px] text-white font-bold">{layer.name}</span>
                                  <span className="text-[8px] text-orange-300/70">{layer.temp}</span>
                                </div>
                                <p className="text-[8px] text-white/60">{layer.description}</p>
                                <span className="text-[7px] text-cyan-300/60">Depth: {layer.depth}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* History Tab */}
                {discoveryTab === 'history' && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-indigo-200/80 mb-2">📚 History of Space Exploration Timeline</p>
                    <div className="relative pl-4 border-l-2 border-indigo-500/50 space-y-2">
                      {explorationHistory.map((milestone, i) => (
                        <div 
                          key={i}
                          className={`p-2 rounded-lg cursor-pointer transition-all hover:scale-[1.01] ${
                            milestone.era === 'space-race' ? 'bg-red-900/30 border-l-2 border-red-400' :
                            milestone.era === 'shuttle' ? 'bg-blue-900/30 border-l-2 border-blue-400' :
                            milestone.era === 'modern' ? 'bg-green-900/30 border-l-2 border-green-400' :
                            'bg-cyan-900/30 border-l-2 border-cyan-400'
                          }`}
                          onClick={() => {
                            if (narrationEnabled) speakAsZoe(`${milestone.year}, ${milestone.event}. ${milestone.significance}.`);
                            setCurrentYear(milestone.year);
                          }}
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold text-white bg-black/40 px-1.5 py-0.5 rounded">{milestone.year}</span>
                            <p className="text-xs font-bold text-white">{milestone.event}</p>
                          </div>
                          <p className="text-[10px] text-white/70">{milestone.significance}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Milky Way Context Tab - COMPREHENSIVE */}
                {discoveryTab === 'milkyway' && (
                  <div className="space-y-3">
                    <p className="text-[10px] text-indigo-200/80 mb-2">🌌 Our Solar System in the Milky Way Galaxy</p>
                    
                    {/* Location Card */}
                    <div 
                      className="p-3 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg border border-purple-500/40 cursor-pointer hover:bg-purple-800/40"
                      onClick={() => narrationEnabled && speakAsZoe(`Our solar system is located in the ${milkyWayFacts.solarSystemLocation}. We orbit the galactic center at ${milkyWayFacts.orbitalSpeed}, completing one galactic year in ${milkyWayFacts.orbitalPeriod}.`)}
                    >
                      <p className="text-xs font-bold text-purple-300 flex items-center gap-1 mb-2"><Orbit className="w-3 h-3" /> Solar System Location</p>
                      <p className="text-[10px] text-white/90 mb-1">{milkyWayFacts.solarSystemLocation}</p>
                      <p className="text-[9px] text-cyan-300/80">Galactic Year: {milkyWayFacts.orbitalPeriod}</p>
                      <p className="text-[9px] text-yellow-300/70">Orbital Speed: {milkyWayFacts.orbitalSpeed}</p>
                    </div>
                    
                    {/* Galaxy Statistics */}
                    <div className="p-2.5 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-lg border border-indigo-500/40">
                      <p className="text-[10px] font-bold text-indigo-300 mb-2">📊 Milky Way Statistics</p>
                      <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                        <div className="bg-black/30 p-1.5 rounded"><span className="text-white/50">Type:</span> <span className="text-white">{milkyWayFacts.galaxyStats.type}</span></div>
                        <div className="bg-black/30 p-1.5 rounded"><span className="text-white/50">Age:</span> <span className="text-white">{milkyWayFacts.galaxyStats.age}</span></div>
                        <div className="bg-black/30 p-1.5 rounded"><span className="text-white/50">Diameter:</span> <span className="text-white">{milkyWayFacts.galaxyStats.diameter}</span></div>
                        <div className="bg-black/30 p-1.5 rounded"><span className="text-white/50">Stars:</span> <span className="text-white">{milkyWayFacts.galaxyStats.stars}</span></div>
                        <div className="bg-black/30 p-1.5 rounded"><span className="text-white/50">Mass:</span> <span className="text-white">{milkyWayFacts.galaxyStats.mass}</span></div>
                        <div className="bg-black/30 p-1.5 rounded"><span className="text-white/50">Halo:</span> <span className="text-white">{milkyWayFacts.galaxyStats.halo}</span></div>
                      </div>
                    </div>
                    
                    {/* Galactic Structure */}
                    <div className="p-2.5 bg-black/40 rounded-lg border border-violet-500/30">
                      <p className="text-[10px] font-bold text-violet-300 mb-1.5">🌀 Galactic Structure</p>
                      <div className="space-y-1">
                        {milkyWayFacts.structures.map((struct, i) => (
                          <div 
                            key={i} 
                            className="flex gap-2 p-1.5 bg-violet-900/20 rounded cursor-pointer hover:bg-violet-800/30"
                            onClick={() => narrationEnabled && speakAsZoe(`${struct.name}. ${struct.description}`)}
                          >
                            <span className="text-[9px] text-violet-300 font-bold whitespace-nowrap">{struct.name}:</span>
                            <span className="text-[9px] text-white/70">{struct.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Neighboring Stars */}
                    <div className="p-2.5 bg-black/40 rounded-lg border border-cyan-500/30">
                      <p className="text-[10px] font-bold text-cyan-300 mb-1.5">⭐ Nearest Stars</p>
                      <div className="flex flex-wrap gap-1.5">
                        {milkyWayFacts.localStars.map((star, i) => (
                          <span 
                            key={i} 
                            className="text-[9px] bg-cyan-900/50 text-cyan-200 px-2 py-1 rounded-lg cursor-pointer hover:bg-cyan-700/50"
                            onClick={() => narrationEnabled && speakAsZoe(`${star} is one of our closest stellar neighbors.`)}
                          >{star}</span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Galactic Arms */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-black/40 rounded-lg border border-amber-500/30">
                        <p className="text-[10px] font-bold text-amber-300 mb-1">🌀 Spiral Arms</p>
                        {milkyWayFacts.neighboringArms.map((arm, i) => (
                          <p key={i} className="text-[9px] text-white/70">{arm}</p>
                        ))}
                      </div>
                      <div className="p-2 bg-black/40 rounded-lg border border-red-500/30">
                        <p className="text-[10px] font-bold text-red-300 mb-1">🕳️ Galactic Core</p>
                        <p className="text-[9px] text-white/70">{milkyWayFacts.galacticCore}</p>
                      </div>
                    </div>
                    
                    {/* Interesting Objects */}
                    <div className="p-2.5 bg-black/40 rounded-lg border border-pink-500/30">
                      <p className="text-[10px] font-bold text-pink-300 mb-1.5">✨ Notable Galactic Objects</p>
                      <div className="space-y-1">
                        {milkyWayFacts.interestingObjects.map((obj, i) => (
                          <div 
                            key={i} 
                            className="flex justify-between items-center p-1.5 bg-pink-900/20 rounded cursor-pointer hover:bg-pink-800/30"
                            onClick={() => narrationEnabled && speakAsZoe(`${obj.name}, a ${obj.type}, located ${obj.distance} away.`)}
                          >
                            <span className="text-[9px] text-pink-200 font-bold">{obj.name}</span>
                            <span className="text-[8px] text-white/50">{obj.type}</span>
                            <span className="text-[8px] text-cyan-300/70">{obj.distance}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Local Group */}
                    <div 
                      className="p-2.5 bg-gradient-to-r from-blue-900/40 to-cyan-900/40 rounded-lg border border-blue-500/30 cursor-pointer hover:bg-blue-800/30"
                      onClick={() => narrationEnabled && speakAsZoe(`The Milky Way is part of the ${milkyWayFacts.localGroup.name}. Our nearest large galaxy neighbor is the ${milkyWayFacts.localGroup.majorMembers[0]}. In ${milkyWayFacts.localGroup.andromedaCollision}.`)}
                    >
                      <p className="text-[10px] font-bold text-blue-300 mb-1.5">🌌 Local Group of Galaxies</p>
                      <p className="text-[9px] text-white/80 mb-1">{milkyWayFacts.localGroup.name}</p>
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {milkyWayFacts.localGroup.majorMembers.map((member, i) => (
                          <span key={i} className="text-[8px] bg-blue-900/50 text-blue-200 px-1.5 py-0.5 rounded">{member}</span>
                        ))}
                      </div>
                      <p className="text-[9px] text-orange-300/80">⚠️ Future: {milkyWayFacts.localGroup.andromedaCollision}</p>
                    </div>
                    
                    {/* Voice Command Info */}
                    <div className="p-2 bg-green-900/30 border border-green-500/30 rounded-lg">
                      <p className="text-[10px] font-bold text-green-300 flex items-center gap-1"><Mic className="w-3 h-3" /> Voice Commands</p>
                      <p className="text-[9px] text-green-200/70">"Show Milky Way", "Where are we in the galaxy?", "Nearest stars", "Local Group", "Andromeda collision"</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Soundscape Selector (when active) */}
              {activeSoundscape && (
                <div className="px-3 pb-3">
                  <div className="p-2 bg-black/40 rounded-lg border border-violet-500/30">
                    <p className="text-[10px] font-bold text-violet-300 mb-1.5 flex items-center gap-1"><Radio className="w-3 h-3" /> Cosmic Soundscapes</p>
                    <div className="flex flex-wrap gap-1">
                      {(Object.entries(soundscapeDescriptions) as [SoundscapeType, string][]).map(([type, desc]) => (
                        <Button
                          key={type}
                          size="sm"
                          onClick={() => setActiveSoundscape(type)}
                          className={`h-6 px-2 text-[9px] rounded ${
                            activeSoundscape === type 
                              ? 'bg-violet-500 text-white' 
                              : 'bg-black/30 text-white/60 hover:bg-violet-500/30'
                          }`}
                        >
                          {type.replace('-', ' ')}
                        </Button>
                      ))}
                    </div>
                    <p className="text-[8px] text-white/50 mt-1">{soundscapeDescriptions[activeSoundscape]}</p>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AR-style Coordinates Overlay - Bottom Left, Hidden on small screens */}
      <div className="absolute bottom-20 left-2 z-30 text-[8px] text-cyan-400/50 font-mono hidden md:block bg-black/30 px-1.5 py-0.5 rounded border border-cyan-500/10">
        <p>COORD: 0.00 / 0.00 / {currentYear} | {isPaused ? 'PAUSED' : 'ACTIVE'}</p>
      </div>
    </div>
  );
};
