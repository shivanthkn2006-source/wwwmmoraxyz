/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

declare module '*.glb' {
  const src: string;
  export default src;
}

declare module '*.usdz' {
  const src: string;
  export default src;
}

declare module '*.fbx' {
  const src: string;
  export default src;
}

