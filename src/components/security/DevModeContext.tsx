// Stub - DevModeContext removed (M'mora security only)
export const useDevMode = (): any => new Proxy({}, { get: () => false });
export const DevModeProvider = ({ children }: { children: React.ReactNode }) => children;
