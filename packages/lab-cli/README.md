# `@acoyfellow/lab-cli`

Minimal CLI for [Lab](https://github.com/acoyfellow/lab). Agents shell out, get traces back.

## Install

```bash
npm install -g @acoyfellow/lab-cli
```

## Usage

```bash
# Run JS in a single isolate
lab run 'return 1 + 1'

# Run a multi-step chain
lab chain '[{"body":"return [1,2,3]","capabilities":[]},{"body":"return input.map(n=>n*2)","capabilities":[]}]'

# Spawn nested isolates
lab spawn 'const a = await spawn("return 10", []); return a'

# AI generates code from a prompt, then runs it
lab generate 'Sum the numbers 1 to 10'

# Fetch a stored trace
lab trace abc123

# Seed demo KV data
lab seed
```

Every command prints JSON to stdout. Every run includes a `traceId` pointing to the permanent trace.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `LAB_URL` | `http://localhost:1337` | Lab Worker origin |

## For agents

An agent shells out to `lab`, reads the JSON result, and uses the `traceId` as proof of execution:

```bash
result=$(lab chain '[{"body":"return 42","capabilities":[]}]')
traceId=$(echo "$result" | jq -r '.traceId')
# traceId is now a permanent, inspectable artifact
```

Or from a script:

```bash
lab run 'return { computed: Math.pow(2, 32) }' | jq '.result'
```

## Built with Effect

Internals use [Effect v4](https://effect.website/) for structured error handling. The CLI interface is just stdin/stdout — Effect stays inside.

## License

MIT
