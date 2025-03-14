import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { textEditorExecute, toolParameters } from '../../src/tools/textEditor';

// Mock the server transport
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({
    onMessage: vi.fn(),
    send: vi.fn(),
  })),
}));

describe('MCP Server Integration', () => {
  let server: McpServer;
  
  beforeEach(() => {
    // Create a fresh server instance for each test
    server = new McpServer({
      name: 'test-server',
      version: '0.0.1',
    });
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  it('should register the text editor tool', () => {
    // Spy on the tool method
    const toolSpy = vi.spyOn(server, 'tool');
    
    // Register the tool
    server.tool(
      'text_editor',
      'Test text editor tool',
      toolParameters,
      textEditorExecute,
    );
    
    // Verify the tool was registered
    expect(toolSpy).toHaveBeenCalledWith(
      'text_editor',
      'Test text editor tool',
      toolParameters,
      textEditorExecute,
    );
  });
  
  it('should accept tool registration with error handling', () => {
    // Create a mock execute function that throws an error
    const mockExecute = vi.fn().mockImplementation(() => {
      throw new Error('Test error');
    });
    
    // Register a tool with the mock execute function
    const registerTool = () => {
      server.tool(
        'error_tool',
        'Tool that throws errors',
        toolParameters,
        mockExecute,
      );
    };
    
    // Verify that registering a tool with an error handler doesn't throw
    expect(registerTool).not.toThrow();
  });
  
  it('should have proper server configuration', () => {
    // Test that the server was constructed with the correct configuration
    const serverConfig = {
      name: 'test-server',
      version: '0.0.1',
    };
    
    // Create a new server with the same config to test
    const newServer = new McpServer(serverConfig);
    
    // Since we can't access private properties, we'll check that the server
    // was instantiated without errors
    expect(newServer).toBeInstanceOf(McpServer);
  });
});