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
  "A model context protocol server for editing text files that is identical with Claude's built in text editor tool called text_editor_20241022",
  toolParameters,
  textEditorExecute,
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `${packageJson.name} MCP Server v${packageJson.version} running on stdio`,
  );
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
