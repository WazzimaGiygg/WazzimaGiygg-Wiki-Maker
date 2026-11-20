import React from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  INFOBOX_TYPE_PRESETS,
  type InfoboxBlock,
  type InfoboxField,
  type InfoboxLayout,
  type InfoboxType,
  serializeInfoboxBlock,
} from '../lib/markdownUtils';
import { WikiInfobox } from './WikiInfobox';

interface InfoboxBuilderModalProps {
  isOpen: boolean;
  existingSlugs: Set<string>;
  onClose: () => void;
  onInsert: (markdownBlock: string) => void;
  onNavigateSlug: (slug: string) => void;
}

export const InfoboxBuilderModal: React.FC<InfoboxBuilderModalProps> = ({
  isOpen,
  existingSlugs,
  onClose,
  onInsert,
  onNavigateSlug,
}) => {
  const defaultPreset = INFOBOX_TYPE_PRESETS[0];

  const [selectedType, setSelectedType] = React.useState<InfoboxType>(defaultPreset.type);
  const [title, setTitle] = React.useState(defaultPreset.defaultTitle);
  const [subtitle, setSubtitle] = React.useState(defaultPreset.defaultSubtitle);
  const [image, setImage] = React.useState('');
  const [imageCaption, setImageCaption] = React.useState('');
  const [layout, setLayout] = React.useState<InfoboxLayout>('right');
  const [fields, setFields] = React.useState<InfoboxField[]>(
    defaultPreset.suggestedFields.map((f) => ({ ...f }))
  );

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

  const activePreset =
    INFOBOX_TYPE_PRESETS.find((p) => p.type === selectedType) ?? INFOBOX_TYPE_PRESETS[0];

  const handleSelectType = (nextType: InfoboxType) => {
    const prevPreset =
      INFOBOX_TYPE_PRESETS.find((p) => p.type === selectedType) ?? INFOBOX_TYPE_PRESETS[0];
    const nextPreset =
      INFOBOX_TYPE_PRESETS.find((p) => p.type === nextType) ?? INFOBOX_TYPE_PRESETS[0];

    setSelectedType(nextType);

    // Replace title/subtitle/fields only if they are empty or still equal to the previous preset defaults
    if (!title.trim() || title === prevPreset.defaultTitle) {
      setTitle(nextPreset.defaultTitle);
    }
    if (!subtitle.trim() || subtitle === prevPreset.defaultSubtitle) {
      setSubtitle(nextPreset.defaultSubtitle);
    }

    const matchesPrevDefaults =
      fields.length === prevPreset.suggestedFields.length &&
      fields.every(
        (f, idx) =>
          f.key === prevPreset.suggestedFields[idx]?.key &&
          f.value === prevPreset.suggestedFields[idx]?.value
      );

    if (matchesPrevDefaults || fields.length === 0) {
      setFields(nextPreset.suggestedFields.map((f) => ({ ...f })));
    }
  };

  const handleResetPresetFields = () => {
    setTitle(activePreset.defaultTitle);
    setSubtitle(activePreset.defaultSubtitle);
    setFields(activePreset.suggestedFields.map((f) => ({ ...f })));
  };

  const handleFieldChange = (index: number, part: 'key' | 'value', nextVal: string) => {
    setFields((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [part]: nextVal } : item))
    );
  };

  const handleAddField = () => {
    setFields((prev) => [...prev, { key: 'Attribute', value: 'Details' }]);
  };

  const handleRemoveField = (index: number) => {
    setFields((prev) => prev.filter((_, idx) => idx !== index));
  };

  const previewBlock: InfoboxBlock = {
    type: selectedType,
    title: title.trim() || activePreset.defaultTitle,
    subtitle: subtitle.trim() || undefined,
    image: image.trim() || undefined,
    imageCaption: imageCaption.trim() || undefined,
    layout,
    fields: fields.filter((f) => f.key.trim() && f.value.trim()),
  };

  const handleConfirmInsert = (e: React.FormEvent) => {
    e.preventDefault();
    const serialized = serializeInfoboxBlock(previewBlock);
    onInsert(serialized);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="infobox-builder-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1623] shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h2
              id="infobox-builder-title"
              className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              Insert Wiki Infobox
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose an Infobox template, customize structured rows, and insert cleanly into Markdown.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Infobox builder"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleConfirmInsert}
          className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Left Form Controls */}
          <div className="lg:col-span-7 space-y-5">
            {/* Infobox Type Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Infobox Type
                </label>
                <button
                  type="button"
                  onClick={handleResetPresetFields}
                  className="text-[11px] font-medium text-blue-700 dark:text-blue-400 hover:underline"
                >
                  Load {activePreset.label} defaults
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {INFOBOX_TYPE_PRESETS.map((preset) => {
                  const active = preset.type === selectedType;
                  return (
                    <button
                      key={preset.type}
                      type="button"
                      onClick={() => handleSelectType(preset.type)}
                      className={`px-3 py-2 text-left text-xs rounded-lg border transition-colors ${
                        active
                          ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0b0f17] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="truncate">{preset.label}</div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {activePreset.description}
              </p>
            </div>

            {/* Title & Subtitle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="infobox-title-input"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Title
                </label>
                <input
                  id="infobox-title-input"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Subject name"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label
                  htmlFor="infobox-subtitle-input"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Subtitle (optional)
                </label>
                <input
                  id="infobox-subtitle-input"
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Classification or tagline"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>
            </div>

            {/* Alignment & Media */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="infobox-layout-select"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Page Placement
                </label>
                <select
                  id="infobox-layout-select"
                  value={layout}
                  onChange={(e) => setLayout(e.target.value as InfoboxLayout)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                >
                  <option value="right">Float right</option>
                  <option value="left">Float left</option>
                  <option value="full">Full width</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="infobox-image-input"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Image URL (optional)
                </label>
                <input
                  id="infobox-image-input"
                  type="text"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label
                  htmlFor="infobox-caption-input"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Caption (optional)
                </label>
                <input
                  id="infobox-caption-input"
                  type="text"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="Portrait caption"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>
            </div>

            {/* Key-Value Fields Editor */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Metadata Rows ({fields.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add row</span>
                </button>
              </div>

              <div className="space-y-2">
                {fields.map((field, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={field.key}
                      onChange={(e) => handleFieldChange(idx, 'key', e.target.value)}
                      placeholder="Label"
                      aria-label={`Row ${idx + 1} label`}
                      className="w-2/5 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                    />
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => handleFieldChange(idx, 'value', e.target.value)}
                      placeholder="Value (supports [[slug]] links)"
                      aria-label={`Row ${idx + 1} value`}
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveField(idx)}
                      aria-label={`Remove row ${idx + 1}`}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tip: Row values support inline Markdown and <code className="font-mono">[[slug|Label]]</code> wiki links.
              </p>
            </div>
          </div>

          {/* Right Live Preview */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-5">
            <div className="space-y-2.5">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Infobox preview
              </div>
              <WikiInfobox
                infobox={previewBlock}
                existingSlugs={existingSlugs}
                onNavigateSlug={(slug) => {
                  onClose();
                  onNavigateSlug(slug);
                }}
                disableFloat
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
              >
                Insert Infobox
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
