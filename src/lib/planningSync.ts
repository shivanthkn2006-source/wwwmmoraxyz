export const PLANNING_SYNC_EVENT = 'mmora-planning-sync';

export type PlanningSyncSource = 'planner' | 'reminders';

export const notifyPlanningChanged = (source: PlanningSyncSource) => {
  window.dispatchEvent(new CustomEvent(PLANNING_SYNC_EVENT, { detail: { source } }));
};