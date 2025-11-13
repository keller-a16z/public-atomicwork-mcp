# Atomicwork MCP Server

![MCP](https://img.shields.io/badge/MCP-Atomicwork-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

A Model Context Protocol (MCP) server that integrates [Atomicwork](https://www.atomicwork.com/) with Claude Desktop and other MCP clients. This allows AI assistants like Claude to interact with your Atomicwork tickets, requests, and workflows directly.

## What is Atomicwork?

Atomicwork is an enterprise service management platform that helps IT teams manage tickets, requests, changes, and incidents. This MCP server brings that functionality into your AI workflow.

## Features

- 📋 **List Tickets** - View all tickets assigned to you
- 🔍 **Search Tickets** - Find tickets by keyword or criteria
- 📊 **Get Ticket Details** - Retrieve complete information about any ticket
- 🌐 **Workspace Access** - List all requests in your workspace
- 👤 **Filter by User** - List requests by requester email
- 💬 **View Comments** - Get all comments and notes on tickets

## Requirements

- **Node.js** 18.0 or higher
- **Atomicwork Account** with API access
- **Claude Desktop** or another MCP-compatible client

## Installation

### Option 1: Clone and Build from Source

```bash
# Clone the repository
git clone https://github.com/keller-a16z/public-atomicwork-mcp.git
cd public-atomicwork-mcp

# Install dependencies
npm install  # or: bun install

# Build the project
npm run build  # or: bun run build
```

## Configuration

### Step 1: Get Your Atomicwork API Key

1. Log into your Atomicwork instance
2. Navigate to **Settings → API** (usually at `https://your-company.atomicwork.com/settings/api`)
3. Generate a new API key
4. Copy the key - you'll need it for configuration

### Step 2: Find Your User ID and Workspace ID

**Finding your User ID:**
1. Open your browser's Developer Tools (F12)
2. Go to the Network tab
3. Navigate to any page in Atomicwork
4. Look for API requests to `/api/v1/users/me` or similar
5. Your user ID will be in the response (usually a number like `12345`)

**Finding your Workspace ID:**
1. In the same Network tab
2. Look for API requests to `/api/v1/workspaces/`
3. Your workspace ID will be in the URL (usually a number like `123` or `456`)

### Step 3: Configure Claude Desktop

Add the MCP server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "atomicwork": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/public-atomicwork-mcp/dist/index.js"
      ],
      "env": {
        "ATOMICWORK_API_KEY": "your_api_key_here",
        "ATOMICWORK_BASE_URL": "https://your-company.atomicwork.com/api/v1",
        "ATOMICWORK_USER_ID": "your_user_id",
        "ATOMICWORK_WORKSPACE_ID": "your_workspace_id"
      }
    }
  }
}
```

**Replace:**
- `/ABSOLUTE/PATH/TO/public-atomicwork-mcp/dist/index.js` with the actual path to the built server
- `your_api_key_here` with your Atomicwork API key
- `your-company` with your Atomicwork instance subdomain
- `your_user_id` with your user ID
- `your_workspace_id` with your workspace ID

### Step 4: Restart Claude Desktop

Close and reopen Claude Desktop to load the new MCP server.

## Usage

Once configured, you can interact with Atomicwork through natural language in Claude Desktop:

### Example Queries

**List your tickets:**
```
Show me my current Atomicwork tickets
```

**Get ticket details:**
```
Get details for Atomicwork ticket ITREQ-1234
```

**Search for tickets:**
```
Search for tickets about "password reset"
```

**List all workspace requests:**
```
Show me all open requests in the workspace
```

**Filter requests by user:**
```
Show me all tickets from user@company.com
List requests created by john@company.com
```

**View ticket comments:**
```
Show me comments on ticket ITREQ-1234
Get all notes for this ticket
```

## Available Tools

### `list_my_tickets`
Lists all tickets assigned to you.

**Parameters:**
- `status` (optional): Filter by status (`open`, `in_progress`, `resolved`, `closed`)
- `limit` (optional): Maximum number of tickets to return (default: 50)

**Example:**
```
List my in-progress tickets
```

### `get_ticket_details`
Gets detailed information about a specific ticket.

**Parameters:**
- `ticket_id` (required): The ID of the ticket

**Example:**
```
Show me ticket ITREQ-1234
```

### `search_tickets`
Searches for tickets by keyword.

**Parameters:**
- `query` (required): Search query string
- `assigned_to_me` (optional): Only show tickets assigned to you (default: true)

**Example:**
```
Find tickets mentioning "GitHub"
```

### `list_all_requests`
Lists all requests in the workspace (not just yours). Can filter by requester email.

**Parameters:**
- `status` (optional): Filter by status
- `limit` (optional): Maximum number of requests (default: 50)
- `requester_email` (optional): Filter by requester email address (e.g., `user@company.com`)

**Examples:**
```
Show all open requests in the workspace
Show me all tickets from john@company.com
List requests from jane@company.com
```

### `get_ticket_comments`
Gets all comments and notes on a specific ticket.

**Parameters:**
- `ticket_id` (required): The ID or display_id of the ticket (e.g., `ITREQ-1234`)

**Example:**
```
Show me comments on ticket ITREQ-1234
Get all notes for ticket 567890
```

## Troubleshooting

### MCP Server Not Appearing

1. **Check the configuration file path** - Ensure you edited the correct `claude_desktop_config.json`
2. **Verify the dist path** - Make sure the path to `dist/index.js` is absolute and correct
3. **Restart Claude Desktop** - Changes require a full restart
4. **Check logs** - Look for errors in Claude Desktop's logs

### API Connection Errors

**"Failed to connect to Atomicwork"**
- Verify your API key is correct
- Check that your base URL matches your Atomicwork instance
- Ensure you have network access to your Atomicwork instance
- Try accessing `https://your-company.atomicwork.com/api/v1/users/me` in your browser with the API key

**"Access Token X-Api-Key is missing/invalid"**
- Double-check your API key in the configuration
- Ensure the API key hasn't expired
- Try regenerating a new API key in Atomicwork

### No Tickets Returned

**"Error: ATOMICWORK_USER_ID not set"**
- Make sure you've added your user ID to the configuration
- Verify the user ID is correct (it should be a number)

**"Error: ATOMICWORK_WORKSPACE_ID not set"**
- Add your workspace ID to the configuration
- Verify the workspace ID is correct (it should be a number)

### Build Errors

If you're building from source and encounter errors:

```bash
# Clean and rebuild
rm -rf node_modules dist
npm install  # or: bun install
npm run build  # or: bun run build
```

## Development

### Running Locally

```bash
# Install dependencies
bun install

# Build the project
bun run build

# Test the MCP server
node dist/index.js
```

### Project Structure

```
public-atomicwork-mcp/
├── src/
│   └── index.ts          # Main MCP server implementation
├── dist/                 # Compiled JavaScript output
├── package.json          # Project dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── .env.example          # Environment variable template
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## Security

- **Never commit your API keys** - Use environment variables
- **Keep your API key secure** - Don't share it publicly
- **Regenerate compromised keys** - If your key is exposed, regenerate it immediately in Atomicwork

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Links

- [Atomicwork](https://www.atomicwork.com/)
- [Atomicwork API Documentation](https://developer.atomicwork.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Desktop](https://claude.ai/desktop)

## Support

For issues and questions:
- **Bug reports**: [GitHub Issues](https://github.com/keller-a16z/public-atomicwork-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/keller-a16z/public-atomicwork-mcp/discussions)

## Acknowledgments

Inspired by the [ClickUp MCP Server](https://github.com/taazkareem/clickup-mcp-server) by taazkareem.
