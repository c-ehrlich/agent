export const blueText = (text: string) => `\x1b[94m${text}\x1b[0m`;
export const greenText = (text: string) => `\x1b[92m${text}\x1b[0m`;
export const yellowText = (text: string) => `\x1b[93m${text}\x1b[0m`;
export const resetText = '\x1b[0m';

export const ANSI = {
  Reset: '\x1b[0m',
  Blue: '\x1b[94m',
  Green: '\x1b[92m',
  Yellow: '\x1b[93m',
} as const;
