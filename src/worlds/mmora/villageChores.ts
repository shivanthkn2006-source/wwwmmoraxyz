/**
 * Villager daily chores by local hour, like a farming village day:
 * milking at dawn (06–08) and dusk (17–19), household work (sweeping the doorstep,
 * carrying firewood) mid-morning (09–11) and afternoon (15–17). Other hours: walking the roads.
 * Asleep indoors 22–06 is handled by VillageVillagers.
 */
export type Chore = 'milk' | 'sweep' | 'wood' | null;

/** Cow pastures from VillageAnimals (homes [62,46] and [-60,-46]). */
export const MILK_SPOTS: [number, number][] = [[60.6, 46], [-58.6, -46]];

export function choreFor(villager: number, hour: number): Chore {
  const milker = villager === 1 || villager === 4;
  if (milker && ((hour >= 6 && hour < 8) || (hour >= 17 && hour < 19))) return 'milk';
  if (!milker && villager % 2 === 0 && ((hour >= 9 && hour < 11) || (hour >= 15 && hour < 17))) return 'sweep';
  if (!milker && villager % 2 === 1 && hour >= 9 && hour < 11) return 'wood';
  return null;
}
