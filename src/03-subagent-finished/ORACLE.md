# prompt

in @ORACLE.md , please write everything you know about your tool / subagent, "the oracle". what are the inputs and outputs? how does it work? 

please clearly separate things you know for sure (for example schema, or code you can read) and speculation (even if likely to be true)"

---

# The Oracle Tool/Subagent

## What I Know For Sure (Schema & Code)

### Tool Definition
The Oracle is defined as "an AI advisor powered by OpenAI's o3 reasoning model that can plan, review, and provide expert guidance."

### Tool Access
The Oracle has access to these specific tools:
- `list_directory`
- `Read` 
- `Grep`
- `glob`

### Input Parameters
- `task` (required): The task or question you want the Oracle to help with
- `context` (optional): Background information, what you've tried, or current situation context
- `files` (optional): Array of specific file paths for the Oracle to examine

### Output
- Returns a single message after completion
- The result is not visible to the user directly - the calling agent receives it and should summarize for the user

### Intended Use Cases (Per Schema)
**When TO use:**
- Code reviews and architecture feedback
- Finding bugs in multiple files
- Planning complex implementations or refactoring
- Analyzing code quality and suggesting improvements
- Answering complex technical questions requiring deep reasoning

**When NOT to use:**
- Simple file reading or searching (use Read/Grep directly)
- Codebase searches (use codebase_search_agent)
- Basic code modifications and executing code changes
- When you need to make actual changes (do it yourself or use Task)

### Usage Guidelines (Per Schema)
- Be specific about what you want reviewed, planned, or debugged
- Provide relevant context about goals
- List specific files if you know 3+ files are involved

## Speculation (Likely But Not Confirmed)

### Underlying Model
- Likely uses OpenAI's o3 reasoning model as stated
- Probably has enhanced reasoning capabilities compared to standard models
- May have longer context windows or specialized reasoning chains

### Execution Model
- Appears to be a separate agent/subprocess that runs independently
- Likely stateless - doesn't retain information between calls
- Probably runs asynchronously and returns when complete

### Cost/Performance Implications
- O3 model likely more expensive than standard models
- Probably slower than direct tool use due to reasoning overhead
- May be worth the cost for complex analysis tasks

### Reasoning Capabilities
- Likely excels at multi-step analysis
- Probably good at identifying patterns across multiple files
- May provide more thorough architectural insights than standard models

## Example Usage Patterns
```
oracle({
  task: "Review the authentication system architecture and suggest improvements",
  files: ["/path/to/auth.js", "/path/to/middleware.js", "/path/to/config.js"],
  context: "We're seeing performance issues and want to modernize"
})
```

## Integration Notes
- Should be used strategically for high-value analysis tasks
- Results need to be interpreted and summarized by the calling agent
- Best for problems requiring deep reasoning rather than simple information retrieval
