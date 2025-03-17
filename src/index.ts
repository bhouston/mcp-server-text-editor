import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { getPackageJson } from './lib/getPackageInfo.js';
import { textEditorExecute, toolParameters } from './tools/textEditor.js';

// Create server instance with package information
const packageJson = getPackageJson();
const server = new McpServer({
  name: packageJson.name!,
  version: packageJson.version!,
});

server.tool(
  'text_editor',
  "View, create, and edit files with persistent state across command calls.  This tool is identical with Claude's built in text editor tool called text_editor_20241022",
  toolParameters,
  textEditorExecute,
);

async function main() {
  console.error(
    `Starting ${packageJson.name} MCP Server v${packageJson.version}...`,
  );

  try {
    console.error('Initializing StdioServerTransport...');
    const transport = new StdioServerTransport();

    console.error('Connecting server to transport...');
    await server.connect(transport);

    console.error(
      `${packageJson.name} MCP Server v${packageJson.version} running on stdio`,
    );
    console.error('Server ready to accept commands');
  } catch (error) {
    console.error('Error during server startup:', error);
    throw error;
  }
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
