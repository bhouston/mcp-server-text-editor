import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { MCPClient } from '../helpers/mcp-client.js';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the server script (dist/index.js)
const SERVER_SCRIPT_PATH = path.resolve(__dirname, '../../dist/index.js');

describe('MCP Server-Client Integration', () => {
  let client: MCPClient;
  let tempDir: string;
  let tempFilePath: string;

  beforeAll(async () => {
    // Create a temporary directory for file operations
    tempDir = path.join(os.tmpdir(), `mcp-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    tempFilePath = path.join(tempDir, 'test-file.txt');

    // Initialize client
    client = new MCPClient();
  });

  afterAll(async () => {
    // Clean up resources
    await client.disconnect();

    // Clean up temporary files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up temp directory:', error);
    }
  });

  it('should connect to the server and list available tools', async () => {
    // Connect to the server
    const tools = await client.connectToServer(SERVER_SCRIPT_PATH);

    // Verify connection and tools
    expect(tools).toBeDefined();
    expect(tools.length).toBeGreaterThan(0);

    // Verify that text_editor tool is available
    const textEditorTool = tools.find((tool) => tool.name === 'text_editor');
    expect(textEditorTool).toBeDefined();
  }, 15000); // Increase timeout to 15 seconds for this test

  it('should be able to create a file using the text_editor tool', async () => {
    // Test file content
    const testContent = 'This is a test file created by the MCP client.';

    // Call the text_editor tool to create a file
    const result = await client.callTool('text_editor', {
      command: 'create',
      path: tempFilePath,
      file_text: testContent,
      description: 'Creating a test file',
    });

    // Parse the result (which comes as a JSON string inside a content object)
    const parsedResult = JSON.parse(result.content[0].text);

    // Verify the result
    expect(parsedResult.success).toBe(true);
    expect(parsedResult.message).toContain('File created');

    // Verify the file was actually created with the correct content
    const fileContent = await fs.readFile(tempFilePath, 'utf8');
    expect(fileContent).toBe(testContent);
  }, 15000); // Increase timeout to 15 seconds

  it('should be able to view a file using the text_editor tool', async () => {
    // Call the text_editor tool to view the file
    const result = await client.callTool('text_editor', {
      command: 'view',
      path: tempFilePath,
      description: 'Viewing the test file',
    });

    // Parse the result
    const parsedResult = JSON.parse(result.content[0].text);

    // Verify the result
    expect(parsedResult.success).toBe(true);
    expect(parsedResult.message).toContain('File content');
    expect(parsedResult.content).toContain('This is a test file');
  }, 15000); // Increase timeout to 15 seconds

  it('should be able to modify a file using the text_editor tool', async () => {
    // Original content
    const originalContent = 'This is a test file created by the MCP client.';
    // New content
    const newContent = 'This file has been modified by the MCP client.';

    // Call the text_editor tool to replace content
    const result = await client.callTool('text_editor', {
      command: 'str_replace',
      path: tempFilePath,
      old_str: originalContent,
      new_str: newContent,
      description: 'Modifying the test file',
    });

    // Parse the result
    const parsedResult = JSON.parse(result.content[0].text);

    // Verify the result
    expect(parsedResult.success).toBe(true);
    expect(parsedResult.message).toContain('Successfully replaced text');

    // Verify the file was actually modified
    const fileContent = await fs.readFile(tempFilePath, 'utf8');
    expect(fileContent).toBe(newContent);
  }, 15000); // Increase timeout to 15 seconds
});
