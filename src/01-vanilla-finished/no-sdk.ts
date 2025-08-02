#!/usr/bin/env node

import 'dotenv/config';
import * as fs from 'fs/promises';
import path from 'path';
import * as rl from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { TOOLS, type Tool } from './no-sdk-tooldefs.js';
import type { Block, ChatMessage } from './no-sdk-util/message-types.js';
import {
  prettyPrintClaudeRequest,
  prettyPrintClaudeResponse,
  prettyPrintToolCall,
  prettyPrintToolResult,
  redText,
} from './no-sdk-util/pretty-print.js';

async function callClaude(messages: ChatMessage[], tools: Tool[]) {
  const payload = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    tools,
    messages,
  };

  console.log(prettyPrintClaudeRequest(payload));

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

  const parsedRes = (await res.json()) as {
    content: Block[];
    model: string;
    stop_reason: string;
    tool_results?: { tool_use_id: string; content: string }[];
  };

  console.log(prettyPrintClaudeResponse(parsedRes));

  return parsedRes;
}

const toolHandlers = {
  async list_files({ filePath = '.' }: { filePath?: string }) {
    const out: string[] = [];
    for (const f of await fs.readdir(filePath, {
      withFileTypes: true,
    })) {
      out.push(f.name + (f.isDirectory() ? '/' : ''));
    }
    return JSON.stringify(out);
  },

  async read_file({ filePath = '' }: { filePath?: string }) {
    return await fs.readFile(filePath, 'utf8');
  },

  async edit_file({
    filePath = '',
    old_str = '',
    new_str = '',
  }: {
    filePath?: string;
    old_str?: string;
    new_str?: string;
  }) {
    const text = await fs.readFile(filePath, 'utf8');
    const replaced = old_str ? text.replaceAll(old_str, new_str) : new_str;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, replaced, 'utf8');
    return `Successfully ${old_str ? 'updated' : 'created'} ${filePath}`;
  },
} as const;

async function main() {
  const convo: ChatMessage[] = [];
  const rlInterface = rl.createInterface({ input: stdin, output: stdout });
  console.log('\nChat with Claude - use Ctrl-C to quit');

  while (true) {
    const line = (await rlInterface.question(redText('\n😀  Input: '))).trim();

    if (!line) continue;

    convo.push({ role: 'user', content: [{ type: 'text', text: line }] });

    // FIRST DO IT WITHOUT THE WHILE LOOP! SHOW THAT WE NEED TO SEND THE RIGHT MESSAGE TYPE
    // claude call loop - continue until we get a text response
    while (true) {
      const res = await callClaude(convo, TOOLS);
      convo.push({ role: 'assistant', content: res.content });

      // // render & maybe run tools
      // const toolResults: Block[] = [];

      // for (const block of res.content) {
      //   if (block.type === 'tool_use') {
      //     console.log(prettyPrintToolCall(block.name, block.input));
      //     const handler = toolHandlers[block.name as keyof typeof toolHandlers];
      //     if (!handler) throw new Error(`unknown tool: ${block.name}`);
      //     const result = await handler(block.input);
      //     console.log(prettyPrintToolResult(block.name, block.id, result));
      //     toolResults.push({
      //       type: 'tool_result',
      //       tool_use_id: block.id,
      //       content: result,
      //     });
      //   }
      // }

      // // toolResults: fed back to Claude so it knows what happened
      // if (toolResults.length) {
      //   // break;
      //   convo.push({ role: 'user', content: toolResults });
      //   continue;
      // }

      // break out of claude call loop
      break;
    }
  }
}

main();
