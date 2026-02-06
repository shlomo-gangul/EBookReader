/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Vite Web Worker import types
declare module '*?worker' {
  const WorkerFactory: {
    new (): Worker;
  };
  export default WorkerFactory;
}
