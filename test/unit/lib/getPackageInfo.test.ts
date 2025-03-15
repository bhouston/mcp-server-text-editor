import { describe, it, expect } from 'vitest';

import { getPackageJson } from '../../../src/lib/getPackageInfo';

describe('getPackageInfo', () => {
  describe('getPackageJson', () => {
    it('should return the package.json content', () => {
      const packageJson = getPackageJson();

      // Verify that the returned object has the expected properties
      expect(packageJson).toBeDefined();
      expect(packageJson.name).toBe('mcp-server-text-editor');
      expect(packageJson.version).toBeDefined();
      expect(packageJson.type).toBe('module');
      expect(packageJson.bin).toBeDefined();
      expect(packageJson.bin).toBe('bin/cli.js');
    });
  });
});
