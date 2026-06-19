/**
 * Logger — dev-only console wrapper.
 *
 * In production builds (import.meta.env.DEV === false), every method is a
 * no-op so Vite's tree-shaker eliminates the console calls entirely.
 * In development, messages pass through to the browser console as normal.
 *
 * Usage:  logger.log(...)  /  logger.warn(...)  /  logger.error(...)
 * Replace:  console.log(...)  /  console.warn(...)  /  console.error(...)
 */

const isDev = import.meta.env.DEV;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LogArgs = any[];

export const logger = {
  log:   (...args: LogArgs): void => { if (isDev) console.log(...args);   },
  warn:  (...args: LogArgs): void => { if (isDev) console.warn(...args);  },
  error: (...args: LogArgs): void => { if (isDev) console.error(...args); },
};
