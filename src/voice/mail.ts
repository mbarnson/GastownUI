/**
 * F2.4: Mail Integration
 *
 * Full integration with Gas Town mail system for bidirectional
 * agent communication.
 */

import { invoke } from '@tauri-apps/api/core'

// Mail message structure matching gt mail output
export interface MailMessage {
  id: string
  from: string
  to: string
  subject: string
  body: string
  timestamp: string
  read: boolean
  priority: number
  thread_id?: string
}

// Mail send options
export interface MailSendOptions {
  to: string
  subject: string
  body: string
  priority?: number
}

// Mail check result
export interface MailCheckResult {
  messages: MailMessage[]
  unread_count: number
}

// Callback for new mail
export type MailCallback = (message: MailMessage) => void | Promise<void>

/**
 * Voice Mailbox - manages mail for the voice assistant
 */
export class VoiceMailbox {
  private pollInterval: ReturnType<typeof setInterval> | null = null
  private mayorPollInterval: ReturnType<typeof setInterval> | null = null
  private callbacks: MailCallback[] = []
  private lastChecked: string | null = null
  private pendingMayorRequests: Map<string, { timestamp: number; callback: (response: string) => void }> = new Map()

  /**
   * Start polling for new mail
   */
  startPolling(intervalMs: number = 5000): void {
    if (this.pollInterval) {
      return // Already polling
    }

    this.pollInterval = setInterval(async () => {
      try {
        const result = await this.checkInbox()
        if (result.messages.length > 0) {
          for (const msg of result.messages) {
            await this.handleNewMail(msg)
          }
        }
      } catch (error) {
        console.error('Mail poll error:', error)
      }
    }, intervalMs)

    // Also start mayor response polling (faster interval)
    this.startMayorPolling()
  }

  /**
   * Stop polling for mail
   */
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    this.stopMayorPolling()
  }

  /**
   * Start faster polling for mayor responses
   */
  private startMayorPolling(): void {
    if (this.mayorPollInterval) {
      return
    }

    // Poll every 3 seconds for mayor responses (30s timeout requirement)
    this.mayorPollInterval = setInterval(async () => {
      try {
        await this.checkMayorResponses()
      } catch (error) {
        console.error('Mayor poll error:', error)
      }
    }, 3000)
  }

  /**
   * Stop mayor response polling
   */
  private stopMayorPolling(): void {
    if (this.mayorPollInterval) {
      clearInterval(this.mayorPollInterval)
      this.mayorPollInterval = null
    }
  }

  /**
   * Check inbox for new unread messages
   */
  async checkInbox(): Promise<MailCheckResult> {
    try {
      const result = await invoke<{ stdout: string; stderr: string; exit_code: number }>(
        'run_gt_command',
        { args: ['mail', 'inbox', '--json'] }
      )

      if (result.exit_code !== 0) {
        return { messages: [], unread_count: 0 }
      }

      // Parse JSON output
      const messages: MailMessage[] = this.parseMailOutput(result.stdout)
      const unread = messages.filter(m => !m.read)

      return { messages: unread, unread_count: unread.length }
    } catch (error) {
      console.error('Failed to check inbox:', error)
      return { messages: [], unread_count: 0 }
    }
  }

  /**
   * Parse mail output from gt mail command
   */
  private parseMailOutput(output: string): MailMessage[] {
    try {
      // Try JSON parse first
      const parsed = JSON.parse(output)
      if (Array.isArray(parsed)) {
        return parsed
      }
      return []
    } catch {
      // Fall back to line parsing for non-JSON output
      return this.parseMailLines(output)
    }
  }

  /**
   * Parse mail from line-based output format
   */
  private parseMailLines(output: string): MailMessage[] {
    const messages: MailMessage[] = []
    const lines = output.split('\n')

    // Pattern: ● Subject (unread) or ○ Subject (read)
    // From: sender
    // Date: timestamp
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.startsWith('●') || line.startsWith('○')) {
        const unread = line.startsWith('●')
        const subjectMatch = line.match(/^[●○]\s+(.+)$/)
        const subject = subjectMatch ? subjectMatch[1] : 'No subject'

        // Look for ID and from in following lines
        const idLine = lines[i + 1]?.trim() || ''
        const idMatch = idLine.match(/(\S+)\s+from\s+(\S+)/)

        if (idMatch) {
          messages.push({
            id: idMatch[1],
            from: idMatch[2],
            to: 'voice/',
            subject,
            body: '',
            timestamp: new Date().toISOString(),
            read: !unread,
            priority: 2,
          })
        }
      }
    }

    return messages
  }

  /**
   * Check for mayor responses to pending requests
   */
  private async checkMayorResponses(): Promise<void> {
    if (this.pendingMayorRequests.size === 0) {
      return
    }

    const now = Date.now()
    const expired: string[] = []

    for (const [threadId, request] of this.pendingMayorRequests) {
      // Timeout after 30 seconds
      if (now - request.timestamp > 30000) {
        expired.push(threadId)
        request.callback('No response from Mayor within 30 seconds.')
        continue
      }

      // Check for reply in this thread
      try {
        const result = await invoke<{ stdout: string; exit_code: number }>(
          'run_gt_command',
          { args: ['mail', 'thread', threadId, '--json'] }
        )

        if (result.exit_code === 0) {
          const messages = this.parseMailOutput(result.stdout)
          // Look for response from mayor
          const mayorResponse = messages.find(
            m => m.from.includes('mayor') && new Date(m.timestamp).getTime() > request.timestamp
          )

          if (mayorResponse) {
            request.callback(mayorResponse.body || mayorResponse.subject)
            expired.push(threadId)
          }
        }
      } catch (error) {
        console.error('Failed to check mayor response:', error)
      }
    }

    // Clean up expired requests
    for (const threadId of expired) {
      this.pendingMayorRequests.delete(threadId)
    }
  }

  /**
   * Handle new mail message
   */
  private async handleNewMail(message: MailMessage): Promise<void> {
    // Mark as read
    try {
      await invoke('run_gt_command', {
        args: ['mail', 'read', message.id],
      })
    } catch (error) {
      console.error('Failed to mark mail as read:', error)
    }

    // Notify callbacks
    for (const callback of this.callbacks) {
      try {
        await callback(message)
      } catch (error) {
        console.error('Mail callback error:', error)
      }
    }
  }

  /**
   * Send mail to another agent
   */
  async send(options: MailSendOptions): Promise<boolean> {
    try {
      const args = ['mail', 'send', options.to, '-s', options.subject, '-m', options.body]

      const result = await invoke<{ exit_code: number; stderr: string }>(
        'run_gt_command',
        { args }
      )

      return result.exit_code === 0
    } catch (error) {
      console.error('Failed to send mail:', error)
      return false
    }
  }

  /**
   * Send question to mayor and wait for response
   */
  async askMayor(question: string): Promise<string> {
    return new Promise(async (resolve) => {
      const threadId = `mayor-query-${Date.now()}`

      // Register pending request
      this.pendingMayorRequests.set(threadId, {
        timestamp: Date.now(),
        callback: resolve,
      })

      // Send question to mayor
      const sent = await this.send({
        to: 'mayor/',
        subject: 'Voice Query',
        body: question,
      })

      if (!sent) {
        this.pendingMayorRequests.delete(threadId)
        resolve('Failed to send question to Mayor.')
      }
    })
  }

  /**
   * Register callback for new mail
   */
  onNewMail(callback: MailCallback): () => void {
    this.callbacks.push(callback)
    return () => {
      const index = this.callbacks.indexOf(callback)
      if (index >= 0) {
        this.callbacks.splice(index, 1)
      }
    }
  }

  /**
   * Format mail announcement for voice output
   */
  formatAnnouncement(message: MailMessage): string {
    const from = message.from.replace(/\/$/, '') // Remove trailing slash
    const priority = message.priority <= 1 ? 'urgent ' : ''
    return `New ${priority}mail from ${from}: ${message.subject}`
  }
}

// Singleton instance
let mailboxInstance: VoiceMailbox | null = null

/**
 * Get or create mailbox instance
 */
export function getMailbox(): VoiceMailbox {
  if (!mailboxInstance) {
    mailboxInstance = new VoiceMailbox()
  }
  return mailboxInstance
}

/**
 * Hook for using voice mailbox in React
 */
export function useVoiceMail() {
  const mailbox = getMailbox()

  return {
    mailbox,
    send: mailbox.send.bind(mailbox),
    askMayor: mailbox.askMayor.bind(mailbox),
    checkInbox: mailbox.checkInbox.bind(mailbox),
    startPolling: mailbox.startPolling.bind(mailbox),
    stopPolling: mailbox.stopPolling.bind(mailbox),
    onNewMail: mailbox.onNewMail.bind(mailbox),
  }
}
