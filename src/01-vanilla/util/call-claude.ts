import type { ChatMessage, ClaudeResponse } from './message-types.js';
import type { Tool } from './tool-types.js';

export async function callClaude(messages: ChatMessage[], tools?: Tool[]) {
  const payload: Record<string, unknown> = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages,
    ...(tools ? { tools } : {}),
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API ${res.status}: ${body}`);
  }

  const parsedRes = (await res.json()) as ClaudeResponse;

  return parsedRes;
}
