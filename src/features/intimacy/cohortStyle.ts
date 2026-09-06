/**
 * Cohort presentation tokens.
 *
 * The same content, presented at the density and rhythm each generation
 * actually reads comfortably. Only spacing, radius and type-scale change —
 * never the content, never the colour system (all tokens stay semantic).
 */
import type { AgeCohort } from './generationalTone';

export interface CohortStyle {
  /** Masonry column count at md+ breakpoints. */
  columnsClass: string;
  cardClass: string;
  titleClass: string;
  bodyClass: string;
  gapClass: string;
  label: string;
}

const STYLES: Record<AgeCohort, CohortStyle> = {
  genz: {
    columnsClass: 'columns-2 md:columns-3 xl:columns-4',
    cardClass: 'rounded-2xl p-4',
    titleClass: 'text-sm font-semibold tracking-tight',
    bodyClass: 'text-xs leading-relaxed',
    gapClass: 'gap-3',
    label: 'Dense scrapbook',
  },
  millennial: {
    columnsClass: 'columns-1 sm:columns-2 xl:columns-3',
    cardClass: 'rounded-xl p-5',
    titleClass: 'text-base font-medium',
    bodyClass: 'text-sm leading-relaxed',
    gapClass: 'gap-4',
    label: 'Balanced',
  },
  genx: {
    columnsClass: 'columns-1 md:columns-2',
    cardClass: 'rounded-lg p-5',
    titleClass: 'text-base font-semibold',
    bodyClass: 'text-sm leading-7',
    gapClass: 'gap-4',
    label: 'Plain and roomy',
  },
  boomer: {
    columnsClass: 'columns-1 lg:columns-2',
    cardClass: 'rounded-lg p-6',
    titleClass: 'text-lg font-semibold',
    bodyClass: 'text-base leading-8',
    gapClass: 'gap-6',
    label: 'Large and legible',
  },
  unspecified: {
    columnsClass: 'columns-1 sm:columns-2 xl:columns-3',
    cardClass: 'rounded-xl p-5',
    titleClass: 'text-base font-medium',
    bodyClass: 'text-sm leading-relaxed',
    gapClass: 'gap-4',
    label: 'Default',
  },
};

export function cohortStyle(cohort: AgeCohort): CohortStyle {
  return STYLES[cohort] ?? STYLES.unspecified;
}
