// Browser stub for `node:readline` — wired by vite.config.ts alias.
const NOT_SUPPORTED = () => {
  throw new Error('Node readline is not available in the browser bundle')
}
export const createInterface = NOT_SUPPORTED
export default { createInterface }
