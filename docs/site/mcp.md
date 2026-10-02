# Plan with your AI

Kriyan's remote MCP endpoint is `https://app.kriyan.app/mcp`. Plan with the AI you already use in your own areas. Your assistant uses your area names and never assumes the suggested defaults. An OAuth-capable client signs you in through Clerk and asks you to approve access to your planner.

Clerk development is the hosted identity provider. Dynamic registration, client metadata documents and resource audience claims are configured through the Clerk CLI. Sign-in uses S256 PKCE, consent and the standard scopes `openid profile email`. A token for the exact `/mcp` resource grants access only to your own planner. No Clerk dashboard steps are needed.

The [Kriyan home page](https://kriyan.app/#connect) has one-click install buttons for Cursor and VS Code and copyable setup for the other clients.

## Set up with a prompt

Paste this into an AI app that can change its own settings, such as Claude Code, Cursor or Codex:

```text
Set up the Kriyan MCP server for me. It is a remote MCP server at https://app.kriyan.app/mcp that uses streamable HTTP and OAuth, with no API key. Add it to this app's MCP settings with the name kriyan. Then tell me how to sign in and approve access, and once it is connected, show me my plan for today.
```

## Organise your life

Once Kriyan is connected, open your assistant in the folder where your schoolwork and projects live (Codex, Claude Code and Cursor can read it) and paste:

```text
Use the Kriyan MCP server to organise my life. Read my class schedule, assignments and projects from this folder and our conversation, show me the plan, and add it to Kriyan once I agree.
```

Your assistant turns classes into weekly class times and courses, homework into tasks with deadlines, and longer work into projects and goals. It shows you the plan first and saves it only when you agree. Run it again when new work arrives; anything already in Kriyan is left alone. In Claude Code the same flow is the `/mcp__kriyan__organize_my_life` command, alongside `plan_my_week`, `plan_today`, `weekly_review` and `add_class_schedule`.

## Claude

```text
Open https://claude.ai/customize/connectors, select + and choose Add custom connector.
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

Ask your AI to show your day, find a task or add a task in plain language. Your AI client may need a paid plan or developer features for remote MCP. Review the access you approve. Disconnect clients in Settings or revoke authorization through your identity provider. Start with `get_overview` or `get_day`. Your assistant can do everything the app can, from tasks, repeats and reminders to class times, habits, goals and areas. Your assistant reads your planner before writing and repeats the stored result after each write. API-resource, expired and missing tokens are refused by MCP. Clerk development has a 100-user limit and shows a development banner on its hosted pages.
