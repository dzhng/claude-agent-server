/**
 * Example WebSocket client for the Claude Agent SDK server
 * 
 * Usage: bun example-client.ts
 */

const ws = new WebSocket('ws://localhost:3000/ws');
const sessionId = crypto.randomUUID();

ws.onopen = () => {
  console.log('✅ Connected to Claude Agent SDK');
  console.log(`📝 Session ID: ${sessionId}\n`);
  
  // Send an initial message (WSInputMessage format)
  const message = {
    type: 'user_message' as const,
    data: {
      type: 'user' as const,
      session_id: sessionId,
      parent_tool_use_id: null,
      message: {
        role: 'user' as const,
        content: 'Hello! Can you tell me a short joke about programming?'
      }
    }
  };
  
  console.log('📤 Sending:', message.data.message.content);
  ws.send(JSON.stringify(message));
  
  // Send another message after a delay
  setTimeout(() => {
    const followUp = {
      type: 'user_message' as const,
      data: {
        type: 'user' as const,
        session_id: sessionId,
        parent_tool_use_id: null,
        message: {
          role: 'user' as const,
          content: 'Now tell me one about TypeScript.'
        }
      }
    };
    console.log('\n📤 Sending:', followUp.data.message.content);
    ws.send(JSON.stringify(followUp));
  }, 5000);
  
  // Disconnect after 15 seconds
  setTimeout(() => {
    console.log('\n👋 Closing connection...');
    ws.close();
  }, 15000);
};

ws.onmessage = (event) => {
  try {
    const message = JSON.parse(event.data.toString());
    
    switch (message.type) {
      case 'connected':
        console.log('🔗 Connection confirmed');
        break;
        
      case 'sdk_message':
        console.log('📥 SDK Response:', JSON.stringify(message.data, null, 2));
        break;
        
      case 'error':
        console.error('❌ Error:', message.error);
        break;
        
      default:
        console.log('📨 Unknown message type:', message.type);
    }
  } catch (error) {
    console.error('❌ Failed to parse message:', error);
  }
};

ws.onerror = (error) => {
  console.error('❌ WebSocket error:', error);
};

ws.onclose = () => {
  console.log('\n👋 Disconnected from server');
  process.exit(0);
};

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n🛑 Interrupted, closing connection...');
  ws.close();
});

