/**
 * Command Palette Component
 *
 * A searchable command palette (Cmd+K) for quick access to actions and navigation.
 * Accessible and keyboard-navigable.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Command,
  Search,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  X,
} from 'lucide-react';
import {
  useShortcutGroups,
  useKeyboardShortcut,
  formatShortcut,
  type KeyboardShortcut,
  type ShortcutGroup,
} from '../lib/keyboard';
import { focusRingClasses } from '../lib/a11y';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  /** Additional commands beyond registered shortcuts */
  extraCommands?: KeyboardShortcut[];
}

export function CommandPalette({ isOpen, onClose, extraCommands = [] }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const shortcutGroups = useShortcutGroups();

  // Combine registered shortcuts with extra commands
  const allCommands = useMemo(() => {
    const commands: KeyboardShortcut[] = [];
    for (const group of shortcutGroups) {
      commands.push(...group.shortcuts);
    }
    commands.push(...extraCommands);
    return commands;
  }, [shortcutGroups, extraCommands]);

  // Filter commands by search
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return allCommands;

    const query = search.toLowerCase();
    return allCommands.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query) ||
        cmd.category?.toLowerCase().includes(query)
    );
  }, [allCommands, search]);

  // Group filtered commands by category
  const filteredGroups = useMemo(() => {
    const groups = new Map<string, KeyboardShortcut[]>();

    for (const cmd of filteredCommands) {
      const category = cmd.category || 'General';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(cmd);
    }

    return Array.from(groups.entries()).map(([name, shortcuts]) => ({
      name,
      shortcuts,
    }));
  }, [filteredCommands]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      // Delay focus to allow animation
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Register escape shortcut
  useKeyboardShortcut({
    id: 'close-command-palette',
    name: 'Close',
    description: 'Close command palette',
    keys: 'escape',
    action: onClose,
    enabled: isOpen,
    scope: 'command-palette',
  });

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
      }
    },
    [filteredCommands, selectedIndex, onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    selectedElement?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Handle command execution
  const executeCommand = useCallback(
    (command: KeyboardShortcut) => {
      command.action();
      onClose();
    },
    [onClose]
  );

  if (!isOpen) return null;

  // Get flat index for a command
  let flatIndex = 0;
  const getCommandIndex = (groupIndex: number, cmdIndex: number): number => {
    let index = 0;
    for (let g = 0; g < groupIndex; g++) {
      index += filteredGroups[g].shortcuts.length;
    }
    return index + cmdIndex;
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-palette-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette */}
      <div
        className="relative w-full max-w-xl bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden"
        role="combobox"
        aria-expanded="true"
        aria-haspopup="listbox"
        aria-owns="command-list"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
          <Search className="w-5 h-5 text-slate-400" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className={`flex-1 bg-transparent text-white placeholder-slate-500 outline-none ${focusRingClasses}`}
            aria-label="Search commands"
            aria-autocomplete="list"
            aria-controls="command-list"
            aria-activedescendant={
              filteredCommands[selectedIndex]
                ? `command-${filteredCommands[selectedIndex].id}`
                : undefined
            }
          />
          <button
            onClick={onClose}
            className={`p-1 text-slate-400 hover:text-white transition-colors ${focusRingClasses}`}
            aria-label="Close command palette"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Command List */}
        <div
          ref={listRef}
          id="command-list"
          className="max-h-80 overflow-y-auto py-2"
          role="listbox"
          aria-label="Commands"
        >
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500">
              <Command className="w-8 h-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
              <p>No commands found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            filteredGroups.map((group, groupIndex) => (
              <div key={group.name} className="mb-2">
                <div
                  className="px-4 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  role="presentation"
                >
                  {group.name}
                </div>
                {group.shortcuts.map((cmd, cmdIndex) => {
                  const index = getCommandIndex(groupIndex, cmdIndex);
                  const isSelected = index === selectedIndex;

                  return (
                    <button
                      key={cmd.id}
                      id={`command-${cmd.id}`}
                      data-index={index}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`
                        w-full px-4 py-2 flex items-center justify-between text-left transition-colors
                        ${isSelected ? 'bg-cyan-600/20 text-white' : 'text-slate-300 hover:bg-slate-700/50'}
                      `}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div>
                        <div className="font-medium">{cmd.name}</div>
                        <div className="text-sm text-slate-500">{cmd.description}</div>
                      </div>
                      <kbd
                        className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-400 font-mono"
                        aria-label={`Shortcut: ${cmd.keys}`}
                      >
                        {formatShortcut(cmd.keys)}
                      </kbd>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-700 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" aria-hidden="true" />
              <ArrowDown className="w-3 h-3" aria-hidden="true" />
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" aria-hidden="true" />
              <span>Execute</span>
            </span>
            <span className="flex items-center gap-1">
              <span>Esc</span>
              <span>Close</span>
            </span>
          </div>
          <div>
            {filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Keyboard shortcut badge component for displaying shortcuts in UI
 */
export function ShortcutBadge({
  keys,
  className = '',
}: {
  keys: string;
  className?: string;
}) {
  return (
    <kbd
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-700 border border-slate-600 rounded text-xs text-slate-400 font-mono ${className}`}
      aria-label={`Keyboard shortcut: ${keys}`}
    >
      {formatShortcut(keys)}
    </kbd>
  );
}

/**
 * Hook to manage command palette state
 */
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Register Cmd+K shortcut
  useKeyboardShortcut({
    id: 'open-command-palette',
    name: 'Command Palette',
    description: 'Open command palette',
    keys: 'cmd+k',
    action: open,
    category: 'General',
  });

  return { isOpen, open, close, toggle };
}
