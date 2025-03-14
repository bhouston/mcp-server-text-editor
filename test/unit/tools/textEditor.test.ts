import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import { textEditorExecute } from '../../../src/tools/textEditor';
import { 
  createTempTestDir, 
  cleanupTempTestDir, 
  copyFixtureToTestDir,
  ensureTempDirExists
} from '../../helpers/fileSystem';

// Setup before all tests
beforeEach(async () => {
  await ensureTempDirExists();
});

describe('textEditor', () => {
  let testDir: string;
  let testFilePath: string;

  beforeEach(async () => {
    // Create a fresh test directory for each test
    testDir = await createTempTestDir('textEditor-test');
    testFilePath = await copyFixtureToTestDir('test.txt', testDir);
  });

  afterEach(async () => {
    // Clean up test directory after each test
    await cleanupTempTestDir(testDir);
  });

  describe('view command', () => {
    it('should view file content', async () => {
      const result = await textEditorExecute({
        command: 'view',
        path: testFilePath,
        description: 'Testing view command',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(true);
      expect(content.message).toBe('File content:');
      expect(content.content).toContain('1: This is a sample text file.');
      expect(content.content).toContain('2: It has multiple lines.');
    });

    it('should view file content with line range', async () => {
      const result = await textEditorExecute({
        command: 'view',
        path: testFilePath,
        view_range: [2, 4],
        description: 'Testing view command with line range',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(true);
      expect(content.message).toBe('File content:');
      expect(content.content).not.toContain('1: This is a sample text file.');
      expect(content.content).toContain('2: It has multiple lines.');
      expect(content.content).toContain('3: This is line 3.');
      expect(content.content).toContain('4: This is line 4.');
      expect(content.content).not.toContain('5: This is line 5.');
    });

    it('should handle viewing a directory', async () => {
      // Mock execSync to avoid actual system calls
      vi.mock('child_process', () => ({
        execSync: vi.fn().mockReturnValue('file1.txt\nfile2.txt'),
      }));

      const result = await textEditorExecute({
        command: 'view',
        path: testDir,
        description: 'Testing view command on directory',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(true);
      expect(content.message).toContain('Directory listing for');
    });

    it('should handle non-existent files', async () => {
      const nonExistentPath = path.join(testDir, 'non-existent.txt');
      
      const result = await textEditorExecute({
        command: 'view',
        path: nonExistentPath,
        description: 'Testing view command on non-existent file',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(false);
      expect(content.message).toContain('File or directory not found');
    });
  });

  describe('create command', () => {
    it('should create a new file', async () => {
      const newFilePath = path.join(testDir, 'new-file.txt');
      const fileContent = 'This is a new file created by the test.';
      
      const result = await textEditorExecute({
        command: 'create',
        path: newFilePath,
        file_text: fileContent,
        description: 'Testing create command',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(true);
      expect(content.message).toContain('File created');
      
      // Verify file was actually created
      const actualContent = await fs.readFile(newFilePath, 'utf8');
      expect(actualContent).toBe(fileContent);
    });

    it('should overwrite an existing file', async () => {
      const fileContent = 'This content will overwrite the existing file.';
      
      const result = await textEditorExecute({
        command: 'create',
        path: testFilePath,
        file_text: fileContent,
        description: 'Testing create command to overwrite',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(true);
      expect(content.message).toContain('File overwritten');
      
      // Verify file was actually overwritten
      const actualContent = await fs.readFile(testFilePath, 'utf8');
      expect(actualContent).toBe(fileContent);
    });

    it('should handle missing file_text parameter', async () => {
      const result = await textEditorExecute({
        command: 'create',
        path: path.join(testDir, 'should-not-create.txt'),
        description: 'Testing create command without file_text',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(false);
      expect(content.message).toContain('file_text parameter is required');
    });
  });

  describe('str_replace command', () => {
    it('should replace text in a file', async () => {
      const result = await textEditorExecute({
        command: 'str_replace',
        path: testFilePath,
        old_str: 'multiple lines',
        new_str: 'replaced lines',
        description: 'Testing str_replace command',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(true);
      expect(content.message).toContain('Successfully replaced text');
      
      // Verify the text was actually replaced
      const actualContent = await fs.readFile(testFilePath, 'utf8');
      expect(actualContent).toContain('It has replaced lines');
      expect(actualContent).not.toContain('It has multiple lines');
    });

    it('should handle missing old_str parameter', async () => {
      const result = await textEditorExecute({
        command: 'str_replace',
        path: testFilePath,
        new_str: 'This should not be used',
        description: 'Testing str_replace without old_str',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(false);
      expect(content.message).toContain('old_str parameter is required');
    });

    it('should handle non-existent files', async () => {
      const nonExistentPath = path.join(testDir, 'non-existent.txt');
      
      const result = await textEditorExecute({
        command: 'str_replace',
        path: nonExistentPath,
        old_str: 'something',
        new_str: 'something else',
        description: 'Testing str_replace on non-existent file',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(false);
      expect(content.message).toContain('File not found');
    });

    it('should handle multiple occurrences of old_str', async () => {
      // Create a file with duplicate text
      const duplicateFilePath = path.join(testDir, 'duplicate.txt');
      await fs.writeFile(duplicateFilePath, 'This is a test. This is a test.', 'utf8');
      
      const result = await textEditorExecute({
        command: 'str_replace',
        path: duplicateFilePath,
        old_str: 'This is a test',
        new_str: 'Replaced text',
        description: 'Testing str_replace with duplicate text',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(false);
      expect(content.message).toContain('Found 2 occurrences of old_str');
    });

    it('should handle old_str not found in file', async () => {
      const result = await textEditorExecute({
        command: 'str_replace',
        path: testFilePath,
        old_str: 'text that does not exist',
        new_str: 'replacement',
        description: 'Testing str_replace with non-existent text',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(false);
      expect(content.message).toContain('old_str was not found');
    });
  });

  describe('insert command', () => {
    it('should insert text at a specific line', async () => {
      const result = await textEditorExecute({
        command: 'insert',
        path: testFilePath,
        insert_line: 2,
        new_str: 'This is an inserted line.',
        description: 'Testing insert command',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(true);
      expect(content.message).toContain('Successfully inserted text');
      
      // Verify the text was actually inserted
      const actualContent = await fs.readFile(testFilePath, 'utf8');
      const lines = actualContent.split('\n');
      expect(lines[2]).toBe('This is an inserted line.');
    });

    it('should handle missing insert_line parameter', async () => {
      const result = await textEditorExecute({
        command: 'insert',
        path: testFilePath,
        new_str: 'This should not be inserted',
        description: 'Testing insert without insert_line',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(false);
      expect(content.message).toContain('insert_line parameter is required');
    });

    it('should handle missing new_str parameter', async () => {
      const result = await textEditorExecute({
        command: 'insert',
        path: testFilePath,
        insert_line: 2,
        description: 'Testing insert without new_str',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(false);
      expect(content.message).toContain('new_str parameter is required');
    });

    it('should handle invalid line numbers', async () => {
      const result = await textEditorExecute({
        command: 'insert',
        path: testFilePath,
        insert_line: 100, // Line number beyond file length
        new_str: 'This should not be inserted',
        description: 'Testing insert with invalid line number',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(false);
      expect(content.message).toContain('Invalid line number');
    });
  });

  describe('undo_edit command', () => {
    it('should undo the last edit operation', async () => {
      // First make an edit
      await textEditorExecute({
        command: 'str_replace',
        path: testFilePath,
        old_str: 'multiple lines',
        new_str: 'replaced lines',
        description: 'Making an edit to undo later',
      });
      
      // Then undo it
      const result = await textEditorExecute({
        command: 'undo_edit',
        path: testFilePath,
        description: 'Testing undo_edit command',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(true);
      expect(content.message).toContain('Successfully reverted last edit');
      
      // Verify the file was restored
      const actualContent = await fs.readFile(testFilePath, 'utf8');
      expect(actualContent).toContain('It has multiple lines');
      expect(actualContent).not.toContain('It has replaced lines');
    });

    it('should handle undo with no history', async () => {
      const newFilePath = path.join(testDir, 'no-history.txt');
      await fs.writeFile(newFilePath, 'File with no edit history', 'utf8');
      
      const result = await textEditorExecute({
        command: 'undo_edit',
        path: newFilePath,
        description: 'Testing undo_edit with no history',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(false);
      expect(content.message).toContain('No edit history found');
    });
  });

  describe('error handling', () => {
    it('should handle non-absolute paths', async () => {
      const result = await textEditorExecute({
        command: 'view',
        path: 'relative/path.txt',
        description: 'Testing with relative path',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(false);
      expect(content.message).toContain('Path must be absolute');
    });

    it('should handle unknown commands', async () => {
      // @ts-expect-error Testing invalid command
      const result = await textEditorExecute({
        command: 'invalid_command',
        path: testFilePath,
        description: 'Testing invalid command',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(false);
      expect(content.message).toContain('Unknown command');
    });
  });
});