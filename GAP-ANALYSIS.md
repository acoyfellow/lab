# Lab Gap Analysis

**Current State:** Working product at lab.coey.dev  
**Target State:** Infrastructure for accountable agents with proof, healing, and team workflows

---

## What's Working (Current)

| Feature | Status | Location |
|---------|--------|----------|
| Trace-first architecture | ✅ | `worker/index.ts`, `results/[id]/+page.svelte` |
| 5 execution modes | ✅ | `/run`, `/run/kv`, `/run/chain`, `/run/spawn`, `/run/generate` |
| Shareable result URLs | ✅ | `/results/:id` (viewer), `/results/:id.json` (API) |
| Fork from trace | ✅ | `sessionStorage` lab-fork in compose |
| Capability model | ✅ | `worker/capabilities/` |
| MCP integration | ✅ | `packages/lab-mcp/` |
| Compose UI | ✅ | `src/routes/compose/+page.svelte` |
| Homepage with patterns | ✅ | `src/routes/+page.svelte` |
| Effect-based worker | ✅ | `worker/index.ts` |

---

## What's Missing (Gaps from Discussion)

### Gap 1: Self-Healing Loop

**Current:** Agent gets error, human must intervene  
**Target:** Agent diagnoses itself, proposes fix, verifies

```typescript
// Missing API
lab.diagnose(traceId)        // Analyze failure, return structured diagnosis
lab.proposeFix(diagnosis)    // Suggest code or capability change
lab.verifyFix(proposal)      // Run fix, return new trace
lab.compare(a, b)            // Diff two traces
```

**Implementation notes:**
- Leverage existing Effect patterns in worker
- Add new routes: `/diagnose`, `/propose`, `/verify`, `/compare`
- Use LLM for diagnosis analysis (workers AI binding)

---

### Gap 2: Story Composition

**Current:** Single traces only  
**Target:** Multiple traces compose into narratives

```typescript
// Missing API
lab.createStory({ title, traceIds })  // Compose traces into story
lab.forkStory(storyId, chapterIndex)  // Branch from point in story
lab.requestReview(storyId, { reviewers, deadline })
```

**Implementation notes:**
- New D1 table: `stories(id, title, chapters[], status)`
- New routes: `/stories/:id`, `/stories/:id/fork`
- UI: Story viewer with chapter navigation

---

### Gap 3: Human Review Workflows

**Current:** Traces are viewable but no approval process  
**Target:** Require human approval before destructive actions

```typescript
// Missing workflow
const trace = await lab.run({ code, capabilities: ["dns:delete"] });
await lab.requestReview(trace.id, {
  reviewers: ["ops@company.com"],
  deadline: "1h",
  required: true  // Block until approved
});
// Agent waits: await lab.waitForApproval(trace.id)
```

**Implementation notes:**
- New D1 table: `reviews(id, traceId, reviewers[], status)`
- Email notifications via Cloudflare Email Routing
- UI: Review queue, approve/reject buttons

---

### Gap 4: CloudEval Integration

**Current:** Manual testing  
**Target:** Systematic regression detection

```typescript
// Missing integration
const evalRun = await cloudeval.run({
  dataset: "agent-quality",
  agent: "my-agent-v1.2",
  lab: { capture: true }  // Every eval case produces trace
});

// Compare to baseline
const comparison = await lab.compare(baselineTraceId, newTraceId);
if (comparison.divergence > 0.1) {
  await lab.requestReview(await lab.createStory({
    title: `Regression detected`,
    traceIds: [baselineTraceId, newTraceId]
  }));
}
```

**Implementation notes:**
- Separate package or integration guide
- Export eval results to Lab stories
- Dashboard for regression tracking

---

### Gap 5: 7-Minute README Structure

**Current:** README is good but dense  
**Target:** Diataxis framework for different learning paths

| Current | Target | Status |
|---------|--------|--------|
| Mixed tutorial/reference | Split by purpose | ❌ |
| One long README | Tutorial + How-To + Explanation + Reference | ❌ |
| No 2-minute quickstart | 2-minute quickstart first | ❌ |

---

### Gap 6: Proof-Carrying Code

**Current:** Capabilities granted manually  
**Target:** Static analysis proves code matches declared capabilities

```typescript
// From experiments/proof-carrying-code
const proof = await lab.analyzeCode(code);
// proof.intendedCalls = ["GET /zones"]
// proof.codeHash = "sha256:..."
// Verify: granted capabilities cover intended calls
```

**Implementation notes:**
- Integrate Acorn AST parser
- Run at submit time, store in trace
- Future: signed proofs for audit

---

## Priority Order

Based on user value and implementation complexity:

1. **Self-Healing Loop** (High value, Medium complexity)
   - Agents can fix themselves
   - Builds on existing trace infrastructure
   - Differentiator from other sandbox tools

2. **7-Minute README** (High value, Low complexity)
   - Faster user onboarding
   - Immediate improvement
   - Sets tone for documentation

3. **Story Composition** (Medium value, Medium complexity)
   - Team collaboration
   - Debugging complex agent flows
   - Requires new D1 schema

4. **Proof-Carrying Code** (Medium value, High complexity)
   - Audit/security value
   - Static analysis pipeline
   - Can be incremental

5. **Human Review Workflows** (Medium value, Medium complexity)
   - Governance for production use
   - Depends on stories existing

6. **CloudEval Integration** (Lower priority, External dependency)
   - Quality assurance
   - Can be community contribution

---

## Implementation Strategy

### Phase 1: Self-Healing Core
- Add `/diagnose`, `/propose`, `/verify`, `/compare` routes to worker
- Build Effect pipelines for each
- Add UI components to SvelteKit app

### Phase 2: Documentation Refresh
- Rewrite README with Diataxis structure
- Create tutorial.md, how-to guides, explanation docs
- Keep existing docs/ folder, reorganize

### Phase 3: Stories
- D1 migration for stories table
- Story viewer page
- Fork from story feature

### Phase 4: Proof & Review
- Static analysis integration
- Review workflow D1 tables
- Email notifications

---

## Questions

1. Should self-healing be automatic or opt-in per-run?
2. Should stories be public or require auth?
3. Do we want to integrate with Project Think fibers directly?
4. Should proof-carrying code block execution or just warn?
