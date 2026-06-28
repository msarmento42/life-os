import React, { useEffect, useCallback } from 'react';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';

// Helper to render key combos
const KeyCombo = ({ keys }) => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return (
    <div className="flex gap-1">
      {keys.map((key, index) => (
        <kbd key={index} className="kbd">
          {key === 'meta' ? (isMac ? '⌘' : 'Ctrl') : key.toUpperCase()}
        </kbd>
      ))}
    </div>
  );
};

export const SHORTCUTS = [
  {
    section: 'General',
    shortcuts: [
      { keys: ['meta', 'k'], description: 'Open command palette' },
      { keys: ['meta', '?'], description: 'Toggle keyboard shortcuts help' },
      { keys: ['escape'], description: 'Close any open modal/overlay' },
      { keys: ['meta', 'n'], description: 'Quick-add new task' },
    ],
  },
  {
    section: 'Navigation',
    shortcuts: [
      { keys: ['g', 'h'], description: 'Go to Home (placeholder)' },
      // Add more navigation shortcuts here as they are implemented
    ],
  },
  {
    section: 'Tasks',
    shortcuts: [
      // Add more task-specific shortcuts here as they are implemented
    ],
  },
];

export default function KeyboardShortcutsOverlay({ isOpen, onClose }) {
  // Close on Escape key when overlay is open
  useKeyboardShortcut({ key: 'escape' }, (e) => {
    e.preventDefault(); // Prevent other escape handlers if this overlay is open
    if (isOpen) onClose();
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose} // Close on backdrop click
    >
      <div
        className="relative w-full max-w-lg bg-gray-900 rounded-2xl border border-gray-700 shadow-elevated animate-scale-in p-6"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the card
      >
        <h2 className="text-xl font-semibold text-gray-100 mb-6">Keyboard Shortcuts</h2>

        <div className="space-y-6">
          {SHORTCUTS.map((sectionData) => (
            <div key={sectionData.section}>
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
                {sectionData.section}
              </h3>
              <ul className="space-y-2">
                {sectionData.shortcuts.map((shortcut, index) => (
                  <li key={index} className="flex items-center justify-between">
                    <span className="text-gray-200 text-sm">{shortcut.description}</span>
                    <KeyCombo keys={shortcut.keys} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-100 p-2 rounded-full hover:bg-gray-800 transition-colors"
          aria-label="Close shortcuts"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
