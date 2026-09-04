import { buildAstroGroundingBlock } from './supabase/functions/_shared/astro-grounding.ts';
const b = await buildAstroGroundingBlock({ birth_date:'1994-05-12', birth_time:'07:20', birth_timezone:'Asia/Kolkata', birth_latitude:12.9716, birth_longitude:77.5946 });
console.log(b.slice(0, 2600));
