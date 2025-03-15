import { ChildProcess } from 'child_process';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Tool } from '@modelcontextprotocol/sdk/resources/tools/index.js';

export class MCPClient {
  private mcp: Client;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];
  private serverProcess: ChildProcess | null = null;

  constructor() {
    this.mcp = new Client({ name: 'mcp-test-client', version: '1.0.0' });
  }

  /**
   * Connects to an MCP server
   * @param serverScriptPath Path to the server script
   * @returns Promise that resolves when connected
   */
  async connectToServer(serverScriptPath: string): Promise<Tool[]> {
    try {
      const isJs = serverScriptPath.endsWith('.js');
      const isPy = serverScriptPath.endsWith('.py');

      if (!isJs && !isPy) {
        throw new Error('Server script must be a .js or .py file');
      }

      const command = isPy
        ? process.platform === 'win32'
          ? 'python'
          : 'python3'
        : process.execPath;

      // Create transport that communicates with the server process
      this.transport = new StdioClientTransport({
        command,
        args: [serverScriptPath],
      });

      // Connect the client to the transport
      this.mcp.connect(this.transport);

      // List available tools
      const toolsResult = await this.mcp.listTools();

      this.tools = toolsResult.tools;

      return this.tools;
    } catch (e) {
      console.error('Failed to connect to MCP server: ', e);
      throw e;
    }
  }

  /**
   * Disconnects from the server and cleans up resources
   */
  async disconnect(): Promise<void> {
    try {
      // The StdioClientTransport doesn't have a disconnect method,
      // but when the process exits, it will clean up resources

      this.tools = [];
      this.transport = null;
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }

  /**
   * Gets the list of available tools
   */
  getTools(): Tool[] {
    return this.tools;
  }

  /**
   * Calls a tool on the server
   * @param toolName Name of the tool to call
   * @param parameters Parameters to pass to the tool
   * @returns Result from the tool
   */
  async callTool(
    toolName: string,
    parameters: Record<string, any>,
  ): Promise<any> {
    if (!this.transport) {
      throw new Error('Not connected to server');
    }

    return await this.mcp.callTool(toolName, parameters);
  }
}
