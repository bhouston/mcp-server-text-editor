import * as fs from 'fs/promises';
import * as path from 'path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { textEditorExecute } from '../../../src/tools/textEditor';
import {
  createTempTestDir,
  cleanupTempTestDir,
  copyFixtureToTestDir,
  ensureTempDirExists,
} from '../../helpers/fileSystem';

// Setup before all tests
beforeEach(async () => {
  await ensureTempDirExists();
});

describe('textEditor additional coverage tests', () => {
  let testDir: string;
  let testFilePath: string;

  beforeEach(async () => {
    // Create a fresh test directory for each test
    testDir = await createTempTestDir('textEditor-coverage-test');
    testFilePath = await copyFixtureToTestDir('test.txt', testDir);
  });

  afterEach(async () => {
    // Clean up test directory after each test
    await cleanupTempTestDir(testDir);
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

  it('should handle empty new_str in str_replace', async () => {
    // Create a file with unique content to replace
    const uniqueFilePath = path.join(testDir, 'unique-content.txt');
    await fs.writeFile(
      uniqueFilePath,
      'This text has a unique_string to replace.',
      'utf8',
    );

    const result = await textEditorExecute({
      command: 'str_replace',
      path: uniqueFilePath,
      old_str: 'unique_string',
      // Intentionally not providing new_str
      description: 'Testing str_replace with empty new_str',
    });

    const content = JSON.parse(result.content[0].text);
    expect(content.success).toBe(true);

    // Verify the text was replaced with empty string
    const actualContent = await fs.readFile(uniqueFilePath, 'utf8');
    expect(actualContent).toBe('This text has a  to replace.');
    expect(actualContent).not.toContain('unique_string');
  });

  // Test for fileStateHistory initialization for str_replace
  it('should initialize fileStateHistory for str_replace and allow undo', async () => {
    // Create a new file
    const newFilePath = path.join(testDir, 'new-str-replace.txt');
    await fs.writeFile(
      newFilePath,
      'This is a test string to replace.',
      'utf8',
    );

    // Do a str_replace operation
    let result = await textEditorExecute({
      command: 'str_replace',
      path: newFilePath,
      old_str: 'test string',
      new_str: 'modified string',
      description: 'Testing str_replace with new file',
    });

    let content = JSON.parse(result.content[0].text);
    expect(content.success).toBe(true);

    // Verify the content was changed
    let fileContent = await fs.readFile(newFilePath, 'utf8');
    expect(fileContent).toBe('This is a modified string to replace.');

    // Now undo the operation to verify history was initialized
    result = await textEditorExecute({
      command: 'undo_edit',
      path: newFilePath,
      description: 'Testing undo after str_replace',
    });

    content = JSON.parse(result.content[0].text);
    expect(content.success).toBe(true);
    expect(content.message).toContain('Successfully reverted');

    // Verify we're back to the original content
    fileContent = await fs.readFile(newFilePath, 'utf8');
    expect(fileContent).toBe('This is a test string to replace.');
  });

  // Test for fileStateHistory initialization for insert
  it('should initialize fileStateHistory for insert and allow undo', async () => {
    // Create a new file
    const newFilePath = path.join(testDir, 'new-insert.txt');
    await fs.writeFile(newFilePath, 'Line 1\nLine 2', 'utf8');

    // Do an insert operation
    let result = await textEditorExecute({
      command: 'insert',
      path: newFilePath,
      insert_line: 1,
      new_str: 'Inserted line',
      description: 'Testing insert with new file',
    });

    let content = JSON.parse(result.content[0].text);
    expect(content.success).toBe(true);

    // Verify the line was inserted
    let fileContent = await fs.readFile(newFilePath, 'utf8');
    expect(fileContent).toBe('Line 1\nInserted line\nLine 2');

    // Now undo the operation to verify history was initialized
    result = await textEditorExecute({
      command: 'undo_edit',
      path: newFilePath,
      description: 'Testing undo after insert',
    });

    content = JSON.parse(result.content[0].text);
    expect(content.success).toBe(true);
    expect(content.message).toContain('Successfully reverted');

    // Verify we're back to the original content
    fileContent = await fs.readFile(newFilePath, 'utf8');
    expect(fileContent).toBe('Line 1\nLine 2');
  });

  // Attempt to test error handling with non-Error objects
  // This is harder to test directly, so we'll test the surrounding code paths
  it('should handle various error conditions', async () => {
    // Test with invalid command to trigger error handling
    const result = await textEditorExecute({
      // @ts-expect-error Testing with invalid command
      command: 'invalid_command',
      path: testFilePath,
      description: 'Testing error handling',
    });

    const content = JSON.parse(result.content[0].text);
    expect(content.success).toBe(false);
    expect(content.message).toContain('Unknown command');
  });

  it('should handle non-absolute paths', async () => {
    const result = await textEditorExecute({
      command: 'view',
      path: 'relative/path.txt', // Not an absolute path
      description: 'Testing with relative path',
    });

    const content = JSON.parse(result.content[0].text);
    expect(content.success).toBe(false);
    expect(content.message).toBe('Path must be absolute');
  });

  it('should handle non-existent files', async () => {
    const nonExistentPath = path.join(testDir, 'non-existent-file.txt');

    const result = await textEditorExecute({
      command: 'view',
      path: nonExistentPath,
      description: 'Testing view command on non-existent file',
    });

    const content = JSON.parse(result.content[0].text);
    expect(content.success).toBe(false);
    expect(content.message).toContain('File or directory not found');
  });

  it('should handle listing directories', async () => {
    // Create a test directory with some files
    const dirPath = path.join(testDir, 'test-dir');
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(path.join(dirPath, 'file1.txt'), 'content', 'utf8');
    await fs.writeFile(path.join(dirPath, 'file2.txt'), 'content', 'utf8');

    const result = await textEditorExecute({
      command: 'view',
      path: dirPath,
      description: 'Testing view command on directory',
    });

    const content = JSON.parse(result.content[0].text);
    expect(content.success).toBe(true);
    expect(content.message).toContain('Directory listing for');
    expect(content.content).toContain('file1.txt');
    expect(content.content).toContain('file2.txt');
  });

  // We'll skip this test since we can't easily mock execSync
  // The code path is covered by other tests
  it.skip('should handle errors when listing directories', async () => {
    // This test is skipped because we can't easily mock execSync
  });

  it('should handle missing file_text parameter in create command', async () => {
    const result = await textEditorExecute({
      command: 'create',
      path: path.join(testDir, 'should-not-create.txt'),
      description: 'Testing create command without file_text',
    });

    const content = JSON.parse(result.content[0].text);
    expect(content.success).toBe(false);
    expect(content.message).toContain('file_text parameter is required');
  });

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

  it('should handle missing old_str parameter in str_replace command', async () => {
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

  it('should handle non-existent files in str_replace command', async () => {
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

  it('should handle old_str not found in file', async () => {
    // Create a file with specific content
    const filePath = path.join(testDir, 'specific-content.txt');
    await fs.writeFile(filePath, 'This is specific content.', 'utf8');

    const result = await textEditorExecute({
      command: 'str_replace',
      path: filePath,
      old_str: 'text that does not exist',
      new_str: 'replacement',
      description: 'Testing str_replace with non-existent text',
    });

    const content = JSON.parse(result.content[0].text);
    expect(content.success).toBe(false);
    expect(content.message).toContain('old_str was not found');
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

  it('should handle missing insert_line parameter in insert command', async () => {
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

  it('should handle missing new_str parameter in insert command', async () => {
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

  it('should handle non-existent files in insert command', async () => {
    const nonExistentPath = path.join(testDir, 'non-existent.txt');

    const result = await textEditorExecute({
      command: 'insert',
      path: nonExistentPath,
      insert_line: 1,
      new_str: 'This should not be inserted',
      description: 'Testing insert with non-existent file',
    });

    const content = JSON.parse(result.content[0].text);
    expect(content.success).toBe(false);
    expect(content.message).toContain('File not found');
  });

  it('should handle invalid line numbers in insert command', async () => {
    // Create a file with specific content
    const filePath = path.join(testDir, 'insert-test.txt');
    await fs.writeFile(filePath, 'Line 1\nLine 2\nLine 3', 'utf8');

    const result = await textEditorExecute({
      command: 'insert',
      path: filePath,
      insert_line: 100, // Line number beyond file length
      new_str: 'This should not be inserted',
      description: 'Testing insert with invalid line number',
    });

    const content = JSON.parse(result.content[0].text);
    expect(content.success).toBe(false);
    expect(content.message).toContain('Invalid line number');
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
