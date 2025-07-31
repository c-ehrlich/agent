import { tool } from 'ai';
import { z } from 'zod';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const readFileTool = tool({
  description:
    'Read the contents of a given relative file path. Use it to inspect a file. Do **not** pass directory names.',
  inputSchema: z.object({
    path: z
      .string()
      .describe('Relative path of a file inside the current working directory'),
  }),
  execute: async ({ path: relPath }) => {
    const abs = path.resolve(process.cwd(), relPath);
    if (!abs.startsWith(process.cwd())) {
      throw new Error('path escapes cwd');
    }

    const stat = await fs.stat(abs);
    if (stat.isDirectory()) {
      throw new Error('Cannot read a directory');
    }

    // naive: read the whole file as a UTF-8 string
    return await fs.readFile(abs, 'utf-8');
  },
});
