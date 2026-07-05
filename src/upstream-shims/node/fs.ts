// Browser stub for `node:fs` — wired by vite.config.ts alias.
const NOT_SUPPORTED = () => {
  throw new Error("Node fs API is not available in the browser bundle");
};

export const readFileSync = NOT_SUPPORTED;
export const writeFileSync = NOT_SUPPORTED;
export const existsSync = (): boolean => false;
export const statSync = NOT_SUPPORTED;
export const mkdirSync = NOT_SUPPORTED;
export const readdirSync = (): string[] => [];
export const unlinkSync = NOT_SUPPORTED;
// Best-effort in upstream (wrapped in try/catch); a no-op is the correct browser stub.
export const chmodSync = (): void => {};
// Only reached after statSync (which throws here); return the path unchanged as an identity resolve.
export const realpathSync = (p: string): string => p;
export default {
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  chmodSync,
  realpathSync,
};
