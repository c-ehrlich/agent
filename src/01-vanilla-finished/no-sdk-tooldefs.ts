// export const TOOLS: Tool[] = [];

export const TOOLS: Tool[] = [
  {
    name: 'list_files',
    description: `List files and directories at a given path.
If no path is provided, lists files in the current directory.`,
    input_schema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Optional relative path; defaults to current dir',
        },
      },
      required: [],
    },
  },

  {
    name: 'read_file',
    description: `Read the contents of a given relative file path.
Use this when you want to see what is inside a file.
Do not use this with directory names.`,
    input_schema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Relative path of a file.' },
      },
      required: ['path'],
    },
  },

  {
    name: 'edit_file',
    description: `Make edits to a text file.
Replaces 'old_str' with 'new_str' in the given file. 'old_str' and 'new_str' MUST differ.
If the file does not exist it will be created with 'new_str' as its entire contents.`,
    input_schema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'File path' },
        old_str: { type: 'string', description: 'Exact text to replace' },
        new_str: { type: 'string', description: 'Replacement text' },
      },
      required: ['path', 'old_str', 'new_str'],
    },
  },
];
