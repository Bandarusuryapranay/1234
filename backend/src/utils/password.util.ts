import { v4 as uuid } from 'uuid'

export function generateTempPassword(): string {
  const base   = uuid().replace(/-/g, '').slice(0, 10)
  const upper  = base.slice(0, 1).toUpperCase()
  const number = Math.floor(Math.random() * 90 + 10)
  return `${upper}${base.slice(1)}${number}!`
}
