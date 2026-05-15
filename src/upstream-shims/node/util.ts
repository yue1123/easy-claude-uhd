// Browser stub for `node:util` — wired by vite.config.ts alias.
const NOT_SUPPORTED = () => {
  throw new Error('Node util.promisify is not available in the browser bundle')
}
export const promisify: typeof NOT_SUPPORTED = NOT_SUPPORTED
export const inspect = (v: unknown): string => String(v)
export default { promisify, inspect }
