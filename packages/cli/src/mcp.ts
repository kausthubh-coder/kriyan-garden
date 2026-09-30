// Keep these examples in step with docs/mcp.md. Replace the app origin for self-hosted servers.
export function mcpSetup(base: string) {
  const endpoint = `${base}/mcp`;
  return {
    endpoint,
    claude: `Claude web or desktop: Settings > Connectors > Add custom connector. Name: Kriyan. Remote MCP server URL: ${endpoint}. Connect and approve the requested scopes.`,
    claudeCode: `claude mcp add --transport http kriyan ${endpoint}`,
    chatgpt: `ChatGPT: Settings > Security and login > Developer mode. Open Plugins, select +, and add Kriyan with MCP server URL ${endpoint}, choose OAuth, then connect.`,
    cursor: JSON.stringify({ mcpServers: { kriyan: { url: endpoint } } }, null, 2),
    vscode: JSON.stringify({ servers: { kriyan: { type: "http", url: endpoint } } }, null, 2),
  };
}

export function formatMcp(base: string): string {
  const setup = mcpSetup(base);
  return `${setup.claude}\n\nClaude Code\n${setup.claudeCode}\n\n${setup.chatgpt}\n\nCursor, .cursor/mcp.json\n${setup.cursor}\n\nVS Code, .vscode/mcp.json\n${setup.vscode}\n\nAllow tasks:read, tasks:write, spaces:read, spaces:write, goals:read and goals:write when you connect.`;
}
