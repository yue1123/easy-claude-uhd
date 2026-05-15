// Browser stub for `node:os` — wired by vite.config.ts alias.
export function homedir(): string {
  return '/'
}
export function tmpdir(): string {
  return '/tmp'
}
export function platform(): string {
  return 'browser'
}
// Browser cannot report system memory; return safe sentinels.
export function totalmem(): number {
  return Number.MAX_SAFE_INTEGER
}
export function freemem(): number {
  return 0
}
export const EOL = '\n'
export default { homedir, tmpdir, platform, totalmem, freemem, EOL }
