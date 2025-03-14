import { createRequire } from 'module';

import { PackageJson } from 'type-fest';

export function getPackageJson(): PackageJson {
  const require = createRequire(import.meta.url);
  return require('../../package.json') as PackageJson;
}
