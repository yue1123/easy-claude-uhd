// Browser stub for `node:path` — wired by vite.config.ts alias.
function normalize(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+/g, '/')
}
export const sep = '/'
export const delimiter = ':'
export function join(...parts: string[]): string {
  return normalize(parts.filter(Boolean).join('/'))
}
export function resolve(...parts: string[]): string {
  let stack: string[] = []
  let absolute = false
  for (const part of parts) {
    if (!part) continue
    if (part.startsWith('/')) {
      absolute = true
      stack = []
    }
    for (const seg of part.split('/').filter(Boolean)) {
      if (seg === '.') continue
      if (seg === '..') {
        if (stack.length > 0) stack.pop()
        continue
      }
      stack.push(seg)
    }
  }
  const joined = stack.join('/')
  if (absolute) return '/' + joined
  return joined || '.'
}
export function dirname(p: string): string {
  const n = normalize(p)
  const i = n.lastIndexOf('/')
  if (i < 0) return '.'
  if (i === 0) return '/'
  return n.slice(0, i)
}
export function basename(p: string, ext?: string): string {
  const n = normalize(p)
  const i = n.lastIndexOf('/')
  let name = i >= 0 ? n.slice(i + 1) : n
  if (ext && name.endsWith(ext)) name = name.slice(0, -ext.length)
  return name
}
export function extname(p: string): string {
  const n = basename(p)
  const i = n.lastIndexOf('.')
  return i <= 0 ? '' : n.slice(i)
}
export function relative(from: string, to: string): string {
  const fromParts = normalize(from).split('/').filter(Boolean)
  const toParts = normalize(to).split('/').filter(Boolean)
  let i = 0
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) i++
  const ups = Array(fromParts.length - i).fill('..')
  return [...ups, ...toParts.slice(i)].join('/')
}
export function isAbsolute(p: string): boolean {
  return p.startsWith('/')
}
export default { sep, delimiter, join, resolve, dirname, basename, extname, relative, isAbsolute }
