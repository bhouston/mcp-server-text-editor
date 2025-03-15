# Claude Text Editor MCP Server

[![npm version](https://img.shields.io/npm/v/mcp-server-text-editor.svg)](https://www.npmjs.com/package/mcp-server-text-editor)
[![CI Status](https://github.com/bhouston/mcp-server-text-editor/actions/workflows/tests.yml/badge.svg)](https://github.com/bhouston/mcp-server-text-editor/actions/workflows/tests.yml)
[![Test Coverage](https://img.shields.io/badge/coverage-65%25-yellow)](https://github.com/bhouston/mcp-server-text-editor)

<p align="center">
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/mcp/logo/dark.svg" alt="Model Context Protocol Logo" width="200"/>
</p>

An open-source implementation of the Claude built-in text editor tool as a Model Context Protocol (MCP) server. This package provides the same functionality as Claude's built-in text editor, allowing you to view, edit, and create text files through a standardized API.

## Features

- **Identical API to Claude's Text Editor**: Implements the exact same interface as Claude's built-in text editor tool
- **MCP Server Implementation**: Follows the Model Context Protocol standard for AI tool integration
- **File Operations**:
  - View file contents with optional line range specification
  - Create new files
  - Replace text in existing files
  - Insert text at specific line numbers
  - Undo previous edits
- **Directory Support**: View directory contents
- **Line Numbering**: Automatically adds line numbers for easier reference

## Supported Claude Text Editor Versions

This package implements the following Claude text editor tool versions:

- `text_editor_20241022` (Claude 3.5 Sonnet)
- `text_editor_20250124` (Claude 3.7 Sonnet)

## Installation

```bash
# Install from npm
npm install mcp-server-text-editor

# Or with pnpm
pnpm add mcp-server-text-editor
```

## Usage

### Starting the Server

```bash
# Using npx
npx mcp-server-text-editor

# Or if installed globally
mcp-server-text-editor
```

### Integration with Claude

To use this MCP server with Claude, you need to configure your Claude client to use this server as a tool. Here's an example using the Anthropic API:

```javascript
import anthropic from '@anthropic/sdk';

const client = new anthropic.Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await client.messages.create({
  model: 'claude-3-7-sonnet-20250219',
  max_tokens: 1024,
  tools: [
    {
      type: 'text_editor_20250124',
      name: 'str_replace_editor'
    }
  ],
  messages: [
    {
      role: 'user',
      content: 'There's a syntax error in my primes.py file. Can you help me fix it?'
    }
  ]
});
```

### Tool Commands

#### View

View the contents of a file or directory.

```json
{
  "command": "view",
  "path": "/path/to/file.js",
  "view_range": [1, 10] // Optional: Show lines 1-10 only
}
```

#### Create

Create a new file with the specified content.

```json
{
  "command": "create",
  "path": "/path/to/file.js",
  "file_text": "console.log('Hello, world!');"
}
```

#### String Replace

Replace text in a file.

```json
{
  "command": "str_replace",
  "path": "/path/to/file.js",
  "old_str": "console.log('Hello, world!');",
  "new_str": "console.log('Hello, Claude!');"
}
```

#### Insert

Insert text at a specific line.

```json
{
  "command": "insert",
  "path": "/path/to/file.js",
  "insert_line": 5,
  "new_str": "// This line was inserted by Claude"
}
```

#### Undo Edit

Revert the last edit made to a file.

```json
{
  "command": "undo_edit",
  "path": "/path/to/file.js"
}
```

## Development

### Prerequisites

- Node.js 18+
- pnpm

### Setup

```bash
# Clone the repository
git clone https://github.com/bhouston/mcp-server-text-editor.git
cd mcp-server-text-editor

# Install dependencies
pnpm install

# Build the project
pnpm build
```

### Scripts

- `pnpm build`: Build the TypeScript project
- `pnpm typecheck`: Run TypeScript type checking
- `pnpm lint`: Run ESLint with auto-fixing
- `pnpm format`: Format code with Prettier
- `pnpm clean`: Remove build artifacts
- `pnpm clean:all`: Remove build artifacts and node_modules
- `pnpm test`: Run tests
- `pnpm test:watch`: Run tests in watch mode
- `pnpm test:ui`: Run tests with UI
- `pnpm test:coverage`: Run tests with coverage report

### Testing

This project uses Vitest for testing. The test suite includes:

- **Unit Tests**: Tests for individual functions and components
- **Integration Tests**: Tests for the MCP server implementation

To run the tests:

```bash
# Run all tests
pnpm test

# Run tests in watch mode (useful during development)
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Run tests with coverage report
pnpm test:coverage
```

The test coverage report will be generated in the `coverage` directory.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
