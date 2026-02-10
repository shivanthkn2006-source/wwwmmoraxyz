// Stub - VelvetRopeContext removed (M'mora only)
export const useVelvetRopeOptional = () => null;
export const useVelvetRope = () => ({
  selectedIntent: null,
  hasSelectedIntent: false,
  mvdScore: { isBasicComplete: false, score: 0 },
  isProfileComplete: false,
  loadedModules: new Set<string>(),
  showIntentSelector: false,
  showProfileGate: false,
  setIntent: () => {},
  clearIntent: () => {},
  shouldLoadModule: () => true,
  dismissIntentSelector: () => {},
  refreshMVD: async () => {},
});
export const VelvetRopeProvider = ({ children }: { children: React.ReactNode }) => children;
