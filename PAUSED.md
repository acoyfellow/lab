# Lab Pause Note

Date: 2026-04-29

Lab should pause as a product direction.

The strongest version of the idea is not a hosted receipt platform yet. The next proof should be a much smaller repo-actor loop:

1. A shell script opens a repo.
2. It feeds a prompt and policy to headless `pi`.
3. `pi` works directly against the filesystem.
4. The run captures `pi export`, command output, changed files, and verification.
5. A local receipt is written back to the repo or posted to GitHub/GitLab.

Why pause Lab:

- `pi export` already provides the native trace for Pi work.
- Lab only becomes valuable after multiple systems need one cross-system receipt index.
- The current repo is drifting beyond the seven-minute rule by mixing receipt ledger, sandbox runtime, MCP surface, docs, examples, and repo-actor ideas.
- The immediate product proof is "repos are actors," not "Lab is a platform."

Useful work from this branch:

- Sessions, receipts, and summaries clarified the right handoff shape.
- Parallel dogfood exposed and fixed a real concurrent session receipt indexing bug.
- The conclusion is sharper now: receipts are useful, but a separate service must be earned by first proving local repo actors.

Recommended next step:

Create a tiny `repo-actor` prototype outside Lab with one script, one policy prompt, and local receipts. If local receipts become painful to search, share, or stitch across systems, revive Lab as the hosted index/viewer.
