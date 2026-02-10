// Stub - GlobalMediaContext removed (M'mora only)
export const useGlobalMediaSafe = (): any => new Proxy({}, { get: () => null });
export const GlobalMediaProvider = ({ children }: { children: React.ReactNode }) => children;
