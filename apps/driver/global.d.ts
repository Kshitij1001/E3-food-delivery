// Allow importing CSS files in TypeScript when used as side-effect imports
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// Allow importing common image types (helpful for Next.js static assets)
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';

export {};
