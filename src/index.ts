#!/usr/bin/env node

import './instrumentation.js';
import 'dotenv/config';
import * as readline from 'node:readline/promises';
import { createAnthropic } from '@ai-sdk/anthropic';
import { stepCountIs, streamText, type ModelMessage } from 'ai';
import { readFileTool } from './tools/read_file.js';
import { listFilesTool } from './tools/list_files.js';
import { editFileTool } from './tools/edit_file.js';
import { setupTracing } from './instrumentation.js';
import { withSpan, wrapAISDKModel, wrapTools } from '@axiomhq/ai';
import { v4 as uuidv4 } from 'uuid';

console.log('Hello from TypeScript CLI!');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY);

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const tracer = setupTracing('agent-cli');
const conversationId = uuidv4();

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

const model = wrapAISDKModel(anthropic('claude-sonnet-4-20250514'));

const messages: ModelMessage[] = [
  // { role: 'system', content: 'You are a coding assistant.' },
];

async function main() {
  while (true) {
    const userInput = await rl.question(`${ANSI.Blue}You${ANSI.Reset}: `);
    if (!userInput) continue;

    await tracer.startActiveSpan('conversation.turn', async (span) => {
      try {
        messages.push({
          role: 'user',
          content: userInput,
        });

        let needClaudePrefix = true;

        const tools = wrapTools({
          read_file: readFileTool,
          list_files: listFilesTool,
          edit_file: editFileTool,
        });

        const result = await withSpan(
          { capability: 'agent', step: 'turn' },
          async (span) => {
            span.setAttribute('gen_ai.conversation.id', conversationId);

            const result = streamText({
              model,
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

            return newMessages;
          }
        );

        messages.push(...result);

        span.setStatus({ code: 1 }); // OK
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

main().catch((err) => {
  console.error('\n\nError:', err);
  process.exit(1);
});
