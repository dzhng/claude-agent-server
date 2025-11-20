/**
 * Example WebSocket client for the Claude Agent SDK server
 *
 * Usage: bun example-client.ts
 */

import { ClaudeAgentClient, FilesystemEventType } from './src/index'

if (!process.env.E2B_API_KEY) {
  console.error('❌ E2B_API_KEY environment variable is required')
  process.exit(1)
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY environment variable is required')
  process.exit(1)
}

async function main() {
  const client = new ClaudeAgentClient({
    debug: true,
  })

  try {
    await client.start()

    // Set up file watcher
    console.log('👀 Setting up file watcher...')
    const watchHandle = await client.watchDir(
      '.',
      event => {
        const eventTypeLabels: Record<string, string> = {
          [FilesystemEventType.CREATE]: '📄 Created',
          [FilesystemEventType.WRITE]: '✏️  Modified',
          [FilesystemEventType.REMOVE]: '🗑️  Deleted',
          [FilesystemEventType.RENAME]: '📝 Renamed',
          [FilesystemEventType.CHMOD]: '🔐 Permissions changed',
        }
        const label = eventTypeLabels[event.type] || '📁 Changed'
        console.log(`${label}: ${event.name}`)
      },
      { recursive: true },
    )
    console.log('✅ File watcher active\n')

    console.log('🗂️  Writing input.txt...')
    await client.writeFile(
      'input.txt',
      'Hello! This is a test file created by the user.',
    )
    console.log('✅ File written')

    const commands = [
      {
        type: 'user_message',
        data: {
          type: 'user',
          session_id: 'example-session',
          parent_tool_use_id: null,
          message: {
            role: 'user',
            content:
              'Please read "input.txt", reverse its content, and save it to a new file named "output.txt".',
          },
        },
      },
    ] as const

    // Register message handler
    client.onMessage(message => {
      switch (message.type) {
        case 'connected':
          console.log('🔗 Connection confirmed')
          break

        case 'error':
          console.error('❌ Error:', message.error)
          break

        case 'sdk_message':
          console.log('🤖 SDK Message:', JSON.stringify(message.data, null, 2))
          break

        default:
          console.log('📨 Unknown message type:', (message as any).type)
      }
    })

    // Send commands
    for (const command of commands) {
      console.log(`\n📤 Sending command: ${command.type}`)
      client.send(command)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // Keep watching for changes
    console.log('\n👀 Watching for file changes... (will close in 30 seconds)')

    // Disconnect after 30 seconds
    setTimeout(async () => {
      console.log('\n🛑 Stopping file watcher...')
      await watchHandle.stop()
      console.log('\n👋 Closing connection...')
      await client.stop()
      console.log('✅ Sandbox terminated')
      process.exit(0)
    }, 30000)
  } catch (error) {
    console.error('❌ Error:', error)
    await client.stop()
    process.exit(1)
  }
}

main()
