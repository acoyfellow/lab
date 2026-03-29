#!/usr/bin/env bun
/**
 * Pi coding-agent session → derive @acoyfellow/lab chain steps from turn count → runChain.
 *
 * Prerequisites:
 * - Pi configured (~/.pi/agent) and a provider API key Pi can use (see Pi docs).
 * - Lab Worker reachable at LAB_URL (default http://localhost:1337 — run `bun dev` in this repo).
 *
 * Run:
 *   LAB_URL=https://your-lab.example bun run pi:lab-bridge
 *   LAB_URL=http://localhost:1337 bun run pi:lab-bridge -- "List files in the repo root"
 *
 * Lab-only smoke (no Pi / no API keys): message count is assumed to be 4.
 *   SKIP_PI=1 LAB_URL=http://localhost:1337 bun run pi:lab-bridge
 */
import { createAgentSession, SessionManager } from '@mariozechner/pi-coding-agent';
import type { ChainStep } from '@acoyfellow/lab';
import { createLabClient } from '@acoyfellow/lab';

const baseUrl = process.env.LAB_URL ?? 'http://localhost:1337';
const lab = createLabClient({ baseUrl });

/** Build guest steps from how many Pi messages exist after the user prompt (deterministic, always valid lab JSON). */
function stepsFromMessageCount(messageCount: number): ChainStep[] {
  return [
    {
      name: 'pi-session-echo',
      body: `return { piMessageCount: ${messageCount}, via: "pi-lab-bridge" }`,
      capabilities: [],
    },
    {
      name: 'fold',
      body: `return input.piMessageCount * 2`,
      capabilities: [],
    },
  ];
}

async function runLabOnlyDemo(messageCount: number) {
  console.log(`SKIP_PI=1 — skipping Pi; using messageCount=${messageCount}\n`);
  const steps = stepsFromMessageCount(messageCount);
  const out = await lab.runChain(steps);
  if (!out.ok) {
    console.error('lab.runChain failed:', out.error ?? out.reason ?? out);
    process.exit(1);
  }
  if (!out.resultId) {
    console.error('lab.runChain missing resultId:', out);
    process.exit(1);
  }
  const resultUrl = `${baseUrl.replace(/\/+$/, '')}/results/${out.resultId}`;
  console.log('--- lab ---');
  console.log('result:', resultUrl);
  console.log('result:', out.result);
}

if (process.env.SKIP_PI === '1') {
  await runLabOnlyDemo(4);
  process.exit(0);
}

const argvPrompt = process.argv.slice(2).join(' ').trim();
const prompt =
  argvPrompt ||
  'What files are in the current directory? Answer in one short sentence; do not run destructive commands.';

const { session } = await createAgentSession({
  cwd: process.cwd(),
  sessionManager: SessionManager.inMemory(),
});

session.subscribe((event) => {
  if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await session.prompt(prompt);
process.stdout.write('\n');

const steps = stepsFromMessageCount(session.state.messages.length);
const out = await lab.runChain(steps);

if (!out.ok) {
  console.error('lab.runChain failed:', out.error ?? out.reason ?? out);
  process.exit(1);
}
if (!out.resultId) {
  console.error('lab.runChain missing resultId:', out);
  process.exit(1);
}

const resultUrl = `${baseUrl.replace(/\/+$/, '')}/results/${out.resultId}`;
console.log('--- lab ---');
console.log('result:', resultUrl);
console.log('result:', out.result);
