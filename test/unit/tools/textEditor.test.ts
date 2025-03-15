import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { textEditorExecute } from '../../../src/tools/textEditor';
import {
  createTempTestDir,
  cleanupTempTestDir,
  copyFixtureToTestDir,
  ensureTempDirExists,
} from '../../helpers/fileSystem';

// Mock modules
vi.mock('fs/promises');
vi.mock('fs');
vi.mock('child_process');

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

    it('should handle view range with null start and end=-1', async () => {
      const result = await textEditorExecute({
        command: 'view',
        path: testFilePath,
        // @ts-expect-error Testing with null start
        view_range: [null, -1],
        description: 'Testing view command with null start and end=-1',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(true);
      expect(content.message).toBe('File content:');
      // Should show all lines since start defaults to 1 and end=-1 means show to end
      expect(content.content).toContain('1: This is a sample text file.');
      expect(content.content).toContain('5: This is line 5.');
    });

    it('should handle view range with startLineNum=null in line numbering', async () => {
      const result = await textEditorExecute({
        command: 'view',
        path: testFilePath,
        // @ts-expect-error Testing with null start for line numbering
        view_range: [null, 5],
        description: 'Testing view command with null startLineNum',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(true);
      expect(content.message).toBe('File content:');
      // Line numbers should start from 1 by default
      expect(content.content).toContain('1: This is a sample text file.');
    });

    it('should truncate large file content', async () => {
      // Create a large file
      const largeFilePath = path.join(testDir, 'large-file.txt');
      const largeContent = 'A'.repeat(15 * 1024); // 15KB, larger than 10KB limit
      await fs.writeFile(largeFilePath, largeContent, 'utf8');

      const result = await textEditorExecute({
        command: 'view',
        path: largeFilePath,
        description: 'Testing truncating large file content',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(true);
      expect(content.message).toBe('File content (truncated):');
      expect(content.content).toContain('<response clipped>');
      expect(content.content.length).toBeLessThan(largeContent.length);
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

    it('should handle errors when listing directories', async () => {
      // Mock execSync to throw an error
      const originalExecSync = execSync;
      (execSync as Mock) = vi.fn().mockImplementation(() => {
        throw new Error('Directory listing error');
      });

      try {
        const result = await textEditorExecute({
          command: 'view',
          path: testDir,
          description: 'Testing error handling in directory listing',
        });

        const content = JSON.parse(result.content[0].text);
        expect(content.success).toBe(false);
        expect(content.message).toContain('Error listing directory');
      } finally {
        // Restore original implementation
        (execSync as any) = originalExecSync;
      }
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

    it("should initialize fileStateHistory for str_replace if it doesn't exist", async () => {
      // Create a new file that doesn't have history yet
      const newFilePath = path.join(testDir, 'new-str-replace.txt');
      await fs.writeFile(
        newFilePath,
        'This is a test string to replace.',
        'utf8',
      );

      // Delete any existing history for this file (accessing private state)
      // @ts-expect-error Accessing private module state for testing
      const fileStateHistory = (await import('../../../src/tools/textEditor'))
        .fileStateHistory;
      delete fileStateHistory[newFilePath];

      const result = await textEditorExecute({
        command: 'str_replace',
        path: newFilePath,
        old_str: 'test string',
        new_str: 'modified string',
        description: 'Testing str_replace with new history',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(true);

      // Verify the text was replaced
      const actualContent = await fs.readFile(newFilePath, 'utf8');
      expect(actualContent).toContain('This is a modified string to replace.');
    });

    it('should handle empty new_str in str_replace', async () => {
      const result = await textEditorExecute({
        command: 'str_replace',
        path: testFilePath,
        old_str: 'multiple lines',
        // Intentionally not providing new_str
        description: 'Testing str_replace with empty new_str',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(true);

      // Verify the text was replaced with empty string
      const actualContent = await fs.readFile(testFilePath, 'utf8');
      expect(actualContent).toContain('It has ');
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
      await fs.writeFile(
        duplicateFilePath,
        'This is a test. This is a test.',
        'utf8',
      );

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

    it('should handle file not found in insert command', async () => {
      // Mock existsSync to simulate file not found
      const originalExistsSync = fsSync.existsSync;
      fsSync.existsSync = vi.fn().mockReturnValue(false);

      try {
        const result = await textEditorExecute({
          command: 'insert',
          path: path.join(testDir, 'non-existent.txt'),
          insert_line: 1,
          new_str: 'This should not be inserted',
          description: 'Testing insert with non-existent file',
        });

        const content = JSON.parse(result.content[0].text);
        expect(content.success).toBe(false);
        expect(content.message).toContain('File not found');
      } finally {
        // Restore original implementation
        fsSync.existsSync = originalExistsSync;
      }
    });

    it("should initialize fileStateHistory for insert if it doesn't exist", async () => {
      // Create a new file that doesn't have history yet
      const newFilePath = path.join(testDir, 'new-insert.txt');
      await fs.writeFile(newFilePath, 'Line 1\nLine 2', 'utf8');

      // Delete any existing history for this file (accessing private state)
      // @ts-expect-error Accessing private module state for testing
      const fileStateHistory = (await import('../../../src/tools/textEditor'))
        .fileStateHistory;
      delete fileStateHistory[newFilePath];

      const result = await textEditorExecute({
        command: 'insert',
        path: newFilePath,
        insert_line: 1,
        new_str: 'Inserted line',
        description: 'Testing insert with new history',
      });

      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(true);

      // Verify the line was inserted
      const actualContent = await fs.readFile(newFilePath, 'utf8');
      expect(actualContent).toBe('Line 1\nInserted line\nLine 2');
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

    it('should handle non-Error objects in catch block', async () => {
      // Mock fs.stat to throw a string instead of an Error
      const originalStat = fs.stat;
      fs.stat = vi.fn().mockImplementation(() => {
        throw 'This is a string error';
      });

      try {
        const result = await textEditorExecute({
          command: 'view',
          path: path.join(testDir, 'not-a-file.txt'),
          description: 'Testing non-Error exception handling',
        });

        const content = JSON.parse(result.content[0].text);
        expect(content.success).toBe(false);
        expect(content.message).toBe('Unknown error');
      } finally {
        // Restore original implementation
        fs.stat = originalStat;
      }
    });
  });
});
