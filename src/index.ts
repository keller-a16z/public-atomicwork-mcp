#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
// Node 18+ has native fetch support

// Atomicwork API configuration
const API_KEY = process.env.ATOMICWORK_API_KEY || "";
const BASE_URL = process.env.ATOMICWORK_BASE_URL || "https://your-company.atomicwork.com/api/v1";
const USER_ID = process.env.ATOMICWORK_USER_ID || "";
const WORKSPACE_ID = process.env.ATOMICWORK_WORKSPACE_ID || "";

interface AtomicworkRequest {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigned_to?: {
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
  description?: string;
}

interface AtomicworkResponse {
  data: AtomicworkRequest[];
  total: number;
  page: number;
  per_page: number;
}

class AtomicworkMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "atomicwork-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "list_my_tickets",
            description: "List all tickets assigned to you in Atomicwork",
            inputSchema: {
              type: "object",
              properties: {
                status: {
                  type: "string",
                  description: "Filter by status (open, in_progress, resolved, closed)",
                  enum: ["open", "in_progress", "resolved", "closed"],
                },
                limit: {
                  type: "number",
                  description: "Maximum number of tickets to return (default: 50)",
                  default: 50,
                },
              },
            },
          },
          {
            name: "get_ticket_details",
            description: "Get detailed information about a specific ticket",
            inputSchema: {
              type: "object",
              properties: {
                ticket_id: {
                  type: "string",
                  description: "The ID of the ticket to retrieve",
                },
              },
              required: ["ticket_id"],
            },
          },
          {
            name: "search_tickets",
            description: "Search for tickets by keyword or criteria",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search query string",
                },
                assigned_to_me: {
                  type: "boolean",
                  description: "Only show tickets assigned to me",
                  default: true,
                },
              },
              required: ["query"],
            },
          },
          {
            name: "list_all_requests",
            description: "List all requests/tickets in the workspace (not just assigned to you). Supports filtering by requester email.",
            inputSchema: {
              type: "object",
              properties: {
                status: {
                  type: "string",
                  description: "Filter by status",
                },
                limit: {
                  type: "number",
                  description: "Maximum number of requests to return",
                  default: 50,
                },
                requester_email: {
                  type: "string",
                  description: "Filter by requester email address (e.g., 'user@company.com')",
                },
              },
            },
          },
          {
            name: "get_ticket_comments",
            description: "Get all comments/notes on a specific ticket",
            inputSchema: {
              type: "object",
              properties: {
                ticket_id: {
                  type: "string",
                  description: "The ID or display_id of the ticket (e.g., 'ITREQ-1234' or '567890')",
                },
              },
              required: ["ticket_id"],
            },
          },
        ] satisfies Tool[],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!API_KEY) {
        return {
          content: [
            {
              type: "text",
              text: "Error: ATOMICWORK_API_KEY environment variable not set. Please add your API key to continue.",
            },
          ],
        };
      }

      switch (request.params.name) {
        case "list_my_tickets":
          return await this.handleListMyTickets(request.params.arguments);

        case "get_ticket_details":
          return await this.handleGetTicketDetails(request.params.arguments);

        case "search_tickets":
          return await this.handleSearchTickets(request.params.arguments);

        case "list_all_requests":
          return await this.handleListAllRequests(request.params.arguments);

        case "get_ticket_comments":
          return await this.handleGetTicketComments(request.params.arguments);

        default:
          return {
            content: [
              {
                type: "text",
                text: `Unknown tool: ${request.params.name}`,
              },
            ],
          };
      }
    });
  }

  private async makeApiRequest(endpoint: string, options: any = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Atomicwork API error (${response.status}): ${errorText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to connect to Atomicwork: ${error.message}`);
      }
      throw error;
    }
  }

  private async handleListMyTickets(args: any) {
    try {
      const { status, limit = 50 } = args || {};

      // Use workspace-scoped endpoint with filter_name=all
      const endpoint = `/workspaces/${WORKSPACE_ID}/requests/list?filter_name=all&sort_order=CREATED_AT_DESC&page=1&is_problem=false`;

      // Build filter array - assignee filter is optional
      const filters: any[] = [];

      // Add assignee filter to get assigned tickets
      filters.push({
        attribute: "assignee",
        operator: "IN",
        values: [{
          value: parseInt(USER_ID),
          nested_filter: null
        }]
      });

      // Add status filter if specified
      if (status) {
        filters.push({
          attribute: "status",
          operator: "IN",
          values: [{ value: status }]
        });
      }

      const data = await this.makeApiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(filters),
      });

      // Format the response
      const tickets = data.data || data.requests || data || [];
      const formattedTickets = tickets
        .slice(0, limit)
        .map((ticket: any) => {
          return {
            id: ticket.id || ticket.request_id || ticket.display_id,
            title: ticket.title || ticket.subject,
            status: ticket.status,
            priority: ticket.priority || "normal",
            assigned_to: ticket.assigned_to?.name || ticket.assignee?.name || "Unassigned",
            created: ticket.created_at || ticket.created_date,
            updated: ticket.updated_at || ticket.modified_date,
            url: `${BASE_URL.replace('/api/v1', '')}/requests/${ticket.display_id || ticket.id}`
          };
        });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total: formattedTickets.length,
                tickets: formattedTickets,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching tickets: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  }

  private async handleGetTicketDetails(args: any) {
    try {
      const { ticket_id } = args;

      if (!ticket_id) {
        return {
          content: [
            {
              type: "text",
              text: "Error: ticket_id is required",
            },
          ],
        };
      }

      const data = await this.makeApiRequest(`/requests/${ticket_id}`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching ticket details: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  }

  private async handleSearchTickets(args: any) {
    try {
      const { query, assigned_to_me = true } = args;

      let endpoint = `/requests?search=${encodeURIComponent(query)}`;
      if (assigned_to_me) {
        endpoint += "&assigned_to_me=true";
      }

      const data = await this.makeApiRequest(endpoint);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching tickets: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  }

  private async handleListAllRequests(args: any) {
    try {
      const { status, limit = 50, requester_email } = args || {};

      // Fetch more results if filtering by email (we'll filter client-side)
      // Cap at 100 due to Atomicwork API limitation
      const fetchLimit = requester_email ? Math.min(limit * 3, 100) : Math.min(limit, 100);

      // Use workspace-scoped endpoint
      const endpoint = `/workspaces/${WORKSPACE_ID}/requests/list?filter_name=all&sort_order=CREATED_AT_DESC&page=1&per_page=${fetchLimit}`;

      // Build filter array
      const filters: any[] = [];

      // Add status filter if specified (can be done server-side)
      if (status) {
        filters.push({
          attribute: "status",
          operator: "IN",
          values: [{ value: status }]
        });
      }

      const data = await this.makeApiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(filters),
      });

      // Client-side filtering by requester email if specified
      if (requester_email && data.data) {
        const normalizedEmail = requester_email.toLowerCase().trim();
        data.data = data.data.filter((request: any) => {
          const reqEmail = request.requester?.email?.toLowerCase().trim();
          return reqEmail === normalizedEmail;
        });

        // Update counts to reflect filtered results
        data.total_count = data.data.length;
        data.total_pages = Math.ceil(data.data.length / limit);

        // Apply limit to filtered results
        data.data = data.data.slice(0, limit);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching requests: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  }

  private async handleGetTicketComments(args: any) {
    try {
      const { ticket_id } = args;

      if (!ticket_id) {
        return {
          content: [
            {
              type: "text",
              text: "Error: ticket_id is required",
            },
          ],
        };
      }

      // Try the workspace-scoped notes endpoint
      // Based on Atomicwork API patterns, notes/comments are usually at /workspaces/{workspace}/requests/{id}/notes
      const endpoint = `/workspaces/${WORKSPACE_ID}/requests/${ticket_id}/notes`;

      const data = await this.makeApiRequest(endpoint);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      // If workspace endpoint fails, try the simpler endpoint
      try {
        const simpleEndpoint = `/requests/${args.ticket_id}/notes`;
        const data = await this.makeApiRequest(simpleEndpoint);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (fallbackError) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching ticket comments: ${
                error instanceof Error ? error.message : "Unknown error"
              }. Fallback also failed: ${
                fallbackError instanceof Error ? fallbackError.message : "Unknown error"
              }`,
            },
          ],
        };
      }
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Atomicwork MCP server running on stdio");
  }
}

const server = new AtomicworkMCPServer();
server.run().catch(console.error);
