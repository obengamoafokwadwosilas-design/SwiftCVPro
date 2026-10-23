// What makes a 4-digit access code acceptable. Shared so the browser can warn
// while typing, but the server always runs it again and is the only judge.
// There are only 10,000 codes; the lockouts make guessing slow, and refusing
// the ones people pick first (repeats, runs, patterns, years, common PINs)
// removes the guesses an attacker would try first.

const COMMON = new Set([
  '1004', '2580', '0852', '1010', '2020', '6969', '1313', '7007', '1001', '2002',
  '0007', '0123', '9876', '1590', '0911', '1123', '4545', '5683', '1478', '3698',
])

export function accessCodeProblem(code: string): string | null {
  if (!/^\d{4}$/.test(code)) return 'Use exactly 4 digits.'
  const d = code.split('').map(Number)
  const easy = 'Too easy to guess — try a less obvious code.'
  if (d.every(x => x === d[0])) return easy                                 // 1111
  if (d.every((x, i) => i === 0 || x === d[i - 1] + 1)) return easy         // 1234
  if (d.every((x, i) => i === 0 || x === d[i - 1] - 1)) return easy         // 4321
  if (code.slice(0, 2) === code.slice(2)) return easy                       // 1212
  if (d[0] === d[1] && d[2] === d[3]) return easy                           // 1122
  if (d[0] === d[3] && d[1] === d[2]) return easy                           // 1221
  const year = Number(code)
  if (year >= 1950 && year <= 2030) return easy                             // birth / current years
  if (COMMON.has(code)) return easy
  return null
}
