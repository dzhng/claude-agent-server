![download-kg285ggv19c87syh8aebykaxk97vs261 (1)](https://github.com/user-attachments/assets/9934e58d-7f8e-4f79-8427-5f2e65aeaeb0)

# Claude Agent SDK WebSocket Server

A WebSocket server that wraps the Claude Agent SDK, allowing real-time bidirectional communication with Claude through WebSockets. Deploy it as an E2B sandbox and connect via the TypeScript client library.

## Overview

**Typical Workflow:**

1. **Build Your E2B Image** - Deploy the server as an E2B sandbox template using `bun run build:e2b`
2. **Use the Client Library** - Install `@dzhng/claude-agent` in your project and connect to your E2B sandbox
3. **Modify the Server (Optional)** - If you need custom behavior, edit the server code in `packages/server/`
4. **Test Locally** - Use `bun run start:server` and `bun run test:local` to test your changes before rebuilding

## Quick Start

### 1. Setup Environment

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Add your API keys:

```bash
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
E2B_API_KEY=e2b_your-api-key-here
```

Install dependencies:

```bash
bun install
```

### 2. Build Your E2B Image

Build and deploy the server as an E2B template:

```bash
bun run build:e2b
```

This creates a sandbox template named `claude-agent-server` on E2B. The build process:

- Creates a sandbox based on Bun 1.3
- Installs git and clones this repository
- Installs dependencies
- Configures the server to start automatically on port 3000

The build may take a few minutes. Once complete, your template is ready to use.

### 3. Use the Client Library

Install the client library in your project:

```bash
npm install @dzhng/claude-agent
# or
bun add @dzhng/claude-agent
```

Connect to your E2B sandbox:

```typescript
import { ClaudeAgentClient } from '@dzhng/claude-agent'

const client = new ClaudeAgentClient({
  e2bApiKey: process.env.E2B_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  template: 'claude-agent-server', // Your E2B template name
  debug: true,
})

// Start the client (creates E2B sandbox and connects)
await client.start()

// Listen for messages from Claude
client.onMessage(message => {
  if (message.type === 'sdk_message') {
    console.log('Claude:', message.data)
  }
})

// Send a message to Claude
client.send({
  type: 'user_message',
  data: {
    type: 'user',
    session_id: 'my-session',
    message: {
      role: 'user',
      content: 'Hello, Claude!',
    },
  },
})

// Clean up when done
await client.stop()
```

That's it! The client library handles:

- Creating and managing E2B sandboxes
- WebSocket connection
- Message serialization
- Cleanup and resource management

## Modifying the Server

If you want to customize the server behavior:

### 1. Edit Server Code

The server code is in `packages/server/`:

- `index.ts` - Main server and WebSocket handling
- `message-handler.ts` - Message processing logic
- `const.ts` - Configuration constants

### 2. Test Locally

Start the server locally:

```bash
bun run start:server
```

In another terminal, run the test client against localhost:

```bash
bun run test:local
```

This runs `packages/client/example-client.ts` connected to `localhost:3000` instead of E2B.

### 3. Rebuild E2B Image

Once you're satisfied with your changes, rebuild the E2B template:

```bash
bun run build:e2b
```

Your updated server will be deployed to E2B with the same template name.

## Available Scripts

### `bun run build:e2b`

Builds and deploys the server as an E2B template. This is the main way to deploy your server to the cloud.

### `bun run test:client`

Runs the example client (`packages/client/example-client.ts`) connected to an E2B sandbox. Requires both `E2B_API_KEY` and `ANTHROPIC_API_KEY` in your `.env` file.

### `bun run start:server`

Starts the server locally on `http://localhost:3000`. Use this for local development and testing.

### `bun run test:local`

Runs the example client connected to `localhost:3000`. Use this to test your local server changes before rebuilding the E2B image.

## Client Library API

### Installation

```bash
npm install @dzhng/claude-agent
# or
bun add @dzhng/claude-agent
```

### Constructor Options

```typescript
interface ClientOptions {
  // Required (unless using environment variables)
  anthropicApiKey?: string

  // E2B Configuration (optional if using connectionUrl)
  e2bApiKey?: string
  template?: string // E2B template name, defaults to 'claude-agent-server'
  timeoutMs?: number // Sandbox timeout, defaults to 5 minutes

  // Connection Configuration
  connectionUrl?: string // Use this to connect to local/custom server instead of E2B

  // Other Options
  debug?: boolean // Enable debug logging

  // Query Configuration (passed to server)
  agents?: Record<string, AgentDefinition>
  allowedTools?: string[]
  systemPrompt?:
    | string
    | { type: 'preset'; preset: 'claude_code'; append?: string }
  model?: string
}
```

### Methods

- **`async start()`** - Initialize the client and connect to the server
- **`send(message: WSInputMessage)`** - Send a message to the agent
- **`onMessage(handler: (message: WSOutputMessage) => void)`** - Register a message handler (returns unsubscribe function)
- **`async stop()`** - Disconnect and clean up resources

### Example: Connect to E2B

```typescript
import { ClaudeAgentClient } from '@dzhng/claude-agent'

const client = new ClaudeAgentClient({
  e2bApiKey: process.env.E2B_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  template: 'claude-agent-server',
  debug: true,
})

await client.start()

client.onMessage(message => {
  if (message.type === 'sdk_message') {
    console.log('Claude:', message.data)
  }
})

client.send({
  type: 'user_message',
  data: {
    type: 'user',
    session_id: 'session-1',
    message: { role: 'user', content: 'Hello' },
  },
})

await client.stop()
```

### Example: Connect to Local Server

```typescript
const client = new ClaudeAgentClient({
  connectionUrl: 'http://localhost:3000',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
})

await client.start()
```

For more details, see [`packages/client/README.md`](packages/client/README.md).

## Server API Reference

**Note:** If you're using the `@dzhng/claude-agent` library, you don't need to interact with these endpoints directly. The client handles configuration and WebSocket connections for you. This section is for advanced users who want to connect to the server directly or build their own client.

The server runs on `http://localhost:3000` (or your E2B sandbox URL) with:

- Config endpoint: `http://localhost:3000/config`
- WebSocket endpoint: `ws://localhost:3000/ws`

### Configuration API

#### POST /config

Set the configuration for the Claude Agent SDK query:

```typescript
type QueryConfig = {
  agents?: Record<string, AgentDefinition>
  allowedTools?: string[]
  systemPrompt?:
    | string
    | {
        type: 'preset'
        preset: 'claude_code'
        append?: string
      }
  model?: string
  anthropicApiKey?: string
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/config \
  -H "Content-Type: application/json" \
  -d '{
    "systemPrompt": "You are a helpful assistant.",
    "allowedTools": ["read_file", "write_file"],
    "anthropicApiKey": "sk-ant-...",
    "model": "claude-3-5-sonnet-20241022",
    "agents": {
      "myAgent": {
        "name": "My Custom Agent",
        "description": "A custom agent"
      }
    }
  }'
```

**Response:**

```json
{
  "success": true,
  "config": {
    "systemPrompt": "You are a helpful assistant.",
    "allowedTools": ["read_file", "write_file"],
    "agents": { ... }
  }
}
```

#### GET /config

Get the current configuration:

```bash
curl http://localhost:3000/config
```

**Response:**

```json
{
  "config": {
    "systemPrompt": "You are a helpful assistant.",
    "allowedTools": ["read_file", "write_file"]
  }
}
```

### WebSocket API

#### Connecting

Connect to the WebSocket endpoint:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws')
```

**Note:** The server only accepts **one active connection at a time**. If another client is already connected, new connection attempts will be rejected with an error message.

#### Message Format

**Sending Messages (Client → Server)**

```typescript
type WSInputMessage =
  | {
      type: 'user_message'
      data: SDKUserMessage
    }
  | {
      type: 'interrupt'
    }
```

**User Message:**

Send a wrapped `SDKUserMessage`:

```json
{
  "type": "user_message",
  "data": {
    "type": "user",
    "session_id": "your-session-id",
    "parent_tool_use_id": null,
    "message": {
      "role": "user",
      "content": "Hello, Claude!"
    }
  }
}
```

**Structure:**

- `type`: Must be `"user_message"`
- `data`: An `SDKUserMessage` object containing:
  - `type`: Must be `"user"`
  - `session_id`: Your session identifier (string)
  - `message`: An object with `role` and `content`
    - `role`: Must be `"user"`
    - `content`: The message content (string)
  - `parent_tool_use_id`: Optional, for tool use responses
  - `uuid`: Optional, message UUID (auto-generated if not provided)

**Interrupt Message:**

Send an interrupt to stop the current agent operation:

```json
{
  "type": "interrupt"
}
```

**Receiving Messages (Server → Client)**

```typescript
type WSOutputMessage =
  | { type: 'connected' }
  | { type: 'sdk_message'; data: unknown }
  | { type: 'error'; error: string }
```

Connection confirmation:

```json
{
  "type": "connected"
}
```

SDK messages (responses from Claude):

```json
{
  "type": "sdk_message",
  "data": {
    "type": "assistant",
    "session_id": "...",
    "message": {
      /* Claude's response */
    }
  }
}
```

Error messages:

```json
{
  "type": "error",
  "error": "Error description"
}
```

## Architecture

The server is a simple **1-to-1 relay** between a single WebSocket client and the Claude Agent SDK:

1. **Configuration** (optional): Client can POST to `/config` to set agents, allowedTools, and systemPrompt
2. **Client Connects**: A WebSocket connection is established (only one allowed at a time)
3. **Client Sends Message**: Client sends a user message (or interrupt)
4. **Message Queuing**: Server adds messages to the queue and processes them with the SDK
5. **SDK Processing**: The SDK query stream processes messages using the configured options
6. **Response Relay**: SDK responses are immediately sent back to the connected WebSocket client
7. **Cleanup**: When the client disconnects, the server is ready to accept a new connection

**Key Design Principles:**

- **Pre-connection configuration**: Configure query options via `/config` endpoint before connecting
- **Lazy initialization**: Query stream only starts when first WebSocket connection is made
- **Single connection only**: Server rejects additional connection attempts while one is active
- **Simple relay**: Server relays messages between WebSocket and SDK without session management
- **Message queue**: Incoming messages are queued and processed by the SDK stream
- **Interrupt support**: Clients can send interrupt messages to stop ongoing operations
- **Direct routing**: All SDK responses go to the single active WebSocket connection

## Project Structure

The codebase follows a monorepo structure:

```
claude-agent-server/
├── packages/
│   ├── server/           # Main server implementation
│   │   ├── index.ts
│   │   ├── message-handler.ts
│   │   └── ...
│   ├── client/           # Client library and examples
│   │   ├── src/
│   │   └── example-client.ts
│   └── e2b-build/        # E2B build scripts
│       └── build.prod.ts
├── package.json          # Root package.json (workspaces)
└── README.md
```

## Testing

### Web Test Client

Open `http://localhost:3000/` in your browser to access the built-in test client. You can:

- Send messages to Claude
- See real-time responses
- View the full JSON structure of SDK messages

### Command Line Test Client

Run the example client script:

```bash
bun run test:client
```

This will connect to the server (or E2B sandbox), send a few test messages, and display the responses.

## E2B Deployment Details

This section provides additional details about E2B deployment. For the basic setup, see the [Quick Start](#quick-start) section.

### Customizing the Template Name

By default, `bun run build:e2b` creates a template named `claude-agent-server`. To use a different name, you can modify `packages/e2b-build/build.prod.ts` or specify it when using the client:

```typescript
import { ClaudeAgentClient } from '@dzhng/claude-agent'

const client = new ClaudeAgentClient({
  template: 'my-custom-template', // Use your custom template name
  e2bApiKey: process.env.E2B_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
})

await client.start()
```

### How E2B Sandboxes Work

When you use the client library with E2B:

1. **Sandbox Creation**: A fresh sandbox is created from your built template (`claude-agent-server` by default)
2. **Automatic Startup**: The server starts automatically in the sandbox on port 3000 (configured via `setStartCmd` in `build.prod.ts`)
3. **Secure Endpoints**: E2B provides HTTPS and WSS endpoints for your sandbox
4. **Isolation**: Each sandbox runs in complete isolation with its own filesystem and resources
5. **Automatic Cleanup**: Sandboxes are terminated when the client disconnects

To test with E2B, simply run:

```bash
bun run test:client
```

This runs `packages/client/example-client.ts` which creates an E2B sandbox, connects to it, runs test commands, and cleans up.

### E2B Template Configuration

The template is defined in `packages/e2b-build/build.prod.ts`:

```typescript
const template = Template()
  .fromBunImage('1.3')                    // Use Bun 1.3 base image
  .runCmd('sudo apt install -y git')      // Install git
  .gitClone('https://github.com/...', ...) // Clone repository
  .setWorkdir('/home/user/app')           // Set working directory
  .runCmd('bun install')                  // Install dependencies
  .setStartCmd('bun packages/server/index.ts', waitForPort(3000)) // Start server
```

You can customize this template to:

- Install additional system packages
- Pre-configure environment variables
- Change resource limits (CPU, memory)
- Modify the startup command

### E2B vs Local Development

**Local Development** (localhost):

- Faster iteration
- Direct access to local filesystem
- No sandbox overhead
- Good for development and testing

**E2B Deployment**:

- Isolated execution environment
- Secure cloud sandboxes
- Scalable infrastructure
- Production-ready
- No local setup required

## Configuration

The server uses port 3000 by default. You can modify this in `packages/server/index.ts`:

```typescript
const server = Bun.serve<SessionData>({
  port: 3000, // Change this
  // ...
})
```

## Environment Variables

Environment variables are loaded from the root `.env` file. See [Quick Start](#quick-start) for setup instructions.

**API Key Priority:**

- If you set `anthropicApiKey` via the Configuration API (`/config` endpoint), it will override the `ANTHROPIC_API_KEY` environment variable.
- When using the client library, you can pass `anthropicApiKey` in the constructor options.

## License

MIT
