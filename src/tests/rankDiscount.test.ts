import { getRankPercent } from '../lib/rank'

const cases: Array<[string, number]> = [
  ['newbie', 0],
  ['dong', 1],
  ['sat', 2],
  ['vang', 3],
  ['luc_bao', 4],
  ['kim_cuong', 5],
]

function run() {
  const results = cases.map(([rank, expected]) => {
    const actual = getRankPercent(rank as any)
    return { rank, expected, actual, pass: actual === expected }
  })
  const allPass = results.every(r => r.pass)
  console.log(JSON.stringify({ results, allPass }, null, 2))
}

run()
