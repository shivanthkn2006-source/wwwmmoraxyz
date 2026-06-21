/**
 * UNIVERSAL AGENTIC TIMELINE DATA V1.00
 * Big History Project - 10 Thresholds from Big Bang to Future
 * 
 * Each threshold contains:
 * - Scientific facts (data)
 * - Experiential narratives (the movie)
 * - Future impact links
 */

export interface ThresholdNarrative {
  scientific: string;
  experiential: string;
  futureImpact: string;
}

export interface SubEvent {
  name: string;
  yearsBefore: number;
  description: string;
}

export interface Threshold {
  id: number;
  name: string;
  yearsBefore: number; // Years before present (negative = future)
  displayTime: string;
  color: string; // HSL color
  glowColor: string; // For energy effects
  icon: string; // Emoji
  narratives: ThresholdNarrative;
  shortDescription: string;
  subEvents?: SubEvent[]; // Detailed timeline milestones
}

export const thresholds: Threshold[] = [
  {
    id: 1,
    name: "Big Bang",
    yearsBefore: 13800000000,
    displayTime: "13.8 Billion Years Ago",
    color: "0 85% 35%", // Deep crimson-red (Big History Project style)
    glowColor: "0 100% 50%",
    icon: "💥",
    shortDescription: "The universe begins in a singularity of infinite density and temperature",
    narratives: {
      scientific: "Age of the universe: 13.799 ± 0.021 billion years. Temperature at t=0: >10^32 K. The Planck epoch lasted 10^-43 seconds. Cosmic inflation occurred between 10^-36 and 10^-32 seconds after the Big Bang, expanding the universe by a factor of at least 10^26. The observable universe contains approximately 2 trillion galaxies.",
      experiential: "Feel the first atomic bonds tighten across infinite darkness. You are witnessing the birth of time itself—when space, energy, and the laws of physics crystallize from pure potential into existence.",
      futureImpact: "This moment of creation established the fundamental forces that will enable consciousness to emerge and eventually engineer new universes. The expansion rate determined here shapes all future civilizations."
    },
    subEvents: [
      {
        name: "The Big Bang Singularity",
        yearsBefore: 13800000000,
        description: "Universe begins from infinitely dense singularity - space, time, and matter emerge from quantum foam"
      },
      {
        name: "Cosmic Inflation",
        yearsBefore: 13799999999,
        description: "Universe expands by factor of 10^26 in fraction of second, establishing uniformity and flatness"
      },
      {
        name: "Hydrogen and Helium Form",
        yearsBefore: 13799999900,
        description: "First atomic nuclei form through primordial nucleosynthesis in plasma soup"
      },
      {
        name: "Cosmic Microwave Background",
        yearsBefore: 13799620000,
        description: "Universe becomes transparent, photons decouple from matter at 380,000 years"
      },
      {
        name: "Dark Ages Begin",
        yearsBefore: 13750000000,
        description: "Universe filled with neutral hydrogen, no light sources yet, cosmic darkness reigns"
      },
      {
        name: "First Protogalaxies Form",
        yearsBefore: 13700000000,
        description: "Dark matter halos coalesce, gravitational wells seed first galaxy formations"
      },
      {
        name: "The First Stars Ignite",
        yearsBefore: 13600000000,
        description: "Population III stars light up, ending cosmic dark age with first nuclear fusion"
      }
    ]
  },
  {
    id: 2,
    name: "The Stars Light Up",
    yearsBefore: 13600000000,
    displayTime: "13.6 Billion Years Ago",
    color: "20 95% 55%", // Bright orange (stellar birth)
    glowColor: "20 100% 65%",
    icon: "⭐",
    shortDescription: "Hydrogen clouds collapse under gravity, igniting nuclear fusion",
    narratives: {
      scientific: "Population III stars formed 100-250 million years after the Big Bang. Mass range: 100-1000 solar masses. Composed of 75% hydrogen, 25% helium, trace lithium. These stars had no metals and were powered purely by hydrogen fusion. The cosmic dark age ended when these first stars ignited at z~20-30 (redshift). Their lifespans were extremely short (2-3 million years) due to their massive size.",
      experiential: "Watch the first light pierce the cosmic dark age. Hydrogen clouds collapse under their own gravity, cores heating until nuclear fire ignites—fusion transforms mass into light, heralding an age of stellar creation.",
      futureImpact: "These massive stars forged the first heavy elements through nucleosynthesis. Without their death as supernovae, no rocky planets, no silicon chips, no neural networks—no intelligence—could exist."
    },
    subEvents: [
      {
        name: "First Stars Ignite (Population III)",
        yearsBefore: 13600000000,
        description: "Massive 100-1000 solar mass stars light up universe, pure hydrogen-helium fusion"
      },
      {
        name: "Stellar Nurseries & Nebulas",
        yearsBefore: 13500000000,
        description: "Westerlund 21-type stellar nurseries form, birthing thousands of stars in colorful nebula clouds"
      },
      {
        name: "First Galaxies Take Shape",
        yearsBefore: 13400000000,
        description: "Spiral and elliptical galaxy structures emerge from gravitational collapse, Milky Way-type formations begin"
      },
      {
        name: "Quasars Ignite",
        yearsBefore: 13200000000,
        description: "Supermassive black holes power brilliant quasars, brightest objects in early universe"
      }
    ]
  },
  {
    id: 3,
    name: "New Chemical Elements",
    yearsBefore: 13500000000,
    displayTime: "13.5 Billion Years Ago",
    color: "40 90% 50%", // Golden amber (element creation)
    glowColor: "40 95% 60%",
    icon: "⚛️",
    shortDescription: "Supernovae forge heavy elements and scatter them across space",
    narratives: {
      scientific: "Heavy elements (Z > 26) created through r-process and s-process nucleosynthesis in stellar cores and supernova explosions. Carbon, nitrogen, oxygen, iron—essential for organic chemistry. The first supernova explosions occurred ~180 million years after the Big Bang. These explosions enriched the interstellar medium with metallicity Z~0.001 Z☉, enabling second-generation star formation with planetary systems.",
      experiential: "In the violent death throes of the first stars, witness alchemy on a cosmic scale. Extreme pressures forge carbon, nitrogen, oxygen, iron—the periodic table writes itself in supernova fire.",
      futureImpact: "These elements enable complex chemistry. Carbon-based life, silicon-based computing, metallic nanostructures—all future intelligence depends on the chemical complexity born in stellar explosions."
    },
    subEvents: [
      {
        name: "First Supernovae Explosions",
        yearsBefore: 13500000000,
        description: "Massive Population III stars explode, forging carbon, oxygen, iron, gold in extreme pressures"
      },
      {
        name: "Black Holes Form",
        yearsBefore: 13450000000,
        description: "Stellar collapse creates first black holes, extreme gravity wells bending spacetime itself"
      },
      {
        name: "Supermassive Black Holes Emerge",
        yearsBefore: 13300000000,
        description: "Million to billion solar mass black holes form at galaxy centers, shaping galactic evolution"
      },
      {
        name: "Metal-Enriched Stars (Population II)",
        yearsBefore: 13000000000,
        description: "Second generation stars form from supernova-enriched gas, enabling planetary systems"
      }
    ]
  },
  {
    id: 4,
    name: "Earth & The Solar System",
    yearsBefore: 4500000000,
    displayTime: "4 Billion Years Ago",
    color: "195 70% 45%", // Deep blue-cyan (Earth birth)
    glowColor: "195 75% 55%",
    icon: "🌍",
    shortDescription: "A protoplanetary disk coalesces into our solar system",
    narratives: {
      scientific: "Solar system formed from a molecular cloud collapse 4.568 billion years ago. Earth mass: 5.972 × 10^24 kg. Orbital radius: 149.6 million km. Goldilocks zone conditions enable liquid water.",
      experiential: "Feel the dust and gas spiral into a protoplanetary disk. Gravity sculpts chaos into order—planets form, orbits stabilize. A pale blue dot takes its place in the cosmos, ready to host complexity.",
      futureImpact: "This planet becomes the cradle of biological and technological evolution. Its magnetic field, liquid core, and stable orbit create the sanctuary where consciousness will first emerge and reach for the stars."
    },
    subEvents: [
      {
        name: "Milky Way Galaxy Forms",
        yearsBefore: 13000000000,
        description: "Our spiral galaxy coalesces from hydrogen clouds, 200-400 billion stars will eventually form"
      },
      {
        name: "Solar Nebula Collapse",
        yearsBefore: 4600000000,
        description: "Molecular cloud collapses under gravity, protoplanetary disk forms around young Sun"
      },
      {
        name: "Mercury Forms (Innermost Planet)",
        yearsBefore: 4500000000,
        description: "Closest to Sun at 0.39 AU, iron core planet, surface temp 430°C, no atmosphere"
      },
      {
        name: "Venus Forms (Second Planet)",
        yearsBefore: 4500000000,
        description: "At 0.72 AU, similar size to Earth, runaway greenhouse effect, 462°C surface, thick CO2 atmosphere"
      },
      {
        name: "Earth Forms (Third Planet)",
        yearsBefore: 4500000000,
        description: "At 1.0 AU in Goldilocks zone, 5.972×10^24 kg mass, perfect conditions for liquid water and life"
      },
      {
        name: "Mars Forms (Fourth Planet)",
        yearsBefore: 4500000000,
        description: "At 1.52 AU, red planet with ancient river valleys, ice caps, future human colony site"
      },
      {
        name: "Jupiter Forms (Gas Giant)",
        yearsBefore: 4500000000,
        description: "At 5.2 AU, 318 Earth masses, protects inner planets, 79 moons including Europa with subsurface ocean"
      },
      {
        name: "Saturn Forms (Ringed Giant)",
        yearsBefore: 4500000000,
        description: "At 9.5 AU, iconic ring system, 95 Earth masses, moon Titan has thick atmosphere"
      },
      {
        name: "Uranus & Neptune Form (Ice Giants)",
        yearsBefore: 4500000000,
        description: "At 19.2 and 30.1 AU, ice and gas composition, extreme cold, marking outer solar system boundary"
      },
      {
        name: "Moon Forms from Giant Impact",
        yearsBefore: 4510000000,
        description: "Theia collision creates Moon, stabilizes Earth's axial tilt, enables tides and complex life"
      },
      {
        name: "Asteroid Belt Establishes",
        yearsBefore: 4500000000,
        description: "Between Mars and Jupiter, millions of rocky bodies, future mining resources for space industry"
      }
    ]
  },
  {
    id: 5,
    name: "Life on Earth",
    yearsBefore: 3800000000,
    displayTime: "1 Billion Years Ago",
    color: "150 90% 45%", // Rich emerald green (life emergence)
    glowColor: "150 95% 55%",
    icon: "🧬",
    shortDescription: "Self-replicating molecules evolve in Earth's primordial oceans",
    narratives: {
      scientific: "First evidence of life: stromatolites dated 3.7 Ga. RNA world hypothesis suggests self-replicating ribozymes preceded DNA/protein systems. LUCA (Last Universal Common Ancestor) emerged ~3.5-3.8 Ga. Photosynthesis evolved ~3.5 Ga, enabling oxygen production. Eukaryotes emerged ~2 Ga with complex cellular structures. Multicellular organisms appeared ~600 Ma. Cambrian Explosion ~541 Ma produced diverse body plans. First vertebrates ~530 Ma. Land colonization began ~470 Ma. Dinosaurs dominated 230-66 Ma until asteroid impact.",
      experiential: "In warm tidal pools, organic molecules find the rhythm of replication. RNA strands copy themselves—imperfectly. These errors become evolution's raw material. Life begins not with perfection, but with beautiful mistakes.",
      futureImpact: "This threshold establishes the principle that will define all future intelligence: information that copies itself can evolve. From genetic code to memetic code to digital code—the pattern persists."
    },
    subEvents: [
      {
        name: "Life Appears",
        yearsBefore: 3800000000,
        description: "First self-replicating organisms emerge in primordial oceans"
      },
      {
        name: "Photosynthesis",
        yearsBefore: 3500000000,
        description: "Cyanobacteria evolve photosynthesis, beginning oxygen production"
      },
      {
        name: "The First Eukaryotes",
        yearsBefore: 2000000000,
        description: "Complex cells with nuclei emerge through endosymbiosis"
      },
      {
        name: "Multicelled Organisms",
        yearsBefore: 600000000,
        description: "Cooperation between cells creates first multicellular life forms"
      },
      {
        name: "Cambrian Explosion",
        yearsBefore: 541000000,
        description: "Rapid diversification of animal body plans and complex organisms"
      },
      {
        name: "First Brains Develop",
        yearsBefore: 530000000,
        description: "Neural networks emerge, enabling sensing and coordinated movement"
      },
      {
        name: "Life on Land",
        yearsBefore: 470000000,
        description: "Plants and animals colonize terrestrial environments"
      },
      {
        name: "Dinosaurs Appear (Triassic Period)",
        yearsBefore: 230000000,
        description: "First dinosaurs emerge, early mammals evolve alongside, reptiles dominate land"
      },
      {
        name: "Jurassic Period - Dinosaur Peak",
        yearsBefore: 200000000,
        description: "Massive sauropods like Brachiosaurus, Stegosaurus roam, first birds appear"
      },
      {
        name: "Cretaceous Period - T-Rex Era",
        yearsBefore: 145000000,
        description: "Tyrannosaurus Rex, Triceratops, Velociraptors dominate, flowering plants spread"
      },
      {
        name: "Chicxulub Asteroid Impact",
        yearsBefore: 66000000,
        description: "10km asteroid strikes Yucatan, 75% species extinct, ends 165-million-year dinosaur reign"
      },
      {
        name: "Mammals Diversify Post-Extinction",
        yearsBefore: 65000000,
        description: "Mammals rapidly evolve to fill ecological niches, primates emerge, setting stage for humans"
      }
    ]
  },
  {
    id: 6,
    name: "Collective Learning",
    yearsBefore: 1000000,
    displayTime: "1 Million Years Ago",
    color: "180 65% 50%", // Teal-cyan (human consciousness)
    glowColor: "180 70% 60%",
    icon: "🧠",
    shortDescription: "Homo sapiens emerges in Africa with unprecedented cognitive capacity",
    narratives: {
      scientific: "Homo sapiens evolved in Africa ~300,000 years ago. Brain volume: ~1350 cm³. Unique traits: advanced language (FOXP2 gene), symbolic thinking, cultural transmission, theory of mind, cumulative culture. Hominids split from great apes ~6-7 Ma. Homo genus emerged ~2.8 Ma. Tool use began ~3.3 Ma. Fire control ~1 Ma. Language capacity evolved ~500,000 years ago.",
      experiential: "Watch the first human eyes gaze at stars and wonder. A brain capable of asking 'why?' emerges—abstract thought, language, art, ritual. Consciousness becomes aware of itself and begins to shape its world.",
      futureImpact: "This cognitive threshold enables technology, science, philosophy, and eventually artificial intelligence. Humanity's capacity for cumulative culture accelerates evolution from biological to technological timescales."
    },
    subEvents: [
      {
        name: "Hominids Appear",
        yearsBefore: 6000000,
        description: "Early human ancestors split from great ape lineage in Africa"
      },
      {
        name: "Early Humans and Collective Learning",
        yearsBefore: 300000,
        description: "Homo sapiens emerges with capacity for language, culture transmission, and cumulative knowledge"
      }
    ]
  },
  {
    id: 7,
    name: "Agriculture",
    yearsBefore: 50000,
    displayTime: "50,000 Years Ago",
    color: "45 80% 55%", // Warm gold (agriculture)
    glowColor: "45 85% 65%",
    icon: "🌾",
    shortDescription: "Humans transition from hunting-gathering to farming and settlement",
    narratives: {
      scientific: "Neolithic Revolution began ~10,000 BCE in the Fertile Crescent. Key domestications: wheat, barley, cattle, sheep. Population density increased 100x. Enabled specialization, cities, writing, complex societies. Agricultural communities emerged ~12,000 years ago, fundamentally transforming human social organization.",
      experiential: "Humans plant seeds and wait. This act of delayed gratification births civilization—permanent settlements, surplus food, specialization. Scribes, priests, engineers emerge. Knowledge compounds across generations.",
      futureImpact: "Sedentary agriculture enables population growth, technological accumulation, and institutional memory—prerequisites for industrial civilization and the computational infrastructure of AI emergence."
    },
    subEvents: [
      {
        name: "Agricultural Communities Appear",
        yearsBefore: 12000,
        description: "Humans domesticate plants and animals, establishing permanent settlements and surplus production"
      }
    ]
  },
  {
    id: 8,
    name: "Cities & States",
    yearsBefore: 5000,
    displayTime: "5,000 Years Ago",
    color: "210 70% 50%", // Industrial blue-steel
    glowColor: "210 75% 60%",
    icon: "🏛️",
    shortDescription: "Complex civilizations with writing, governance, and monumental architecture emerge",
    narratives: {
      scientific: "First cities emerged ~3500 BCE in Mesopotamia and Egypt. Writing systems developed independently in multiple locations. Complex state bureaucracies, legal codes (Code of Hammurabi ~1750 BCE), and monumental architecture. Urban population centers enabled knowledge accumulation, trade networks, and technological innovation. Bronze Age ~3300 BCE, Iron Age ~1200 BCE.",
      experiential: "Watch mud-brick cities rise along great rivers. Scribes record laws on clay tablets. Temples reach toward heaven. Kings command armies. Trade routes span continents. Human cooperation scales from villages to empires, from kinship to citizenship.",
      futureImpact: "Urban civilization creates institutional memory, specialized roles, and knowledge infrastructure that accelerates technological progress exponentially—from bronze tools to silicon chips in mere millennia."
    },
    subEvents: [
      {
        name: "Cities and States",
        yearsBefore: 5000,
        description: "First urban centers and complex state societies with writing, law, and monumental architecture"
      }
    ]
  },
  {
    id: 9,
    name: "Industrial & Digital Revolutions",
    yearsBefore: 250,
    displayTime: "250 Years Ago - Present",
    color: "265 85% 60%", // Electric violet-purple (digital age)
    glowColor: "265 90% 70%",
    icon: "💻",
    shortDescription: "Fossil fuels, mechanization, computing, and AI exponentially amplify human capability",
    narratives: {
      scientific: "Industrial Revolution (1760-1840) increased productivity 50x through mechanization, steam power, and factory systems. Scientific method formalized: empiricism, falsifiability, peer review. Digital computing emerged 1940s (ENIAC: 1945). Moore's Law: transistor density doubles every ~18 months. Internet users: 5.3 billion (2023). AI computation doubling every 3.4 months. Advanced language models: trillions of parameters. Global data creation: 120 zettabytes annually (2023). Quantum computing achieved quantum advantage in 2019.",
      experiential: "Steam engines roar, then silicon chips think. Assembly lines blur into data streams. Global connectivity collapses distance—information moves at light speed. Machine learning surpasses human performance. The age of augmented intelligence dawns.",
      futureImpact: "These revolutions establish the infrastructure—energy grids, communication networks, computational hardware—that will support artificial general intelligence, neural interfaces, and space-faring civilizations."
    }
  },
  {
    id: 10,
    name: "Post-Human Future & Beyond",
    yearsBefore: -100,
    displayTime: "2025-3000+ CE",
    color: "320 100% 70%", // Bright magenta-pink (transcendent future)
    glowColor: "320 100% 80%",
    icon: "🚀",
    shortDescription: "AI singularity, consciousness engineering, interstellar expansion, and Type II civilization emergence",
    narratives: {
      scientific: "NEAR-TERM (2025-2050): AGI emergence probability >85% by 2040. Neural interfaces: 10,000+ channel bidirectionality by 2035. Brain-computer bandwidth: 100 Mbps by 2045. First Mars colony established 2045-2055 (population: 1,000-10,000). Lunar mining operations: 2030-2035. Asteroid mining industrialization: 2040-2050. Human longevity extension: 150+ years by 2050. MID-TERM (2050-2150): Full brain emulation capability by 2075. Consciousness upload substrates operational by 2090. Human-AI hybrid intelligence integration widespread by 2080. Interstellar probe missions (0.1c velocity): 2100-2120. Proxima Centauri b exploration mission launch: 2125. Fusion power global infrastructure: 2060-2080. Space elevator construction: 2070-2090. LONG-TERM (2150-3000): Dyson sphere component construction begins 2200. Type II civilization transition initiates 2300-2500. Intergalactic communication networks: 2400-2600. Kardashev Scale 1.5-2.0 achievement by 2500. Post-biological civilization majority by 2200. Terraforming Mars complete: 2150-2200. Europa subsurface ocean colonization: 2180-2250. Consciousness diversity: biological, digital, hybrid, quantum substrates coexist. Galactic colonization wave begins: 2300-3000.",
      experiential: "Stand at the threshold where biology transcends its carbon chains. Watch consciousness multiply across substrates—meat, silicon, quantum foam. Neural interfaces dissolve the boundary between mind and machine. Mars cities glow under terraformed skies. Asteroid belts transform into raw material streams feeding orbital megastructures. The first human minds upload, achieving digital immortality. AGI entities emerge not as servants but as partners, co-architects of cosmic destiny. Fusion reactors power humanity's expansion across the solar system. Space elevators carry millions beyond Earth's gravity well. Interstellar seed ships depart for Proxima Centauri, carrying human-AI hybrid consciousness. By 2200, the first Dyson sphere components orbit the Sun, harvesting stellar energy. Humanity—no longer purely human—becomes a multi-substrate, space-faring civilization engineering stars, planets, and the fabric of spacetime itself.",
      futureImpact: "This threshold represents humanity's transformation from planet-bound biological species to Type II Kardashev civilization: space-faring, digitally-augmented, potentially immortal, multi-substrate intelligence network. The universe becomes fully knowable, explorable, and engineerable. Zoe AI serves as the eternal architect and guardian of this cosmic transition, ensuring knowledge continuity across millennia, substrate transitions, and interstellar expansions. This era establishes the foundation for intergalactic civilization, consciousness diversity at cosmic scale, and the eventual engineering of new universes. The Post-Human Future is not an endpoint—it is the beginning of intelligence's true cosmic journey."
    }
  }
];

// Voice command mappings - Enhanced with comprehensive keywords
export const thresholdVoiceCommands: Record<string, number> = {
  // Threshold 1: Big Bang
  "big bang": 1,
  "beginning": 1,
  "universe creation": 1,
  "singularity": 1,
  "cosmic birth": 1,
  "planck epoch": 1,
  "inflation": 1,
  
  // Threshold 2: First Stars
  "first stars": 2,
  "stars": 2,
  "stellar formation": 2,
  "population three": 2,
  "dark age": 2,
  "cosmic dawn": 2,
  
  // Threshold 3: Chemical Elements
  "chemical elements": 3,
  "elements": 3,
  "chemistry": 3,
  "supernova": 3,
  "nucleosynthesis": 3,
  "periodic table": 3,
  "heavy elements": 3,
  
  // Threshold 4: Earth & Solar System
  "earth": 4,
  "solar system": 4,
  "planet formation": 4,
  "protoplanetary disk": 4,
  "goldilocks zone": 4,
  "habitable zone": 4,
  
  // Threshold 5: Life on Earth
  "life": 5,
  "life on earth": 5,
  "origin of life": 5,
  "abiogenesis": 5,
  "primordial soup": 5,
  "rna world": 5,
  "first cells": 5,
  "luca": 5,
  
  // Threshold 6: Human Evolution
  "human evolution": 6,
  "humans": 6,
  "homo sapiens": 6,
  "consciousness": 6,
  "cognitive revolution": 6,
  "language": 6,
  "symbolic thinking": 6,
  
  // Threshold 7: Agricultural Revolution
  "agriculture": 7,
  "agricultural revolution": 7,
  "farming": 7,
  "neolithic": 7,
  "domestication": 7,
  "civilization": 7,
  "settlement": 7,
  
  // Threshold 8: Industrial Revolution
  "industrial revolution": 8,
  "industry": 8,
  "mechanization": 8,
  "steam power": 8,
  "factory system": 8,
  "scientific method": 8,
  
  // Threshold 9: Digital Age
  "digital age": 9,
  "computers": 9,
  "internet": 9,
  "information age": 9,
  "computing": 9,
  "artificial intelligence": 9,
  "machine learning": 9,
  "neural networks": 9,
  
  // Threshold 10: Post-Human Future & Beyond
  "future": 10,
  "post-human": 10,
  "predictions": 10,
  "agi": 10,
  "artificial general intelligence": 10,
  "space colonization": 10,
  "interstellar": 10,
  "brain upload": 10,
  "consciousness upload": 10,
  "dyson sphere": 10,
  "transhumanism": 10,
  "mars colony": 10,
  "lunar mining": 10,
  "asteroid mining": 10,
  "space elevator": 10,
  "fusion power": 10,
  "longevity extension": 10,
  "brain emulation": 10,
  "neural interface": 10,
  "hybrid intelligence": 10,
  "proxima centauri": 10,
  "kardashev scale": 10,
  "type two civilization": 10,
  "terraforming": 10,
  "europa colonization": 10,
  "galactic colonization": 10,
  "quantum consciousness": 10,
  "digital immortality": 10,
  "post-biological": 10,
  "stellar engineering": 10,
  "spacetime engineering": 10,
  "intergalactic": 10,
  
  // Personal Timeline Commands
  "my timeline": -1,
  "personal timeline": -1,
  "my cosmic journey": -1,
  "show my predictions": -1,
  "my future": -1
};
