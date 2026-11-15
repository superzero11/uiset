// The tool an agent calls in a benchmark run (through its shell):
//
//   node bench/cli.mjs <run> <command> ['<json>']
//
// Browser runs: snapshot | click {"role","name"} | fill {"role","name","text"} |
//               press {"key"} | select {"role","name","value"} | check-box {"role","name"}
// Bridge runs:  snapshot | act {"steps":[…]} | query {"within","text","kind"}

const [run, command, json = "{}"] = process.argv.slice(2)
if (!run || !command) {
  console.log("Usage: node bench/cli.mjs <run> <command> ['<json>']")
  process.exit(1)
}
const port = process.env.BENCH_PORT ?? 5697
const res = await fetch(`http://localhost:${port}/${run}/${command}`, { method: "POST", body: json })
console.log(await res.text())
