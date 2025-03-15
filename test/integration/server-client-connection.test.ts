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
    console.log('Test: Starting connection to server...');
    
    try {
      // Connect to the server
      console.log(`Test: Connecting to server at ${SERVER_SCRIPT_PATH}`);
      const tools = await client.connectToServer(SERVER_SCRIPT_PATH);
      console.log('Test: Successfully connected to server');
      
      // Verify connection and tools
      console.log(`Test: Received ${tools?.length ?? 0} tools from server`);
      expect(tools).toBeDefined();
      expect(tools.length).toBeGreaterThan(0);

      // Verify that text_editor tool is available
      const textEditorTool = tools.find((tool) => tool.name === 'text_editor');
      console.log(`Test: Text editor tool ${textEditorTool ? 'found' : 'NOT found'}`);
      expect(textEditorTool).toBeDefined();
      
      console.log('Test: Server connection test completed successfully');
    } catch (error) {
      console.error('Test ERROR: Failed to connect to server:', error);
      throw error;
    }
  }, 30000); // Increase timeout to 30 seconds for this test

  it('should be able to create a file using the text_editor tool', async () => {
    console.log('Test: Starting file creation test...');
    
    try {
      // Test file content
      const testContent = 'This is a test file created by the MCP client.';
      console.log(`Test: Creating file at ${tempFilePath}`);

      // Call the text_editor tool to create a file
      console.log('Test: Calling text_editor tool with create command');
      const result = await client.callTool('text_editor', {
        command: 'create',
        path: tempFilePath,
        file_text: testContent,
        description: 'Creating a test file',
      });
      console.log('Test: Received response from text_editor tool');

      // Parse the result (which comes as a JSON string inside a content object)
      console.log('Test: Parsing result');
      const parsedResult = JSON.parse(result.content[0].text);
      console.log(`Test: Parsed result - success: ${parsedResult.success}, message: ${parsedResult.message}`);

      // Verify the result
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.message).toContain('File created');

      // Verify the file was actually created with the correct content
      console.log('Test: Verifying file content');
      const fileContent = await fs.readFile(tempFilePath, 'utf8');
      console.log(`Test: File content length: ${fileContent.length}`);
      expect(fileContent).toBe(testContent);
      
      console.log('Test: File creation test completed successfully');
    } catch (error) {
      console.error('Test ERROR: Failed during file creation test:', error);
      throw error;
    }
  }, 30000); // Increase timeout to 30 seconds

  it('should be able to view a file using the text_editor tool', async () => {
    console.log('Test: Starting file view test...');
    
    try {
      // Call the text_editor tool to view the file
      console.log(`Test: Viewing file at ${tempFilePath}`);
      const result = await client.callTool('text_editor', {
        command: 'view',
        path: tempFilePath,
        description: 'Viewing the test file',
      });
      console.log('Test: Received response from text_editor tool');

      // Parse the result
      console.log('Test: Parsing result');
      const parsedResult = JSON.parse(result.content[0].text);
      console.log(`Test: Parsed result - success: ${parsedResult.success}, message: ${parsedResult.message}`);

      // Verify the result
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.message).toContain('File content');
      expect(parsedResult.content).toContain('This is a test file');
      
      console.log('Test: File view test completed successfully');
    } catch (error) {
      console.error('Test ERROR: Failed during file view test:', error);
      throw error;
    }
  }, 30000); // Increase timeout to 30 seconds

  it('should be able to modify a file using the text_editor tool', async () => {
    console.log('Test: Starting file modification test...');
    
    try {
      // Original content
      const originalContent = 'This is a test file created by the MCP client.';
      // New content
      const newContent = 'This file has been modified by the MCP client.';
      console.log(`Test: Modifying file at ${tempFilePath}`);

      // Call the text_editor tool to replace content
      console.log('Test: Calling text_editor tool with str_replace command');
      const result = await client.callTool('text_editor', {
        command: 'str_replace',
        path: tempFilePath,
        old_str: originalContent,
        new_str: newContent,
        description: 'Modifying the test file',
      });
      console.log('Test: Received response from text_editor tool');

      // Parse the result
      console.log('Test: Parsing result');
      const parsedResult = JSON.parse(result.content[0].text);
      console.log(`Test: Parsed result - success: ${parsedResult.success}, message: ${parsedResult.message}`);

      // Verify the result
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.message).toContain('Successfully replaced text');

      // Verify the file was actually modified
      console.log('Test: Verifying file modification');
      const fileContent = await fs.readFile(tempFilePath, 'utf8');
      console.log(`Test: Modified file content: "${fileContent}"`);
      expect(fileContent).toBe(newContent);
      
      console.log('Test: File modification test completed successfully');
    } catch (error) {
      console.error('Test ERROR: Failed during file modification test:', error);
      throw error;
    }
  }, 30000); // Increase timeout to 30 seconds
});
