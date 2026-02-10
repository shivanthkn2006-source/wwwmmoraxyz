// Stub - GodModeSovereignProvider removed (M'mora security only)
export const useGodModeSovereign = (): any => new Proxy({}, { get: () => false });
export const GodModeSovereignProvider = ({ children }: { children: React.ReactNode }) => children;
