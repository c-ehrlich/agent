export type ChatMessage = {
  role: 'user' | 'assistant';
  content: Block[];
};

export type Block =
  | { type: 'text'; text: string }
  | {
      type: 'tool_use';
      id: string;
      name: string;
      input: Record<string, unknown>;
    }
  | { type: 'tool_result'; tool_use_id: string; content: string };

export type ClaudeResponse = {
  content: Block[];
  model: string;
  stop_reason: string;
  tool_results?: { tool_use_id: string; content: string }[];
};
