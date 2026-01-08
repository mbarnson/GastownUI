import { useCallback } from 'react';
import { runCommand } from './useGastown';

// Voice command patterns and their handlers
interface CommandPattern {
  patterns: RegExp[];
  handler: (match: RegExpMatchArray, context: CommandContext) => Promise<CommandResult>;
  description: string;
}

interface CommandContext {
  navigate?: (path: string) => void;
}

interface CommandResult {
  success: boolean;
  message: string;
  action?: string;
  data?: unknown;
}

const commandPatterns: CommandPattern[] = [
  // Navigation commands
  {
    patterns: [
      /show\s+(?:me\s+)?(?:the\s+)?(\w+)\s+rig/i,
      /go\s+to\s+(?:the\s+)?(\w+)\s+rig/i,
      /open\s+(?:the\s+)?(\w+)\s+rig/i,
    ],
    handler: async (match, context) => {
      const rig = match[1];
      context.navigate?.(`/rig/${rig}`);
      return {
        success: true,
        message: `Navigating to ${rig} rig. Let's see what chaos awaits.`,
        action: 'navigate',
        data: { rig },
      };
    },
    description: 'Navigate to a rig view',
  },

  // Polecat status
  {
    patterns: [
      /what(?:'s|is)\s+(\w+)\s+(?:doing|working on|up to)/i,
      /status\s+(?:of\s+)?(?:polecat\s+)?(\w+)/i,
      /check\s+(?:on\s+)?(\w+)/i,
    ],
    handler: async (match) => {
      const polecat = match[1];
      const result = await runCommand('gt', ['peek', polecat]);
      if (result.exit_code !== 0) {
        return {
          success: false,
          message: `Can't find ${polecat}. Maybe they're off causing trouble elsewhere.`,
        };
      }
      return {
        success: true,
        message: `${polecat} is ${result.stdout.trim() || 'apparently doing nothing. Typical.'}`,
        action: 'peek',
        data: { polecat, output: result.stdout },
      };
    },
    description: 'Check what a polecat is doing',
  },

  // Sling work
  {
    patterns: [
      /sling\s+(\S+)\s+to\s+(\w+)/i,
      /assign\s+(\S+)\s+to\s+(\w+)/i,
      /send\s+(\S+)\s+to\s+(\w+)/i,
    ],
    handler: async (match) => {
      const bead = match[1];
      const rig = match[2];
      const result = await runCommand('gt', ['sling', bead, rig]);
      if (result.exit_code !== 0) {
        return {
          success: false,
          message: `Failed to sling ${bead} to ${rig}. ${result.stderr || 'The universe objects.'}`,
        };
      }
      return {
        success: true,
        message: `${bead} has been slung to ${rig}. Another soul thrown into the chaos.`,
        action: 'sling',
        data: { bead, rig },
      };
    },
    description: 'Sling work to a rig',
  },

  // Show blockers
  {
    patterns: [
      /what(?:'s|is)\s+block(?:ing|ed)/i,
      /show\s+(?:me\s+)?block(?:ers|ed)/i,
      /any(?:thing)?\s+blocked/i,
    ],
    handler: async () => {
      const result = await runCommand('bd', ['blocked']);
      const lines = result.stdout.trim().split('\n').filter((l: string) => l.trim());
      if (lines.length === 0 || result.stdout.includes('no blocked')) {
        return {
          success: true,
          message: "Nothing's blocked. A rare moment of peace in Gas Town.",
          action: 'blocked',
          data: { count: 0 },
        };
      }
      return {
        success: true,
        message: `${lines.length} items are blocked. The usual traffic jam.`,
        action: 'blocked',
        data: { count: lines.length, items: lines },
      };
    },
    description: 'Show blocked items',
  },

  // Ready work
  {
    patterns: [
      /what(?:'s|is)\s+ready/i,
      /show\s+(?:me\s+)?ready\s+(?:work|items|beads)/i,
      /available\s+work/i,
    ],
    handler: async () => {
      const result = await runCommand('bd', ['ready']);
      const lines = result.stdout.trim().split('\n').filter((l: string) => l.trim() && !l.includes('Ready work'));
      return {
        success: true,
        message: lines.length > 0
          ? `${lines.length} items ready for someone brave enough to claim them.`
          : 'Nothing ready. Time to create more chaos.',
        action: 'ready',
        data: { count: lines.length, items: lines },
      };
    },
    description: 'Show ready work',
  },

  // Convoy status
  {
    patterns: [
      /convoy(?:s)?\s+(?:status|list)/i,
      /show\s+(?:me\s+)?convoy(?:s)?/i,
      /what(?:'s|are)\s+(?:the\s+)?convoy(?:s)?/i,
    ],
    handler: async () => {
      const result = await runCommand('gt', ['convoy', 'list']);
      const convoys = result.stdout.match(/🚚/g) || [];
      return {
        success: true,
        message: convoys.length > 0
          ? `${convoys.length} convoy${convoys.length > 1 ? 's' : ''} rolling through Gas Town.`
          : 'No convoys on the road. Suspiciously quiet.',
        action: 'convoys',
        data: { count: convoys.length, output: result.stdout },
      };
    },
    description: 'Show convoy status',
  },

  // Stop agent
  {
    patterns: [
      /stop\s+(\w+)/i,
      /kill\s+(\w+)/i,
    ],
    handler: async (match) => {
      const agent = match[1];
      if (agent.toLowerCase() === 'everything' || agent.toLowerCase() === 'all') {
        return {
          success: false,
          message: "I can't just stop everything. Say 'emergency stop' if you really mean it.",
          action: 'stop',
        };
      }
      const result = await runCommand('gt', ['stop', agent]);
      return {
        success: result.exit_code === 0,
        message: result.exit_code === 0
          ? `${agent} has been stopped. May they rest in peace.`
          : `Couldn't stop ${agent}. They're either invincible or already dead.`,
        action: 'stop',
        data: { agent },
      };
    },
    description: 'Stop an agent',
  },

  // Emergency stop
  {
    patterns: [
      /emergency\s+stop/i,
      /stop\s+(?:all|everything)/i,
      /shut\s+(?:it\s+)?(?:all\s+)?down/i,
    ],
    handler: async () => {
      // This is a dangerous operation - just warn, don't execute
      return {
        success: true,
        message: "Emergency stop requested. Are you SURE? This stops ALL agents. Click the big red button in the UI to confirm.",
        action: 'emergency_stop_warning',
      };
    },
    description: 'Emergency stop all agents',
  },

  // Nudge agent
  {
    patterns: [
      /nudge\s+(\w+)/i,
      /wake\s+(?:up\s+)?(\w+)/i,
      /poke\s+(\w+)/i,
    ],
    handler: async (match) => {
      const agent = match[1];
      const result = await runCommand('gt', ['nudge', agent]);
      return {
        success: result.exit_code === 0,
        message: result.exit_code === 0
          ? `${agent} has been nudged. Let's see if they wake up.`
          : `${agent} didn't respond to the nudge. Either very focused or very dead.`,
        action: 'nudge',
        data: { agent },
      };
    },
    description: 'Nudge a stuck agent',
  },

  // Cost check
  {
    patterns: [
      /how\s+much\s+(?:have\s+)?(?:i\s+)?(?:burned|spent|cost)/i,
      /cost(?:s)?\s+(?:today|summary)/i,
      /burn\s+rate/i,
    ],
    handler: async () => {
      const result = await runCommand('gt', ['costs']);
      if (result.exit_code !== 0 || result.stdout.includes('not available')) {
        return {
          success: true,
          message: "Cost tracking isn't available. Probably for the best. You don't want to know.",
          action: 'costs',
        };
      }
      return {
        success: true,
        message: result.stdout.trim() || "Can't determine costs. The accountant ran away.",
        action: 'costs',
        data: { output: result.stdout },
      };
    },
    description: 'Show cost summary',
  },

  // Create convoy
  {
    patterns: [
      /create\s+convoy\s+(?:called\s+)?[""']?(.+?)[""']?$/i,
      /new\s+convoy\s+[""']?(.+?)[""']?$/i,
    ],
    handler: async (match) => {
      const name = match[1].trim();
      const result = await runCommand('gt', ['convoy', 'create', name]);
      return {
        success: result.exit_code === 0,
        message: result.exit_code === 0
          ? `Convoy "${name}" created. May it reach its destination.`
          : `Failed to create convoy. ${result.stderr || 'The road is closed.'}`,
        action: 'create_convoy',
        data: { name },
      };
    },
    description: 'Create a new convoy',
  },

  // Help
  {
    patterns: [
      /what\s+can\s+(?:you|i)\s+(?:say|do)/i,
      /help(?:\s+me)?/i,
      /commands/i,
    ],
    handler: async () => {
      return {
        success: true,
        message: "I understand: 'show [rig] rig', 'what's [polecat] doing?', 'sling [bead] to [rig]', 'what's blocking?', 'convoy status', 'stop [agent]', 'nudge [agent]', 'how much today?'. And yes, I judge all your choices.",
        action: 'help',
      };
    },
    description: 'Show available commands',
  },
];

/**
 * Parse and execute a voice command
 */
export async function parseVoiceCommand(
  text: string,
  context: CommandContext = {}
): Promise<CommandResult> {
  for (const command of commandPatterns) {
    for (const pattern of command.patterns) {
      const match = text.match(pattern);
      if (match) {
        return command.handler(match, context);
      }
    }
  }

  // No command matched - this is just conversation
  return {
    success: true,
    message: "I'm not sure what you want me to do. Try 'help' to see what I understand.",
    action: 'unknown',
  };
}

/**
 * Hook for voice command handling
 */
export function useVoiceCommands(context: CommandContext = {}) {
  const execute = useCallback(
    async (text: string) => {
      return parseVoiceCommand(text, context);
    },
    [context]
  );

  return { execute, commands: commandPatterns.map(c => c.description) };
}
