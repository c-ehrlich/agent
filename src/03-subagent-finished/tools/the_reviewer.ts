import { tool } from 'ai';
import { z } from 'zod';
import { runReviewerSubagent } from './reviewer-subagent.js';

export const theReviewerTool = tool({
  description: `"The Reviewer" is a code review and architecture specialist powered by o3.
Use this tool for:
- Code reviews and security analysis
- Architecture decisions and design patterns
- Performance optimization recommendations
- Complex bug investigation and root cause analysis
- Technical debt assessment

The tool uses a sophisticated subagent that can dynamically explore the codebase, 
gather relevant information, and provide expert analysis through a two-step process:
1. GPT-4o conducts thorough analysis with tool access
2. o3 provides final expert recommendations

This is ideal for complex code reviews that require deep understanding and exploration.`,
  inputSchema: z.object({
    task: z.string().describe('The specific review request or question'),
    context: z.string().optional().describe('Additional background information'),
    files: z.array(z.string()).optional().describe('Specific file paths to include in review'),
    includeChanges: z.boolean().optional().default(false).describe('Include git working changes'),
    scope: z.enum(['security', 'performance', 'architecture', 'general']).optional().default('general').describe('Focus area for the review')
  }),
  execute: async ({ task, context, files = [], includeChanges = false, scope = 'general' }) => {
    try {
      const reviewResult = await runReviewerSubagent(task, context, files, includeChanges, scope);
      
      return {
        success: true,
        result: reviewResult
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },
});
