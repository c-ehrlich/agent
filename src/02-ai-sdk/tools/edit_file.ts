import { tool } from 'ai';
import { z } from 'zod';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const editFileTool = tool({
  description: `Make edits to a text file.
Replaces 'old_str' with 'new_str' in the given file. 'old_str' and 'new_str' **must differ**.
If the file doesn't exist and old_str is empty, a new file is created with new_str as its content.`,
  inputSchema: z.object({
    path: z.string().describe('Relative file path.'),
    old_str: z
      .string()
      .describe('Exact text to replace. Leave empty when creating a new file.'),
    new_str: z.string().describe('Replacement text. Must differ from old_str.'),
  }),
  execute: async ({ path: relPath, old_str, new_str }) => {
    // sanity checks
    if (!relPath) throw new Error('empty path');
    if (old_str === new_str) throw new Error('old_str equals new_str');

    // sandbox: forbid absolute paths / traversal
    const abs = path.resolve(process.cwd(), relPath);
    if (!abs.startsWith(process.cwd())) throw new Error('path escapes cwd');

    let content = '';
    try {
      content = await fs.readFile(abs, 'utf8');
    } catch (err: unknown) {
      if (
        !(
          err &&
          typeof err === 'object' &&
          'code' in err &&
          err.code === 'ENOENT'
        )
      )
        throw err; // real error
      if (old_str) throw new Error('file missing and old_str provided');
      // create new file
      await ensureDir(abs);
      await fs.writeFile(abs, new_str, 'utf8');
      return `Created ${relPath}`;
    }

    const replaced = content.replaceAll(old_str, new_str);
    if (replaced === content && old_str)
      throw new Error('old_str not found in file');

    await fs.writeFile(abs, replaced, 'utf8');
    return 'OK';
  },
});

async function ensureDir(file: string) {
  const dir = path.dirname(file);
  if (dir !== '.') await fs.mkdir(dir, { recursive: true });
}
