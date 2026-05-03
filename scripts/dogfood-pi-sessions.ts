#!/usr/bin/env bun
import { createAgentSession, SessionManager } from '@mariozechner/pi-coding-agent';
import { createLabClient } from '@acoyfellow/lab';

const baseUrl = process.env.LAB_URL ?? 'http://localhost:1337';
const lab = createLabClient({ baseUrl });

const artifact = {
  provider: 'cloudflare-artifacts' as const,
  repo: 'lab',
  branch: 'main',
};

const checks = [
  {
    name: 'agent-comprehension',
    prompt:
      'Read README.md and answer in 6 bullets max: what is Lab, what are Artifacts in this design, what should an agent do first, and what is confusing?',
  },
  {
    name: 'continuation',
    prompt:
      'Assume a previous agent left a Lab session URL with receipts. Explain in 6 bullets max how you would continue work from it without trusting chat history.',
  },
  {
    name: 'failure-receipt',
    prompt:
      'Design one intentional failure test for Lab receipts. In 6 bullets max, say what should fail, what the receipt must capture, and what would make it actionable.',
  },
  {
    name: 'human-trust',
    prompt:
      'Act as a human reviewer opening a Lab receipt before deploy. In 6 bullets max, list what evidence you need to trust the agent can continue.',
  },
  {
    name: 'long-running-checkpoints',
    prompt:
      'For a long-running coding task, define a minimal checkpoint receipt rhythm in 6 bullets max: plan, edit, test, fix, decision, handoff.',
  },
] as const;

async function runPiCheck(sessionId: string, check: (typeof checks)[number]) {
  const startedAt = Date.now();
  let text = '';
  try {
    const { session } = await createAgentSession({
      cwd: process.cwd(),
      sessionManager: SessionManager.inMemory(),
    });

    session.subscribe((event) => {
      if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
        text += event.assistantMessageEvent.delta;
      }
    });

    await session.prompt(check.prompt);
    const elapsedMs = Date.now() - startedAt;
    const receipt = await lab.createSessionReceipt(sessionId, {
      source: 'pi',
      action: check.name,
      actor: { runtime: '@mariozechner/pi-coding-agent', mode: 'headless' },
      capabilities: ['filesystem.read', 'agent.reason'],
      input: { prompt: check.prompt },
      output: { text: text.trim(), messageCount: session.state.messages.length },
      replay: { mode: 'continue-from-here', available: true },
      artifact,
      timing: { totalMs: elapsedMs },
      metadata: { parallel: true },
    });
    return { ok: true, name: check.name, receiptId: receipt.resultId, elapsedMs, text: text.trim() };
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);
    const receipt = await lab.createSessionReceipt(sessionId, {
      source: 'pi',
      action: check.name,
      actor: { runtime: '@mariozechner/pi-coding-agent', mode: 'headless' },
      capabilities: ['filesystem.read', 'agent.reason'],
      input: { prompt: check.prompt },
      output: { error: message },
      ok: false,
      error: message,
      replay: { mode: 'continue-from-here', available: false, reason: 'Pi session failed before completion.' },
      artifact,
      timing: { totalMs: elapsedMs },
      metadata: { parallel: true },
    });
    return { ok: false, name: check.name, receiptId: receipt.resultId, elapsedMs, error: message };
  }
}

const created = await lab.createSession({
  title: 'Parallel Pi dogfood checks',
  artifact,
});

if (!created.sessionId) {
  console.error('Could not create Lab session', created);
  process.exit(1);
}

console.log(JSON.stringify({ sessionId: created.sessionId, sessionUrl: `${baseUrl}/sessions/${created.sessionId}` }));

const results = await Promise.all(checks.map((check) => runPiCheck(created.sessionId!, check)));
console.log(JSON.stringify({ sessionId: created.sessionId, results }, null, 2));
