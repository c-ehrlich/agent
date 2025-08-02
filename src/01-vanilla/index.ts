import 'dotenv/config';
import * as rl from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { redText } from './util/pretty-print.js';

async function main() {
  const rlInterface = rl.createInterface({ input: stdin, output: stdout });
  console.log('\nChat with Claude - use Ctrl-C to quit');

  while (true) {
    const line = (await rlInterface.question(redText('\n😀  Input: '))).trim();

    if (!line) continue;

    console.log('\n...');
  }
}

main();
