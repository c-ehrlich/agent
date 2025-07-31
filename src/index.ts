#!/usr/bin/env node

import 'dotenv/config';
import * as readline from 'node:readline/promises';
console.log('Hello from TypeScript CLI!');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY);

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

async function main() {
  while (true) {
    const userInput = await rl.question(`${ANSI.Yellow}You${ANSI.Reset}: `);
    if (!userInput) continue;
  }
}

main().catch((err) => {
  console.error('\n\nError:', err);
  process.exit(1);
});
