#!/usr/bin/env node

import 'dotenv/config';
import * as readline from 'node:readline/promises';
import { createAnthropic } from '@ai-sdk/anthropic';
import { stepCountIs, streamText, type ModelMessage } from 'ai';
import { readFileTool } from './tools/read_file.js';
import { listFilesTool } from './tools/list_files.js';

console.log('Hello from TypeScript CLI!');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY);

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ANSI = {
  Reset: '\x1b[0m',
  ///////////////////
  Blue: '\x1b[94m',
  Green: '\x1b[92m',
  Yellow: '\x1b[93m',
};

console.log("Chat with Claude (use 'ctrl-c' to quit)");

const messages: ModelMessage[] = [
  // { role: 'system', content: 'You are a coding assistant.' },
];

async function main() {
  while (true) {
    const userInput = await rl.question(`${ANSI.Blue}You${ANSI.Reset}: `);
    if (!userInput) continue;

    messages.push({
      role: 'user',
      content: userInput,
    });

    let needClaudePrefix = true;

    const tools = { read_file: readFileTool, list_files: listFilesTool };

    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      prompt: messages,
      tools,
      stopWhen: stepCountIs(5),
      onStepFinish({ toolCalls }) {
        if (toolCalls.length) {
          console.log(); // finish the assistant line
          for (const call of toolCalls) {
            console.log(
              `${ANSI.Green}Tool${ANSI.Reset}: ${call.toolName}(${JSON.stringify(call)})`
            );
          }
        }
        // console.log('tktk content', JSON.stringify(content));
        needClaudePrefix = true; // next step gets its own prefix
      },
    });

    for await (const chunk of result.textStream) {
      if (needClaudePrefix) {
        process.stdout.write(`${ANSI.Yellow}Claude${ANSI.Reset}: `);
        needClaudePrefix = false;
      }
      process.stdout.write(chunk);
    }

    console.log(); // newline

    const { messages: newMessages } = await result.response;
    messages.push(...newMessages);
  }
}

main().catch((err) => {
  console.error('\n\nError:', err);
  process.exit(1);
});
