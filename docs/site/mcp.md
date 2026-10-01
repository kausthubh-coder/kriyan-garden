# Plan with your AI

Kriyan's remote MCP endpoint is `https://app.kriyan.app/mcp`. An OAuth-capable client signs you in through Clerk and asks you to approve access to your planner.

Clerk development is the hosted identity provider. Dynamic registration, client metadata documents and resource audience claims are configured through the Clerk CLI. Sign-in uses S256 PKCE, consent and the standard scopes `openid profile email`. A token for the exact `/mcp` resource grants access only to your own planner. No Clerk dashboard steps are needed.

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

Ask your AI to show your day, find a task or add a task in plain language. Your AI client may need a paid plan or developer features for remote MCP. Review the access you approve. Disconnect clients in Settings or revoke authorization through your identity provider. Start with `get_overview` or `get_day`, then use `quick_add` and `complete_task`. Your assistant reads your planner before writing and repeats the stored result after each write. API-resource, expired and missing tokens are refused by MCP. Clerk development has a 100-user limit and shows a development banner on its hosted pages.
