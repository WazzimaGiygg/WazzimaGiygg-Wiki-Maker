import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS: {
  title: string;
  items: { keys: string[]; description: string }[];
}[] = [
  {
    title: 'Navigation & Reading',
    items: [
      { keys: ['Ctrl', 'E'], description: 'Switch active page from Read to Edit mode' },
      { keys: ['Ctrl', 'K'], description: 'Focus sidebar page filter search' },
      { keys: ['Alt', 'N'], description: 'Create a new collaborative page' },
      { keys: ['?'], description: 'Open or close keyboard shortcuts guide' },
      { keys: ['Esc'], description: 'Close modal, exit Print View, or return from Edit to Read mode' },
    ],
  },
  {
    title: 'Markdown Editor',
    items: [
      { keys: ['Ctrl', 'Enter'], description: 'Save revision or publish new page' },
      { keys: ['Ctrl', 'S'], description: 'Save revision or publish new page' },
      { keys: ['Ctrl', 'Z'], description: 'Desfazer alteração no editor' },
      { keys: ['Ctrl', 'R'], description: 'Refazer alteração no editor (também Ctrl+Y / Ctrl+Shift+Z)' },
      { keys: ['Ctrl', 'H'], description: 'Localizar e substituir texto no editor' },
      { keys: ['Ctrl', 'B'], description: 'Wrap selection in bold (**text**)' },
      { keys: ['Ctrl', 'I'], description: 'Wrap selection in italic (*text*)' },
      { keys: ['Ctrl', 'Shift', 'L'], description: 'Insert [[slug|Label]] internal wiki link' },
      { keys: ['Ctrl', 'Shift', 'R'], description: 'Insert <ref>...</ref> bibliographic citation' },
      { keys: ['Ctrl', 'Shift', 'I'], description: 'Open Insert Infobox builder' },
      { keys: ['Ctrl', 'Shift', 'T'], description: 'Open Insert MediaWiki Predefinição picker' },
      { keys: ['Ctrl', 'Shift', 'P'], description: 'Alternar Formatado / Código / Lado a lado / Visualizar' },
    ],
  },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc, true);
    return () => window.removeEventListener('keydown', handleEsc, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1623] shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <h2
              id="shortcuts-modal-title"
              className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts guide"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.title} className="space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {group.title}
              </h3>
              <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                {group.items.map((item) => (
                  <div
                    key={item.description}
                    className="flex items-center justify-between gap-4 px-3.5 py-2.5 text-xs bg-slate-50/50 dark:bg-[#0b0f17]/70"
                  >
                    <span className="text-slate-700 dark:text-slate-300">{item.description}</span>
                    <span className="inline-flex items-center gap-1 shrink-0 font-mono tabular-nums">
                      {item.keys.map((keyLabel, kIdx) => (
                        <React.Fragment key={keyLabel}>
                          {kIdx > 0 && <span className="text-slate-400">+</span>}
                          <kbd className="px-1.5 py-0.5 text-[11px] font-medium rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">
                            {keyLabel}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            On macOS, <code className="font-mono">Cmd</code> works interchangeably with{' '}
            <code className="font-mono">Ctrl</code>.
          </p>
        </div>
      </div>
    </div>
  );
};
