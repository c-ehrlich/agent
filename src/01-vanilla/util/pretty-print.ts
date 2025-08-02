import type { TOOLS } from '../no-sdk-tooldefs.js';
import type { ChatMessage, Block } from './message-types.js';

export const redText = (text: string) => `\x1b[91m${text}\x1b[0m`;
const orangeText = (text: string) => `\x1b[33m${text}\x1b[0m`;
const greenText = (text: string) => `\x1b[92m${text}\x1b[0m`;
const blueText = (text: string) => `\x1b[94m${text}\x1b[0m`;

export const prettyPrintClaudeRequest = (body: {
  model: string;
  max_tokens: number;
  tools: typeof TOOLS;
  messages: ChatMessage[];
}) => {
  const { model, max_tokens, tools, messages } = body;
  return `
${orangeText('📤 Claude API Request:')}
   🧠 ${greenText('Model')}: ${model}
   🔢 ${greenText('Max tokens')}: ${max_tokens}
   🧰 ${greenText('Tools')}: ${tools.map((t) => `${t.name}(${Object.keys(t.input_schema).join(',')})`).join(', ')}
   💬 ${greenText('Messages')}:${messages.map((m) => {
     const firstBit =
       m.role === 'user' ? blueText('🧑 User: ') : blueText('🤖 Assistant: ');
     return `\n      ${firstBit} ${m.content
       .map((c) => {
         if (c.type === 'text') {
           const lines = c.text.split('\n');
           const firstLine = `\n         💬 ${lines[0]}`;
           const otherLines = lines
             .slice(1)
             .map((line: string) => `\n           ${line}`);
           return [firstLine, ...otherLines].join('');
         } else if (c.type === 'tool_use') {
           return `\n         🔧 Tool use: ${c.name} ${JSON.stringify(c.input)}`;
         } else {
           return `\n         🛠️  Tool result: ${c.content}`;
         }
       })
       .join('')}`;
   })}
    `;
};

export const prettyPrintClaudeResponse = (res: {
  model: string;
  stop_reason: string;
  content: Block[];
  tool_results?: { tool_use_id: string; content: string }[];
}) => {
  const lines: string[] = [];

  lines.push(`${orangeText('📥 Claude API Response:')}`);
  lines.push(`   🧠 ${greenText('Model')}: ${res.model}`);
  lines.push(`   💬 ${greenText('Content')}:`);

  lines.push(
    ...res.content.map((c) => {
      if (c.type === 'text') {
        const lines = c.text.split('\n');
        const firstLine = `         💬 ${lines[0]}`;
        const otherLines = lines
          .slice(1)
          .map((line: string) => `           ${line}`);
        return `      ${blueText('🤖 Assistant:')}\n${[firstLine, ...otherLines].join('\n')}`;
      } else if (c.type === 'tool_use') {
        return `      ${blueText('🤖 Assistant:')}\n         🔧 Tool use: ${c.name} ${JSON.stringify(c.input)}`;
      } else {
        return `      ${blueText('🤖 Assistant:')}\n         ❓ Unknown content type: ${JSON.stringify(c)}`;
      }
    })
  );

  if (res.tool_results?.length) {
    lines.push(`   🛠️ ${greenText('Tool Results')}:`);
    res.tool_results.forEach((r) => {
      lines.push(
        `      🧰 Result for ${r.tool_use_id}:\n         ${r.content}`
      );
    });
  }

  lines.push(`   ⛔️ ${greenText('Stop reason')}: ${res.stop_reason}`);

  return lines.join('\n');
};

export const prettyPrintToolCall = (
  toolName: string,
  input: Record<string, unknown>
) => {
  return `
${orangeText('🔧 Tool Call:')}
   🛠️  ${greenText('Tool')}: ${toolName}
   📝 ${greenText('Input')}: ${JSON.stringify(input, null, 2)}`;
};

export const prettyPrintToolResult = (
  toolName: string,
  toolUseId: string,
  result: string
) => {
  const lines = result.split('\n');
  const firstLine = `         ${lines[0]}`;
  const otherLines = lines.slice(1).map((line: string) => `         ${line}`);

  return `
${orangeText('🔧 Tool Result:')}
   🛠️  ${greenText('Tool')}: ${toolName}
   📤 ${greenText('Result')}:
${[firstLine, ...otherLines].join('\n')}`;
};
