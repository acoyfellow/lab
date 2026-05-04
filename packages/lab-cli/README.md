# `@acoyfellow/lab-cli`

Minimal CLI for [Lab](https://github.com/acoyfellow/lab). Agents shell out, run real work against real repo state, and get receipts back.

## Install

```bash
npm install -g @acoyfellow/lab-cli
```

## Usage

```bash
# Run a real command in a real local git repo
lab repo-run --repo . -- sh -lc 'bun test'

# Snapshot dirty work to a lab/run-* branch before running
lab repo-run --repo . --snapshot -- sh -lc 'bun test'

# List recent repo runs
lab runs --repo .

# Show one run, including logs and receipt
lab show run_YYYYMMDDHHMMSS_abcdef --repo .

# Replay one run and link the new receipt to the parent
lab replay run_YYYYMMDDHHMMSS_abcdef --repo .

# Run against Cloudflare Artifacts
lab repo-run \
  --artifacts default/my-repo \
  --branch main \
  --account-id "$CLOUDFLARE_ACCOUNT_ID" \
  --token "$CLOUDFLARE_ARTIFACTS_REPO_TOKEN" \
  -- sh -lc 'bun test'

# Run JS in a single isolate
lab run 'return 1 + 1'

# Run a multi-step chain
lab chain '[{"body":"return [1,2,3]","capabilities":[]},{"body":"return input.map(n=>n*2)","capabilities":[]}]'

# Spawn nested isolates
lab spawn 'const a = await spawn("return 10", []); return a'

# AI generates code from a prompt, then runs it
lab generate 'Sum the numbers 1 to 10'

# Fetch saved-result JSON
lab result abc123

# Seed demo KV data
lab seed
```

Every command prints JSON to stdout. Repo runs write `.lab/runs/<run_id>/input.json`, `logs.txt`, `result.json`, and `receipt.json`.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `LAB_URL` | `http://localhost:5173` | Public Lab app origin |
| `CLOUDFLARE_ACCOUNT_ID` | | Cloudflare account for `--artifacts` runs |
| `CLOUDFLARE_PERSONAL_ACCOUNT_ID` | | Preferred personal account override |
| `CLOUDFLARE_ARTIFACTS_REPO_TOKEN` | | Repo-scoped `art_v1_*` token for Artifacts git clone |
| `CLOUDFLARE_ARTIFACTS_TOKEN` | | Alternate repo token env var |

Artifacts repo create/delete gates use `CLOUDFLARE_ACCOUNT_ID` plus `CLOUDFLARE_API_TOKEN` scoped to the same account with `Account > Artifacts:Read` and `Account > Artifacts:Edit`. Repo runs that clone Git content use repo-scoped `art_v1_*` tokens.

## For agents

An agent shells out to `lab`, reads the JSON result, and uses the `resultId` as proof of execution:

```bash
result=$(lab chain '[{"body":"return 42","capabilities":[]}]')
resultId=$(echo "$result" | jq -r '.resultId')
# resultId is now an inspectable saved-result identifier
```

For repo work, the receipt itself is the proof:

```bash
run=$(lab repo-run --repo . -- sh -lc 'bun test')
runId=$(echo "$run" | jq -r '.id')
lab show "$runId" --repo . | jq '.receipt'
```

Or from a script:

```bash
lab run 'return { computed: Math.pow(2, 32) }' | jq '.result'
```

## License

MIT
