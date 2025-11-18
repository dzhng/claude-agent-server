# Claude Agent SDK WebSocket Server

A WebSocket server that wraps the Claude Agent SDK, allowing real-time bidirectional communication with Claude through WebSockets.

## Features

- 🔌 **WebSocket-based**: Real-time communication using WebSockets
- 🎯 **Single Connection**: Simple 1-to-1 relay between one WebSocket client and the Claude Agent SDK
- 🚀 **Built with Bun**: Leverages Bun's high-performance WebSocket implementation
- 🧪 **Built-in Test Client**: Includes a web-based test interface

## Installation

```bash
bun install
```

## Usage

### Start the Server

```bash
bun index.ts
```

The server will start on `http://localhost:3000` with:
- Config endpoint: `http://localhost:3000/config`
- WebSocket endpoint: `ws://localhost:3000/ws`

### Configuration API

**Important:** Configuration must be set **before** connecting to the WebSocket. The query stream starts when the first WebSocket connection is established and uses the configuration at that time.

#### POST /config

Set the configuration for the Claude Agent SDK query:

```typescript
type QueryConfig = {
  agents?: Record<string, AgentDefinition>;
  allowedTools?: string[];
  systemPrompt?: string | {
    type: 'preset';
    preset: 'claude_code';
    append?: string;
  };
};
```

**Example:**

```bash
curl -X POST http://localhost:3000/config \
  -H "Content-Type: application/json" \
  -d '{
    "systemPrompt": "You are a helpful assistant.",
    "allowedTools": ["read_file", "write_file"],
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
const ws = new WebSocket('ws://localhost:3000/ws');
```

**Note:** The server only accepts **one active connection at a time**. If another client is already connected, new connection attempts will be rejected with an error message.

#### Message Format

**Sending Messages (Client → Server)**

```typescript
type WSInputMessage = 
  | {
      type: 'user_message';
      data: SDKUserMessage;
    }
  | {
      type: 'interrupt';
    };
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
  | { type: 'error'; error: string };
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
    "message": { /* Claude's response */ }
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

### Example Client (Node.js/Bun)

```typescript
import { WebSocket } from 'ws'; // or use Bun's built-in WebSocket

// Optional: Configure the query before connecting
await fetch('http://localhost:3000/config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    systemPrompt: 'You are a helpful coding assistant.',
    allowedTools: ['read_file', 'write_file']
  })
});

// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000/ws');
const sessionId = crypto.randomUUID();

ws.on('open', () => {
  console.log('Connected to Claude Agent SDK');
  
  // Send a message
  ws.send(JSON.stringify({
    type: 'user_message',
    data: {
      type: 'user',
      session_id: sessionId,
      parent_tool_use_id: null,
      message: {
        role: 'user',
        content: 'What is the capital of France?'
      }
    }
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  
  if (message.type === 'sdk_message') {
    console.log('Claude:', message.data);
  } else if (message.type === 'error') {
    console.error('Error:', message.error);
  }
});

ws.on('close', () => {
  console.log('Disconnected');
});
```

### Example Client (Browser)

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');
const sessionId = crypto.randomUUID();

ws.onopen = () => {
  console.log('Connected to Claude Agent SDK');
  
  // Send a message
  ws.send(JSON.stringify({
    type: 'user_message',
    data: {
      type: 'user',
      session_id: sessionId,
      parent_tool_use_id: null,
      message: {
        role: 'user',
        content: 'Hello, Claude!'
      }
    }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'sdk_message') {
    console.log('Claude:', message.data);
  } else if (message.type === 'error') {
    console.error('Error:', message.error);
  }
};

ws.onclose = () => {
  console.log('Disconnected');
};
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

## Testing

### Web Test Client

Open `http://localhost:3000/` in your browser to access the built-in test client. You can:
- Send messages to Claude
- See real-time responses
- View the full JSON structure of SDK messages

### Command Line Test Client

Run the example client script:

```bash
bun example-client.ts
```

This will connect to the server, send a few test messages, and display the responses.

## Configuration

The server uses port 3000 by default. You can modify this in `index.ts`:

```typescript
const server = Bun.serve<SessionData>({
  port: 3000, // Change this
  // ...
});
```

## Environment Variables

Make sure you have the required environment variables for the Claude Agent SDK (e.g., `ANTHROPIC_API_KEY` if required by your SDK configuration).

## License

MIT
