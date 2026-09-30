// Gradle uses a short Windows drive for native paths. Metro and Expo Router must
// use one canonical project root to discover routes through Bun junctions.
const { realpathSync } = require("node:fs");
const { resolve } = require("node:path");
const workspace = resolve(realpathSync(resolve(__dirname, "../node_modules/@kriyan/core")), "../..");
process.chdir(resolve(workspace, "apps/mobile"));
process.argv[1] = require.resolve("@expo/cli", { paths: [process.cwd()] });
require(process.argv[1]);
