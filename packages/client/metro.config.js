const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force Metro to resolve pretty-format to v29 at root node_modules.
// pnpm's .pnpm store contains a v30 copy that @expo/metro-runtime's
// HMRClient picks up via symlinks, causing "prettyFormat.default is undefined".
const prettyFormatPath = path.resolve(monorepoRoot, 'node_modules/pretty-format');
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'pretty-format') {
    return { type: 'sourceFile', filePath: require.resolve('pretty-format', { paths: [prettyFormatPath] }) };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
