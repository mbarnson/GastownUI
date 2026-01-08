/**
 * F2.3: Action Intent Parser
 *
 * Parses ACTION: intents from voice model output and executes
 * corresponding Gas Town commands.
 */

import { invoke } from '@tauri-apps/api/core'
import { getMailbox } from './mail'

// Action types supported by the voice interface
export type ActionType =
  | 'mail'
  | 'sling'
  | 'ask_mayor'
  | 'describe_screen'
  | 'deep_query'
  | 'emergency_stop'

export interface ParsedAction {
  type: ActionType
  args: string[]
  raw: string
}

export interface ActionResult {
  success: boolean
  message: string
  action: ParsedAction
}

/**
 * Parse ACTION: intents from model output
 * Supports multiple actions in a single output
 */
export function parseActions(modelOutput: string): ParsedAction[] {
  // Match ACTION: type args pattern, handling multi-line
  const actionRegex = /ACTION:\s*(\w+)\s+(.+?)(?=ACTION:|$)/gs
  const actions: ParsedAction[] = []

  let match
  while ((match = actionRegex.exec(modelOutput)) !== null) {
    const type = match[1].toLowerCase() as ActionType
    const argsString = match[2].trim()

    // Validate action type
    if (!isValidActionType(type)) {
      console.warn(`Unknown action type: ${type}`)
      continue
    }

    actions.push({
      type,
      args: parseActionArgs(type, argsString),
      raw: match[0].trim(),
    })
  }

  return actions
}

/**
 * Extract non-action text (for voice output passthrough)
 */
export function extractNonActionText(modelOutput: string): string {
  // Remove all ACTION: blocks and clean up whitespace
  return modelOutput
    .replace(/ACTION:\s*\w+\s+.+?(?=ACTION:|$)/gs, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Check if model output contains any actions
 */
export function hasActions(modelOutput: string): boolean {
  return /ACTION:\s*\w+/i.test(modelOutput)
}

/**
 * Validate action type
 */
function isValidActionType(type: string): type is ActionType {
  return ['mail', 'sling', 'ask_mayor', 'describe_screen', 'deep_query', 'emergency_stop'].includes(type)
}

/**
 * Parse action arguments based on action type
 */
function parseActionArgs(type: ActionType, argsString: string): string[] {
  switch (type) {
    case 'mail':
      // Format: recipient "subject" message body
      // or: recipient message (subject auto-generated)
      const mailMatch = argsString.match(/^(\S+)\s+"([^"]+)"\s+(.+)$/s)
      if (mailMatch) {
        return [mailMatch[1], mailMatch[2], mailMatch[3]]
      }
      // Simple format: recipient message
      const simpleMail = argsString.match(/^(\S+)\s+(.+)$/s)
      if (simpleMail) {
        return [simpleMail[1], '', simpleMail[2]]
      }
      return [argsString]

    case 'sling':
      // Format: bead_id rig_name
      const slingParts = argsString.split(/\s+/)
      return slingParts.slice(0, 2)

    case 'ask_mayor':
      // Format: question text (entire string is the question)
      return [argsString]

    case 'describe_screen':
      // Format: optional focus area
      return argsString ? [argsString] : []

    case 'deep_query':
      // Format: query text (entire string is the query)
      return [argsString]

    case 'emergency_stop':
      // No arguments needed
      return []

    default:
      return argsString.split(/\s+/)
  }
}

/**
 * Execute a single parsed action
 */
export async function executeAction(action: ParsedAction): Promise<ActionResult> {
  try {
    switch (action.type) {
      case 'mail':
        return await executeMail(action)

      case 'sling':
        return await executeSling(action)

      case 'ask_mayor':
        return await executeAskMayor(action)

      case 'describe_screen':
        return await executeDescribeScreen(action)

      case 'deep_query':
        return await executeDeepQuery(action)

      case 'emergency_stop':
        return await executeEmergencyStop(action)

      default:
        return {
          success: false,
          message: `Unknown action type: ${action.type}`,
          action,
        }
    }
  } catch (error) {
    return {
      success: false,
      message: `Action failed: ${error instanceof Error ? error.message : String(error)}`,
      action,
    }
  }
}

/**
 * Execute all actions in sequence
 */
export async function executeActions(actions: ParsedAction[]): Promise<ActionResult[]> {
  const results: ActionResult[] = []

  for (const action of actions) {
    const result = await executeAction(action)
    results.push(result)

    // Stop on first failure if critical
    if (!result.success && action.type === 'sling') {
      break
    }
  }

  return results
}

/**
 * Format action results for voice feedback
 */
export function formatResultsForVoice(results: ActionResult[]): string {
  if (results.length === 0) {
    return ''
  }

  if (results.length === 1) {
    const r = results[0]
    return r.success
      ? r.message
      : `Sorry, ${r.action.type} action failed: ${r.message}`
  }

  const successes = results.filter(r => r.success)
  const failures = results.filter(r => !r.success)

  let response = ''
  if (successes.length > 0) {
    response += `Completed ${successes.length} action${successes.length > 1 ? 's' : ''}. `
  }
  if (failures.length > 0) {
    response += `${failures.length} action${failures.length > 1 ? 's' : ''} failed. `
  }

  return response.trim()
}

// Action Executors

async function executeMail(action: ParsedAction): Promise<ActionResult> {
  const [recipient, subject, body] = action.args

  if (!recipient) {
    return {
      success: false,
      message: 'No recipient specified for mail',
      action,
    }
  }

  if (!body && !subject) {
    return {
      success: false,
      message: 'No message content for mail',
      action,
    }
  }

  try {
    // Use VoiceMailbox for consistent mail handling
    const mailbox = getMailbox()
    const mailSubject = subject || 'Voice message'
    const mailBody = body || subject

    const success = await mailbox.send({
      to: recipient,
      subject: mailSubject,
      body: mailBody,
    })

    if (success) {
      return {
        success: true,
        message: `Mail sent to ${recipient}`,
        action,
      }
    } else {
      return {
        success: false,
        message: `Failed to send mail to ${recipient}`,
        action,
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to send mail: ${error instanceof Error ? error.message : String(error)}`,
      action,
    }
  }
}

async function executeSling(action: ParsedAction): Promise<ActionResult> {
  const [beadId, rigName] = action.args

  if (!beadId || !rigName) {
    return {
      success: false,
      message: 'Sling requires bead ID and rig name',
      action,
    }
  }

  try {
    await invoke('run_gt_command', {
      args: ['sling', beadId, rigName],
    })

    return {
      success: true,
      message: `Slung ${beadId} to ${rigName}`,
      action,
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to sling: ${error instanceof Error ? error.message : String(error)}`,
      action,
    }
  }
}

async function executeAskMayor(action: ParsedAction): Promise<ActionResult> {
  const [question] = action.args

  if (!question) {
    return {
      success: false,
      message: 'No question provided for mayor',
      action,
    }
  }

  try {
    // Use VoiceMailbox for bidirectional communication with 30s timeout
    const mailbox = getMailbox()
    const response = await mailbox.askMayor(question)

    return {
      success: true,
      message: response,
      action,
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to ask Mayor: ${error instanceof Error ? error.message : String(error)}`,
      action,
    }
  }
}

async function executeDescribeScreen(action: ParsedAction): Promise<ActionResult> {
  const [focusArea] = action.args

  // For now, return a placeholder - will be implemented with vision integration
  return {
    success: true,
    message: focusArea
      ? `Screen description for ${focusArea} - vision integration pending`
      : 'Screen description - vision integration pending',
    action,
  }
}

async function executeDeepQuery(action: ParsedAction): Promise<ActionResult> {
  const [query] = action.args

  if (!query) {
    return {
      success: false,
      message: 'No query provided for deep query',
      action,
    }
  }

  // For now, return a placeholder - will be implemented with local reasoning
  return {
    success: true,
    message: `Deep query processing: "${query}" - local reasoning pending`,
    action,
  }
}

async function executeEmergencyStop(action: ParsedAction): Promise<ActionResult> {
  try {
    await invoke('run_gt_command', {
      cmd: 'gt',
      args: ['stop', '--all'],
    })

    return {
      success: true,
      message: 'Emergency stop complete. All Gas Town agents have been halted.',
      action,
    }
  } catch (error) {
    return {
      success: false,
      message: `Emergency stop failed: ${error instanceof Error ? error.message : String(error)}`,
      action,
    }
  }
}
