import { KRIYAN_APP_ORIGIN } from "./origins";

export const KRIYAN_MCP_URL = `${KRIYAN_APP_ORIGIN}/mcp`;

export type McpClient = {
  name: string;
  /** Opens the client, or installs Kriyan into it in one step. */
  action?: { label: string; href: string };
  /** A terminal command to copy instead of an action. */
  command?: string;
  /** The action installs Kriyan, so the URL is only a manual fallback. */
  oneClick?: boolean;
  steps: string[];
  note?: string;
};

// Install link formats: https://cursor.com/docs/context/mcp/install-links and
// the VS Code `mcp/install` redirect used by github/github-mcp-server.
const cursorConfig = encodeURIComponent(btoa(JSON.stringify({ url: KRIYAN_MCP_URL })));
const vscodeConfig = encodeURIComponent(JSON.stringify({ type: "http", url: KRIYAN_MCP_URL }));

export const mcpClients: McpClient[] = [
  {
    name: "Claude",
    action: { label: "Open Claude connectors", href: "https://claude.ai/customize/connectors" },
    steps: [
      "Select + and choose Add custom connector.",
      "Name it Kriyan and paste the server URL.",
      "Select Connect, then sign in and approve access.",
    ],
    note: "Works in Claude on the web, desktop and mobile. Free plans allow one custom connector.",
  },
  {
    name: "ChatGPT",
    action: { label: "Open ChatGPT", href: "https://chatgpt.com/" },
    steps: [
      "Open Settings, then Apps. Under Advanced settings, turn on Developer mode.",
      "Select Create app, name it Kriyan and paste the server URL.",
      "Choose OAuth, then sign in and approve access.",
      "In a new chat, open the + menu and turn on Kriyan.",
    ],
    note: "Needs a paid ChatGPT plan, on the web.",
  },
  {
    name: "Claude Code",
    command: `claude mcp add --transport http kriyan ${KRIYAN_MCP_URL}`,
    steps: [
      "Run the command in your terminal.",
      "In Claude Code, run /mcp, choose kriyan and sign in.",
    ],
  },
  {
    name: "Cursor",
    oneClick: true,
    action: { label: "Add to Cursor", href: `https://cursor.com/en/install-mcp?name=kriyan&config=${cursorConfig}` },
    steps: [
      "Select Add to Cursor and confirm the install in Cursor.",
      "When Cursor asks, sign in and approve access.",
    ],
  },
  {
    name: "VS Code",
    oneClick: true,
    action: { label: "Add to VS Code", href: `https://insiders.vscode.dev/redirect/mcp/install?name=kriyan&config=${vscodeConfig}` },
    steps: [
      "Select Add to VS Code and choose Install.",
      "When VS Code asks, sign in and approve access.",
      "Use Kriyan from Copilot Chat in agent mode.",
    ],
  },
  {
    name: "Other",
    steps: [
      "Add a remote MCP server with the server URL.",
      "Choose streamable HTTP and OAuth if the client asks.",
      "Sign in and approve access.",
    ],
    note: "Any client that supports remote MCP with OAuth works.",
  },
];
