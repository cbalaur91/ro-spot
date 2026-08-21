/// <reference types="nativewind/types" />

// Metro turns the Tailwind entrypoint into styles; TypeScript only needs to know
// the side-effect import resolves.
declare module '*.css';
