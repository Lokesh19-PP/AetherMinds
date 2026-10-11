import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sqliteModule = require('node:sqlite');

export const DatabaseSync = sqliteModule.DatabaseSync;
export type DatabaseSync = any;
