# Plan with your AI

Kriyan's remote MCP endpoint is `https://app.kriyan.app/mcp`. An OAuth-capable client signs you in through Clerk and asks you to approve access to your planner.

The following setup drafts are provided for integration. The MCP worker (brief 05) is finalizing supported clients, scopes and tool behavior. Production domain and OAuth configuration have not been verified here. These snippets are not a claim that a live connection has passed testing. No original docs/mcp.md existed in this base checkout.

## Claude

```text
Open Settings > Connectors > Add custom connector.
Name: Kriyan
Remote MCP server URL: https://app.kriyan.app/mcp
Connect and approve access through Clerk.
```

## Claude Code

```sh
claude mcp add --transport http kriyan https://app.kriyan.app/mcp
# Run /mcp in Claude Code to sign in and approve access.
```

## ChatGPT

```text
Open Settings > Apps and enable developer mode where available.
Create an app named Kriyan.
MCP server URL: https://app.kriyan.app/mcp
Authentication: OAuth
Connect and approve access through Clerk.
```

## Cursor

```json
{
  "mcpServers": {
    "kriyan": {
      "url": "https://app.kriyan.app/mcp"
    }
  }
}
```

## VS Code

```json
{
  "servers": {
    "kriyan": {
      "type": "http",
      "url": "https://app.kriyan.app/mcp"
    }
  }
}
```

## What to expect

Ask your AI to show your day, find a task or add a task in plain language. Your AI client may need a paid plan or developer features for remote MCP. Review the access you approve. Disconnect clients in Settings or revoke authorization through your identity provider. Tool names, exact scopes and client verification results will be supplied by brief 05 during integration.
