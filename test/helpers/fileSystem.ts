import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Helper function to create a temporary test directory
 */
export async function createTempTestDir(testName: string): Promise<string> {
  const tempDir = path.join(process.cwd(), 'test', 'temp', testName);
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

/**
 * Helper function to clean up a temporary test directory
 */
export async function cleanupTempTestDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    console.error(`Error cleaning up temp directory: ${error}`);
  }
}

/**
 * Copy a fixture file to a test directory
 */
export async function copyFixtureToTestDir(
  fixtureName: string,
  testDir: string,
  newName?: string,
): Promise<string> {
  const fixturePath = path.join(
    process.cwd(),
    'test',
    'fixtures',
    'sample-files',
    fixtureName,
  );
  const destName = newName || fixtureName;
  const destPath = path.join(testDir, destName);

  const content = await fs.readFile(fixturePath, 'utf8');
  await fs.writeFile(destPath, content, 'utf8');

  return destPath;
}

/**
 * Create the temp directory for tests if it doesn't exist
 */
export async function ensureTempDirExists(): Promise<void> {
  const tempDir = path.join(process.cwd(), 'test', 'temp');
  await fs.mkdir(tempDir, { recursive: true });
}
