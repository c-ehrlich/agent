import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { withSpan, wrapAISDKModel, wrapTools } from '@axiomhq/ai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';
import { setupTracing } from '../instrumentation.js';

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Setup tracing for the reviewer subagent
const tracer = setupTracing('reviewer-subagent');

// Models with tracing
const gpt4o = wrapAISDKModel(openai('gpt-4o'));
const o3 = wrapAISDKModel(openai('o3'));

interface ReviewRecommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
  suggestedActions?: string[];
}

interface CodeChange {
  file: string;
  description: string;
  suggestedCode?: string;
}

interface ReviewResult {
  summary: string;
  recommendations: ReviewRecommendation[];
  codeChanges?: CodeChange[];
}

// Tools available to the reviewer subagent
const reviewerTools = wrapTools({
  read_file: tool({
    description: 'Read a file from the file system',
    parameters: z.object({
      path: z.string().describe('Absolute path to the file to read'),
    }),
    execute: async ({ path }) => {
      try {
        if (!existsSync(path)) {
          return { error: `File does not exist: ${path}` };
        }
        const content = readFileSync(path, 'utf-8');
        return { content };
      } catch (error) {
        return { error: `Failed to read file: ${error}` };
      }
    },
  }),

  list_directory: tool({
    description: 'List files and directories in a given directory',
    parameters: z.object({
      path: z.string().describe('Absolute path to the directory to list'),
    }),
    execute: async ({ path }) => {
      try {
        if (!existsSync(path)) {
          return { error: `Directory does not exist: ${path}` };
        }
        const files = await import('fs/promises').then(fs => fs.readdir(path));
        return { files };
      } catch (error) {
        return { error: `Failed to list directory: ${error}` };
      }
    },
  }),

  search_files: tool({
    description: 'Search for text patterns in files using glob patterns',
    parameters: z.object({
      pattern: z.string().describe('Text pattern to search for'),
      fileGlob: z.string().optional().describe('Glob pattern for files to search (default: **/*.{js,ts,jsx,tsx,py,go,java,c,cpp,h,hpp})'),
      caseSensitive: z.boolean().optional().default(false).describe('Whether to search case-sensitively'),
    }),
    execute: async ({ pattern, fileGlob = '**/*.{js,ts,jsx,tsx,py,go,java,c,cpp,h,hpp}', caseSensitive = false }) => {
      try {
        const files = await glob(fileGlob, { ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'] });
        const results: Array<{ file: string; line: number; content: string }> = [];
        
        for (const file of files.slice(0, 20)) { // Limit to prevent overwhelming
          try {
            const content = readFileSync(file, 'utf-8');
            const lines = content.split('\n');
            
            lines.forEach((line, index) => {
              const searchLine = caseSensitive ? line : line.toLowerCase();
              const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();
              
              if (searchLine.includes(searchPattern)) {
                results.push({
                  file,
                  line: index + 1,
                  content: line.trim()
                });
              }
            });
          } catch (error) {
            // Skip files that can't be read
          }
        }
        
        return { results: results.slice(0, 50) }; // Limit results
      } catch (error) {
        return { error: `Search failed: ${error}` };
      }
    },
  }),

  find_files: tool({
    description: 'Find files by name or pattern',
    parameters: z.object({
      pattern: z.string().describe('Glob pattern to match files'),
      limit: z.number().optional().default(20).describe('Maximum number of files to return'),
    }),
    execute: async ({ pattern, limit = 20 }) => {
      try {
        const files = await glob(pattern, { 
          ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
          nodir: true 
        });
        return { files: files.slice(0, limit) };
      } catch (error) {
        return { error: `File search failed: ${error}` };
      }
    },
  }),

  get_git_changes: tool({
    description: 'Get current git changes (working directory and staged)',
    parameters: z.object({}),
    execute: async () => {
      try {
        let changes = '';
        
        // Try working directory changes
        try {
          changes = execSync('git diff HEAD', { encoding: 'utf-8' });
        } catch {}
        
        // If no working changes, try staged changes
        if (!changes) {
          try {
            changes = execSync('git diff --cached', { encoding: 'utf-8' });
          } catch {}
        }
        
        return { changes: changes || 'No git changes found' };
      } catch (error) {
        return { error: `Failed to get git changes: ${error}` };
      }
    },
  }),

  get_project_context: tool({
    description: 'Get project context like package.json, README, etc.',
    parameters: z.object({}),
    execute: async () => {
      const context: Record<string, any> = {};
      
      try {
        const packageJsonPath = join(process.cwd(), 'package.json');
        if (existsSync(packageJsonPath)) {
          context.packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        }
      } catch {}
      
      try {
        const readmePath = join(process.cwd(), 'README.md');
        if (existsSync(readmePath)) {
          context.readme = readFileSync(readmePath, 'utf-8');
        }
      } catch {}
      
      return { context };
    },
  }),
});

export async function runReviewerSubagent(
  task: string,
  context?: string,
  files?: string[],
  includeChanges = false,
  scope: string = 'general'
): Promise<ReviewResult> {
  return withSpan(
    { capability: 'reviewer_subagent', step: 'full_review' },
    async (span) => {
      span.setAttribute('review.task', task);
      span.setAttribute('review.scope', scope);
      span.setAttribute('review.include_changes', includeChanges);
      if (files?.length) {
        span.setAttribute('review.files_count', files.length);
      }

      try {
        // Step 1: Let the reviewer agent gather information and analyze
        const analysisResult = await withSpan(
          { capability: 'reviewer_subagent', step: 'analysis' },
          async () => {
            const scopeInstructions = {
              security: 'Focus on security vulnerabilities, authentication issues, data validation, and potential attack vectors.',
              performance: 'Analyze for performance bottlenecks, algorithmic efficiency, memory usage, and scalability concerns.',
              architecture: 'Review architectural patterns, design principles, modularity, and long-term maintainability.',
              general: 'Provide comprehensive review covering code quality, best practices, potential bugs, and improvements.'
            };

            let systemPrompt = `You are an expert code reviewer and software architect. Your task is to conduct a thorough code review.

TASK: ${task}
SCOPE: ${scopeInstructions[scope as keyof typeof scopeInstructions]}`;

            if (context) {
              systemPrompt += `\nCONTEXT: ${context}`;
            }

            systemPrompt += `

You have access to tools to:
- Read specific files
- Search for patterns across the codebase
- Find files by name/pattern  
- Get git changes
- List directories
- Get project context

Your process should be:
1. If specific files were mentioned, read them first
2. Get project context to understand the tech stack
3. If includeChanges is true, get git changes
4. Search for relevant patterns or files based on the task
5. Conduct your analysis based on gathered information
6. Provide a comprehensive summary of your findings

At the end, provide a structured summary of your findings in this format:
SUMMARY: [Brief overview]
RECOMMENDATIONS: [List of specific recommendations with priorities]
CODE_CHANGES: [Specific code changes suggested]

Be thorough but focused. Use tools strategically to gather the most relevant information.`;

            if (files?.length) {
              systemPrompt += `\n\nSpecific files to examine: ${files.join(', ')}`;
            }

            if (includeChanges) {
              systemPrompt += `\nInclude current git changes in your analysis.`;
            }

            const result = await generateText({
              model: gpt4o,
              prompt: systemPrompt,
              tools: reviewerTools,
              maxSteps: 10,
            });

            return result.text;
          }
        );

        // Step 2: Use GPT-4o to refine the analysis into a structured prompt for o3
        const refinedPrompt = await withSpan(
          { capability: 'reviewer_subagent', step: 'prompt_refinement' },
          async () => {
            const result = await generateText({
              model: gpt4o,
              prompt: `Based on this code review analysis, create a refined prompt for an expert o3 model to provide final recommendations:

ORIGINAL ANALYSIS:
${analysisResult}

Create a structured prompt that:
1. Summarizes the key findings clearly
2. Asks for specific, actionable recommendations
3. Requests prioritized suggestions
4. Asks for concrete code examples where helpful

The o3 model should respond with a structured analysis including summary, categorized recommendations with priorities, and suggested code changes.`,
            });

            return result.text;
          }
        );

        // Step 3: Get final expert analysis from o3
        const expertAnalysis = await withSpan(
          { capability: 'reviewer_subagent', step: 'expert_analysis' },
          async () => {
            const result = await generateText({
              model: o3,
              prompt: refinedPrompt,
            });

            return result.text;
          }
        );

        // Step 4: Parse the expert analysis into structured format
        const structuredResult = parseExpertAnalysis(expertAnalysis);
        
        span.setStatus({ code: 1 }); // OK
        return structuredResult;

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      }
    }
  );
}

function parseExpertAnalysis(analysis: string): ReviewResult {
  // Simple parsing - in production would want more sophisticated parsing
  const lines = analysis.split('\n');
  
  let summary = 'Code review completed with expert recommendations.';
  const recommendations: ReviewRecommendation[] = [];
  const codeChanges: CodeChange[] = [];
  
  let currentSection = '';
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('summary:')) {
      summary = line.replace(/summary:\s*/i, '').trim();
    } else if (lowerLine.includes('recommendation')) {
      currentSection = 'recommendations';
    } else if (lowerLine.includes('code') && lowerLine.includes('change')) {
      currentSection = 'codeChanges';
    } else if (line.trim() && currentSection === 'recommendations') {
      // Parse recommendation - simplified parsing
      recommendations.push({
        category: 'General',
        priority: 'medium',
        description: line.trim(),
        suggestedActions: []
      });
    }
  }
  
  // If parsing failed, create fallback structure
  if (recommendations.length === 0) {
    recommendations.push({
      category: 'Analysis',
      priority: 'medium',
      description: 'Expert analysis completed - see full details in summary',
      suggestedActions: ['Review the detailed analysis', 'Consider implementing suggested improvements']
    });
  }
  
  return {
    summary: summary || analysis.slice(0, 200) + '...',
    recommendations,
    codeChanges
  };
}
