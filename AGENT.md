# Agent Configuration

## Development Commands

- **Build**: `pnpm run build` - Compile TypeScript to JavaScript
- **Start**: `pnpm run start` - Run the compiled CLI
- **Dev**: `pnpm run dev` - Run TypeScript directly with tsx
- **Typecheck**: `pnpm run typecheck` - Check TypeScript types without compilation
- **Lint**: `pnpm run lint` - Run ESLint on source files
- **Lint Fix**: `pnpm run lint:fix` - Run ESLint and auto-fix issues
- **Format**: `pnpm run format` - Format code with Prettier
- **Format Check**: `pnpm run format:check` - Check if code is formatted
- **CI**: `pnpm run ci` - Run all checks (typecheck, lint, format)

## Project Structure

- `src/` - TypeScript source files
- `dist/` - Compiled JavaScript output
- Node.js 22+ required
- ESLint
- Prettier configured separately (not through ESLint)

## Code Style

- Uses modern TypeScript with strict settings
- ESLint with TypeScript rules
- Prettier for formatting
- ES modules (type: "module")
