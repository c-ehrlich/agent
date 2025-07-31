import { tool } from 'ai';
import { z } from 'zod';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import ignore from 'ignore';

export const listFilesTool = tool({
  description:
    'List files and directories at a given path. If no path is provided, lists files in the current directory.',
  inputSchema: z.object({
    path: z
      .string()
      .optional()
      .describe(
        'Optional relative path to list files from. Defaults to current directory if not provided.'
      ),
  }),
  execute: async ({ path: relPath }) => {
    const dir = relPath || '.';
    const abs = path.resolve(process.cwd(), dir);
    if (!abs.startsWith(process.cwd())) {
      throw new Error('path escapes cwd');
    }

    // Load .gitignore
    const ig = ignore();
    try {
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      ig.add(gitignoreContent);
    } catch {
      // .gitignore doesn't exist, continue without it
    }

    const files: string[] = [];

    async function walkDirectory(
      currentPath: string,
      baseDir: string
    ): Promise<void> {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(baseDir, fullPath);

        if (relativePath !== '.') {
          // Check if path should be ignored
          if (ig.ignores(relativePath)) {
            continue;
          }

          if (entry.isDirectory()) {
            files.push(relativePath + '/');
            await walkDirectory(fullPath, baseDir);
          } else {
            files.push(relativePath);
          }
        }
      }
    }

    await walkDirectory(abs, abs);
    return JSON.stringify(files);
  },
});
