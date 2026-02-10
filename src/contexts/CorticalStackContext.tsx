// Stub - CorticalStackContext removed (M'mora only)
import React, { createContext, useContext } from 'react';

const CorticalStackContext = createContext<any>(null);

export const CorticalStackProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const useCorticalStack = (): any => new Proxy({}, { get: () => () => {} });

export default CorticalStackContext;
