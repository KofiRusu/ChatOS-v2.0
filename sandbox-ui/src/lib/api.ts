/**
 * API Client Stub
 * 
 * Placeholder for the ChatOS API client.
 */

export interface ChatResponse {
  id: string
  model: string
  response: string
  created: number
}

export interface ModelInfo {
  id: string
  name: string
  description?: string
  isDefault?: boolean
}

export interface StreamEvent {
  type: 'token' | 'done' | 'error'
  content?: string
  error?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Send a chat message to the API
 */
export async function sendChatMessage(
  message: string,
  model?: string,
  conversationId?: string
): Promise<ChatResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        model: model || 'default',
        conversation_id: conversationId,
      }),
    })
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Chat API error:', error)
    return {
      id: Date.now().toString(),
      model: model || 'default',
      response: 'Sorry, the chat service is currently unavailable. Please try again later.',
      created: Date.now(),
    }
  }
}

/**
 * Stream a chat message from the API
 */
export async function* streamChatMessage(
  message: string,
  model?: string,
  conversationId?: string
): AsyncGenerator<StreamEvent> {
  try {
    const response = await fetch(`${API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        model: model || 'default',
        conversation_id: conversationId,
      }),
    })
    
    if (!response.ok) {
      yield { type: 'error', error: `API error: ${response.status}` }
      return
    }
    
    const reader = response.body?.getReader()
    if (!reader) {
      yield { type: 'error', error: 'No response body' }
      return
    }
    
    const decoder = new TextDecoder()
    let buffer = ''
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            yield { type: 'done' }
          } else {
            try {
              const parsed = JSON.parse(data)
              yield { type: 'token', content: parsed.content || parsed.text || '' }
            } catch {
              yield { type: 'token', content: data }
            }
          }
        }
      }
    }
    
    yield { type: 'done' }
  } catch (error) {
    console.error('Stream error:', error)
    yield { 
      type: 'error', 
      error: error instanceof Error ? error.message : 'Stream failed' 
    }
  }
}

/**
 * Get available models from the API
 */
export async function getModels(): Promise<ModelInfo[]> {
  try {
    const response = await fetch(`${API_BASE}/api/models`)
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Models API error:', error)
    // Return default models if API is unavailable
    return [
      { id: 'default', name: 'Default Model', isDefault: true },
      { id: 'ft-qwen25-v1-quality', name: 'PersRM Quality', description: 'Fine-tuned model' },
      { id: 'mistral:7b', name: 'Mistral 7B', description: 'Base Mistral model' },
    ]
  }
}

