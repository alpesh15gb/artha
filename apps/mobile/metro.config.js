const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Force Metro to resolve specific packages from the project's node_modules first
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Prevent Metro from traversing up the directory tree to find packages
// This is critical in monorepos to avoid picking up conflicting root dependencies
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
