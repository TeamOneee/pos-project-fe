/**
 * The root layout imports global.css for its side effect — Metro turns it into
 * the NativeWind style registry. TypeScript needs to be told it is a module.
 */
declare module '*.css';
