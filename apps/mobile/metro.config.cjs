const { getDefaultConfig } = require("expo/metro-config");
const { realpathSync } = require("node:fs");
const { resolve } = require("node:path");
// SDK 57 handles Bun workspaces automatically. A Windows subst drive is the
// exception: Bun's junctions point at the canonical drive, outside Metro's map.
const config = getDefaultConfig(__dirname);
const workspace = resolve(__dirname, "../..");
const canonicalWorkspace = resolve(realpathSync(resolve(workspace, "node_modules/@kriyan/core")), "../..");
if (canonicalWorkspace !== workspace && !config.watchFolders.includes(canonicalWorkspace)) {
  config.watchFolders.push(canonicalWorkspace);
}
module.exports = config;
