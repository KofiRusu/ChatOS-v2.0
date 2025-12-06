/**
 * Chat Integration Utilities
 * 
 * Handles cross-page chat message integration.
 */

const PENDING_MESSAGE_KEY = 'pending_chat_message'

/**
 * Store a pending chat message for another page to consume
 */
export function setPendingChatMessage(message: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(PENDING_MESSAGE_KEY, message)
  }
}

/**
 * Consume a pending chat message (removes it after reading)
 */
export function consumePendingChatMessage(): string | null {
  if (typeof window === 'undefined') return null
  
  const message = sessionStorage.getItem(PENDING_MESSAGE_KEY)
  if (message) {
    sessionStorage.removeItem(PENDING_MESSAGE_KEY)
  }
  return message
}

/**
 * Check if there's a pending chat message without consuming it
 */
export function hasPendingChatMessage(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(PENDING_MESSAGE_KEY) !== null
}

