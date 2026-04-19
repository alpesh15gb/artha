const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch the root workspace for changes in shared packages
config.watchFolders = [workspaceRoot];

// 2. Add both local and root node_modules to the search path
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Ensure we can resolve native modules even if they are in the root
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
