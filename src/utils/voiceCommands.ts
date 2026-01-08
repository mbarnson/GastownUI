/**
 * Voice command parsing and Gas Town action mapping
 */

export type VoiceIntent =
  | 'sling_work'
  | 'show_rig'
  | 'show_status'
  | 'whats_blocking'
  | 'list_convoys'
  | 'show_ready'
  | 'create_bead'
  | 'close_bead'
  | 'help'
  | 'unknown'

export interface ParsedCommand {
  intent: VoiceIntent
  confidence: number
  parameters: Record<string, string>
  rawText: string
  suggestedCommand?: string
}

interface CommandPattern {
  intent: VoiceIntent
  patterns: RegExp[]
  extractParams: (match: RegExpMatchArray) => Record<string, string>
  commandTemplate: (params: Record<string, string>) => string
}

const commandPatterns: CommandPattern[] = [
  {
    intent: 'sling_work',
    patterns: [
      /sling\s+(.+?)\s+to\s+(.+)/i,
      /assign\s+(.+?)\s+to\s+(.+)/i,
      /send\s+(.+?)\s+to\s+(.+)/i,
      /give\s+(.+?)\s+to\s+(.+)/i,
    ],
    extractParams: (match) => ({
      beadId: match[1].trim(),
      target: match[2].trim(),
    }),
    commandTemplate: (params) => `gt sling ${params.beadId} ${params.target}`,
  },
  {
    intent: 'show_rig',
    patterns: [
      /show\s+(?:the\s+)?rig\s*(.+)?/i,
      /open\s+(?:the\s+)?rig\s*(.+)?/i,
      /view\s+(?:the\s+)?rig\s*(.+)?/i,
    ],
    extractParams: (match) => ({
      rigName: match[1]?.trim() || 'current',
    }),
    commandTemplate: (params) =>
      params.rigName === 'current' ? 'gt status' : `gt status ${params.rigName}`,
  },
  {
    intent: 'show_status',
    patterns: [
      /(?:show|what(?:'s| is)?)\s+(?:the\s+)?status/i,
      /how(?:'s| is)\s+(?:the\s+)?town/i,
      /town\s+status/i,
      /status\s+update/i,
    ],
    extractParams: () => ({}),
    commandTemplate: () => 'gt status',
  },
  {
    intent: 'whats_blocking',
    patterns: [
      /what(?:'s| is)\s+block(?:ing|ed)/i,
      /show\s+block(?:ing|ed|ers)/i,
      /list\s+block(?:ing|ed|ers)/i,
      /blocked\s+(?:items|beads|work)/i,
    ],
    extractParams: () => ({}),
    commandTemplate: () => 'bd blocked',
  },
  {
    intent: 'list_convoys',
    patterns: [
      /(?:show|list)\s+(?:the\s+)?convoys/i,
      /(?:show|list)\s+(?:the\s+)?active\s+work/i,
      /what(?:'s| is)\s+(?:in\s+)?progress/i,
      /convoy\s+(?:list|status)/i,
    ],
    extractParams: () => ({}),
    commandTemplate: () => 'gt convoy list',
  },
  {
    intent: 'show_ready',
    patterns: [
      /(?:show|what(?:'s| is)?)\s+ready/i,
      /(?:show|list)\s+ready\s+(?:work|beads|issues)/i,
      /what\s+can\s+(?:i|we)\s+work\s+on/i,
      /available\s+work/i,
    ],
    extractParams: () => ({}),
    commandTemplate: () => 'bd ready',
  },
  {
    intent: 'create_bead',
    patterns: [
      /create\s+(?:a\s+)?(?:new\s+)?(?:bead|task|bug|feature)\s*(?:(?:called|named|titled)\s+)?(.+)?/i,
      /new\s+(?:bead|task|bug|feature)\s*(?:(?:called|named|titled)\s+)?(.+)?/i,
      /add\s+(?:a\s+)?(?:bead|task|bug|feature)\s*(?:(?:called|named|titled)\s+)?(.+)?/i,
    ],
    extractParams: (match) => ({
      title: match[1]?.trim() || '',
    }),
    commandTemplate: (params) =>
      params.title ? `bd create --title="${params.title}"` : 'bd create',
  },
  {
    intent: 'close_bead',
    patterns: [
      /close\s+(?:bead\s+)?(.+)/i,
      /complete\s+(?:bead\s+)?(.+)/i,
      /finish\s+(?:bead\s+)?(.+)/i,
      /done\s+(?:with\s+)?(.+)/i,
    ],
    extractParams: (match) => ({
      beadId: match[1].trim(),
    }),
    commandTemplate: (params) => `bd close ${params.beadId}`,
  },
  {
    intent: 'help',
    patterns: [
      /help/i,
      /what\s+can\s+(?:you|i)\s+(?:do|say)/i,
      /commands/i,
      /how\s+do\s+i/i,
    ],
    extractParams: () => ({}),
    commandTemplate: () => 'help',
  },
]

/**
 * Parse a voice command into a structured intent
 */
export function parseVoiceCommand(text: string): ParsedCommand {
  const normalizedText = text.toLowerCase().trim()

  for (const pattern of commandPatterns) {
    for (const regex of pattern.patterns) {
      const match = normalizedText.match(regex)
      if (match) {
        const params = pattern.extractParams(match)
        return {
          intent: pattern.intent,
          confidence: 0.9,
          parameters: params,
          rawText: text,
          suggestedCommand: pattern.commandTemplate(params),
        }
      }
    }
  }

  // Try fuzzy matching for common misspellings
  const fuzzyMatches = tryFuzzyMatch(normalizedText)
  if (fuzzyMatches) {
    return fuzzyMatches
  }

  return {
    intent: 'unknown',
    confidence: 0,
    parameters: {},
    rawText: text,
  }
}

/**
 * Try to match common misspellings or variations
 */
function tryFuzzyMatch(text: string): ParsedCommand | null {
  // Check for status-related words
  if (/status|health|overview/i.test(text)) {
    return {
      intent: 'show_status',
      confidence: 0.7,
      parameters: {},
      rawText: text,
      suggestedCommand: 'gt status',
    }
  }

  // Check for blocking-related words
  if (/block|stuck|wait/i.test(text)) {
    return {
      intent: 'whats_blocking',
      confidence: 0.7,
      parameters: {},
      rawText: text,
      suggestedCommand: 'bd blocked',
    }
  }

  // Check for convoy/work-related words
  if (/convoy|active|progress/i.test(text)) {
    return {
      intent: 'list_convoys',
      confidence: 0.7,
      parameters: {},
      rawText: text,
      suggestedCommand: 'gt convoy list',
    }
  }

  return null
}

/**
 * Get help text for voice commands
 */
export function getVoiceCommandHelp(): string[] {
  return [
    '"Sling [bead] to [rig]" - Assign work to a rig',
    '"Show rig [name]" - View rig status',
    '"Show status" - Town overview',
    '"What\'s blocking?" - List blocked items',
    '"Show convoys" - List active convoys',
    '"What\'s ready?" - Show available work',
    '"Create a task called [name]" - New bead',
    '"Close [bead]" - Complete a bead',
    '"Help" - Show this list',
  ]
}

/**
 * Voice response templates
 */
export const voiceResponses = {
  sling_work: (params: Record<string, string>) =>
    `Slinging ${params.beadId} to ${params.target}`,
  show_rig: (params: Record<string, string>) =>
    params.rigName === 'current' ? 'Showing current rig status' : `Showing rig ${params.rigName}`,
  show_status: () => 'Here is the town status',
  whats_blocking: () => 'Showing blocked items',
  list_convoys: () => 'Here are the active convoys',
  show_ready: () => 'Here is the work ready to start',
  create_bead: (params: Record<string, string>) =>
    params.title ? `Creating bead: ${params.title}` : 'Opening bead creator',
  close_bead: (params: Record<string, string>) => `Closing bead ${params.beadId}`,
  help: () => 'Here are the available voice commands',
  unknown: () => "I didn't understand that. Try saying 'help' for available commands",
}

/**
 * Get voice response for a parsed command
 */
export function getVoiceResponse(command: ParsedCommand): string {
  const responseTemplate = voiceResponses[command.intent]
  if (typeof responseTemplate === 'function') {
    return responseTemplate(command.parameters)
  }
  return responseTemplate
}
