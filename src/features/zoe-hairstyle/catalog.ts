// Hair style + color catalog. Seed 60 cuts x 24 colors, expandable.
export interface HairCut { id: string; name: string; gender: 'men' | 'women' | 'unisex'; }

export const MEN_CUTS: HairCut[] = [
  'Classic Taper','Fade Low','Fade Mid','Fade High','Skin Fade','Undercut','Pompadour','Quiff','Slick Back',
  'Comb Over','Crew Cut','Buzz Cut','Ivy League','French Crop','Textured Crop','Caesar','Man Bun','Top Knot',
  'Long Layered','Shaggy','Curly Top Fade','Curly Undercut','Afro','High Top','Waves','Braids','Cornrows',
  'Dreadlocks','Faux Hawk','Mohawk','Bowl Cut','Mullet','Modern Mullet','Business Cut','Side Part',
].map((n, i) => ({ id: `m${i}`, name: n, gender: 'men' as const }));

export const WOMEN_CUTS: HairCut[] = [
  'Long Layers','Beach Waves','Straight Long','Blunt Bob','Angled Bob','Lob (Long Bob)','French Bob',
  'Pixie Cut','Long Pixie','Shag','Modern Shag','Curtain Bangs','Wispy Bangs','Blunt Bangs',
  'Ponytail','High Ponytail','Braided Crown','Fishtail Braid','Half Updo','Messy Bun','Sleek Bun',
  'Space Buns','Cornrows','Box Braids','Twist Out','Wash and Go Curls','Deep Waves','Afro Puff',
  'Layered Curls','Balayage Layers',
].map((n, i) => ({ id: `w${i}`, name: n, gender: 'women' as const }));

export const ALL_CUTS: HairCut[] = [...MEN_CUTS, ...WOMEN_CUTS];

export const HAIR_COLORS: string[] = [
  'Natural Black','Jet Black','Dark Brown','Chocolate Brown','Chestnut','Auburn','Copper Red','Fiery Red',
  'Burgundy','Cherry Red','Honey Blonde','Golden Blonde','Platinum Blonde','Ash Blonde','Strawberry Blonde',
  'Caramel Balayage','Rose Gold','Silver','Ash Grey','Salt & Pepper','Pastel Pink','Vivid Blue','Emerald Green','Lavender Purple',
];
