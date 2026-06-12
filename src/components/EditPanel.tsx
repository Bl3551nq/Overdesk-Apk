import { useState, useRef } from 'react';
import { Category, AccentPreset, BellSound } from '../types';
import { BELL_SOUNDS, ACCENT_PRESETS, CAT_COLORS } from '../data';
import { Play, Plus, Trash2, ArrowUp, ArrowDown, ChevronRight, ChevronDown, Check, Pencil } from 'lucide-react';

interface EditPanelProps {
  isOpen: boolean;
  categories: Category[];
  onUpdateCategories: (categories: Category[]) => void;
  soundOn: boolean;
  onToggleSound: () => void;
  idleAnim: boolean;
  onToggleIdleAnim: () => void;
  voiceOn: boolean;
  onToggleVoice: () => void;
  voiceError?: string | null;
  isIframe?: boolean;
  voiceSupported?: boolean;
  timerVisible: boolean;
  onToggleTimerVisible: () => void;
  accentIdx: number;
  onSelectAccent: (idx: number) => void;
  onSelectCustomAccent: (hex: string) => void;
  selectedBell: string;
  onBellSelect: (key: string) => void;
  onPreviewBell: (key: string) => void;
  onResetApp: () => void;
  onOpenAbout: () => void;
  onOpenColorPicker: (cat: Category, rect: DOMRect) => void;
}

export default function EditPanel({
  isOpen,
  categories,
  onUpdateCategories,
  soundOn,
  onToggleSound,
  idleAnim,
  onToggleIdleAnim,
  voiceOn,
  onToggleVoice,
  voiceError,
  isIframe,
  voiceSupported,
  timerVisible,
  onToggleTimerVisible,
  accentIdx,
  onSelectAccent,
  onSelectCustomAccent,
  selectedBell,
  onBellSelect,
  onPreviewBell,
  onResetApp,
  onOpenAbout,
  onOpenColorPicker,
}: EditPanelProps) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<{ catId: string; taskIndex: number } | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newTaskNames, setNewTaskNames] = useState<Record<string, string>>({});
  const [isResetConfirm, setIsResetConfirm] = useState(false);

  if (!isOpen) return null;

  // Reordering helpers
  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;
    const newCats = [...categories];
    const temp = newCats[index];
    newCats[index] = newCats[targetIndex];
    newCats[targetIndex] = temp;
    onUpdateCategories(newCats);
  };

  const handleToggleCategory = (index: number) => {
    const activeCats = categories.filter((c) => c.active);
    if (categories[index].active && activeCats.length === 1) {
      return; // Must have at least one active category
    }
    const newCats = [...categories];
    newCats[index].active = !newCats[index].active;
    onUpdateCategories(newCats);
  };

  const handleEditCategoryName = (index: number, val: string) => {
    const newCats = [...categories];
    newCats[index].label = val.trim() || newCats[index].label;
    onUpdateCategories(newCats);
    setEditingCatId(null);
  };

  const handleAddCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    const newCatColor = CAT_COLORS[categories.length % CAT_COLORS.length];
    const newCat: Category = {
      id: 'cat_' + Math.random().toString(36).substring(2, 9),
      label: name,
      color: newCatColor,
      active: true,
      tasks: ['New trade checklist item'],
    };
    onUpdateCategories([...categories, newCat]);
    setNewCatName('');
    setExpandedCat(newCat.id);
  };

  const handleAddTask = (catId: string) => {
    const tName = (newTaskNames[catId] || '').trim();
    if (!tName) return;
    const newCats = categories.map((c) => {
      if (c.id === catId) {
        return { ...c, tasks: [...c.tasks, tName] };
      }
      return c;
    });
    onUpdateCategories(newCats);
    setNewTaskNames((prev) => ({ ...prev, [catId]: '' }));
  };

  const handleEditTask = (catId: string, taskIndex: number, val: string) => {
    const newCats = categories.map((c) => {
      if (c.id === catId) {
        const nextTasks = [...c.tasks];
        nextTasks[taskIndex] = val.trim() || nextTasks[taskIndex];
        return { ...c, tasks: nextTasks };
      }
      return c;
    });
    onUpdateCategories(newCats);
    setEditingTaskId(null);
  };

  const handleDeleteTask = (catId: string, taskIndex: number) => {
    const currentCat = categories.find((c) => c.id === catId);
    if (!currentCat || currentCat.tasks.length <= 1) return; // keep at least one task
    const newCats = categories.map((c) => {
      if (c.id === catId) {
        const nextTasks = [...c.tasks];
        nextTasks.splice(taskIndex, 1);
        return { ...c, tasks: nextTasks };
      }
      return c;
    });
    onUpdateCategories(newCats);
  };

  const handleDeleteCategory = (index: number) => {
    if (categories.length <= 1) return;
    if (categories[index].active && categories.filter((c) => c.active).length === 1) return;
    const newCats = [...categories];
    newCats.splice(index, 1);
    onUpdateCategories(newCats);
    setExpandedCat(null);
  };

  // Safe reset double tap
  const handleResetClick = () => {
    if (!isResetConfirm) {
      setIsResetConfirm(true);
      setTimeout(() => setIsResetConfirm(false), 3000);
    } else {
      onResetApp();
      setIsResetConfirm(false);
    }
  };

  return (
    <div className="mt-3 border-t border-[var(--divider)] pt-3 select-none flex flex-col max-h-[385px] overflow-y-auto pr-1 scrollbar-thin nodrag justify-start">
      <div className="text-[10px] font-bold tracking-wider text-[var(--text-dim)] uppercase mb-2 px-1">
        Folders & Steps
      </div>

      {/* Categories block */}
      <div className="space-y-1.5">
        {categories.map((cat, idx) => {
          const isExpanded = expandedCat === cat.id;
          return (
            <div
              key={cat.id}
              className={`rounded-xl border border-[var(--divider)] transition-all duration-200 ${
                cat.active ? 'bg-[var(--row-bg)]' : 'bg-[var(--row-bg)] opacity-55'
              }`}
            >
              {/* Header */}
              <div className="flex items-center gap-2 p-2 cursor-pointer font-sans">
                {/* Expand Chevron */}
                <button
                  onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                  className="text-[var(--text-dim)] hover:text-[var(--text)]"
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {/* Color Dot */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    onOpenColorPicker(cat, rect);
                  }}
                  className="w-3.5 h-3.5 rounded-full border border-[var(--input-border)] transition-transform hover:scale-125"
                  style={{ background: cat.color }}
                />

                {/* Name Label */}
                {editingCatId === cat.id ? (
                  <input
                    type="text"
                    defaultValue={cat.label}
                    className="flex-1 bg-[var(--input-bg)] text-xs px-2 py-0.5 rounded border border-violet-500 outline-none text-[var(--text)] font-medium"
                    autoFocus
                    onBlur={(e) => handleEditCategoryName(idx, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditCategoryName(idx, e.currentTarget.value);
                      if (e.key === 'Escape') setEditingCatId(null);
                    }}
                  />
                ) : (
                  <div className="flex-1 flex items-center gap-1.5 min-w-0">
                    <span
                      onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                      onDoubleClick={() => setEditingCatId(cat.id)}
                      className="text-xs font-semibold tracking-wide text-[var(--text-mid)] hover:text-[var(--text)] truncate touch-none cursor-pointer flex-1"
                    >
                      {cat.label}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCatId(cat.id);
                      }}
                      className="text-[var(--text-dim)] hover:text-[var(--text)] p-1 opacity-60 hover:opacity-100 transition-opacity"
                      title="Edit workflow name"
                    >
                      <Pencil size={11} />
                    </button>
                  </div>
                )}

                <span className="text-[10px] text-[var(--text-dim)] font-mono font-medium">
                  {cat.tasks.length}
                </span>

                {/* Reordering Controls */}
                <div className="flex gap-0.5 opacity-60 hover:opacity-100">
                  <button
                    onClick={() => moveCategory(idx, 'up')}
                    disabled={idx === 0}
                    className="p-0.5 text-[var(--text-dim)] hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-20"
                  >
                    <ArrowUp size={11} />
                  </button>
                  <button
                    onClick={() => moveCategory(idx, 'down')}
                    disabled={idx === categories.length - 1}
                    className="p-0.5 text-[var(--text-dim)] hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-20"
                  >
                    <ArrowDown size={11} />
                  </button>
                </div>

                {/* Toggle Active status */}
                <button
                  onClick={() => handleToggleCategory(idx)}
                  className={`w-8 h-4.5 rounded-full p-0.5 transition-colors relative duration-200 border border-[var(--divider)]`}
                  style={{ background: cat.active ? cat.color : 'var(--divider)' }}
                >
                  <div
                    className="w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200"
                    style={{ transform: cat.active ? 'translateX(14px)' : 'translateX(0)' }}
                  />
                </button>

                {/* Delete Category */}
                <button
                  onClick={() => handleDeleteCategory(idx)}
                  className="text-red-400 hover:text-red-500 transition-colors p-0.5"
                  title="Delete category"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Collapsed/Expanded Task list */}
              {isExpanded && (
                <div className="border-t border-[var(--divider)] bg-[var(--row-hover)] p-2 space-y-1.5 transition-all rounded-b-xl">
                  {cat.tasks.map((task, ti) => (
                    <div key={ti} className="flex items-center gap-2 group pl-2 py-0.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} />
                      
                      {editingTaskId?.catId === cat.id && editingTaskId?.taskIndex === ti ? (
                        <input
                          type="text"
                          defaultValue={task}
                          className="flex-1 bg-[var(--input-bg)] text-xs px-2 py-0.5 rounded border border-violet-500 outline-none text-[var(--text)]"
                          autoFocus
                          onBlur={(e) => handleEditTask(cat.id, ti, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditTask(cat.id, ti, e.currentTarget.value);
                            if (e.key === 'Escape') setEditingTaskId(null);
                          }}
                        />
                      ) : (
                        <div className="flex-1 flex items-center gap-1.5 min-w-0">
                          <span
                            onClick={() => setEditingTaskId({ catId: cat.id, taskIndex: ti })}
                            className="flex-1 text-[11px] text-[var(--text-mid)] hover:text-[var(--text)] select-text cursor-pointer leading-tight font-medium truncate"
                            title="Click to edit task"
                          >
                            {task}
                          </span>
                          <button
                            onClick={() => setEditingTaskId({ catId: cat.id, taskIndex: ti })}
                            className="opacity-0 group-hover:opacity-100 text-[var(--text-dim)] hover:text-[var(--text)] p-0.5 transition-all"
                            title="Edit task name"
                          >
                            <Pencil size={11} />
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => handleDeleteTask(cat.id, ti)}
                        className="opacity-0 group-hover:opacity-100 text-[var(--text-dim)] hover:text-red-500 transition-all p-0.5"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}

                  {/* Add Task Input inside expanded */}
                  <div className="flex gap-1.5 mt-2 pl-2">
                    <input
                      type="text"
                      className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[11px] text-[var(--text)] px-2 py-1 outline-none focus:border-violet-500/50"
                      placeholder="New task details…"
                      value={newTaskNames[cat.id] || ''}
                      onChange={(e) => setNewTaskNames({ ...newTaskNames, [cat.id]: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(cat.id); }}
                    />
                    <button
                      onClick={() => handleAddTask(cat.id)}
                      className="w-6 h-6 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition-all"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add New Category Row */}
      <div className="flex gap-1.5 mt-2 mb-3 border-b border-[var(--divider)] pb-3">
        <input
          id="add-cat-input"
          type="text"
          className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-xs text-[var(--text)] px-3 py-1.5 outline-none focus:border-violet-500/50"
          placeholder="New workflow name…"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
        />
        <button
          onClick={handleAddCategory}
          className="w-7 h-7 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition-transform active:scale-90"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Settings section */}
      <div className="space-y-2.5 border-t border-[var(--divider)] pt-3 mt-1.5">
        {/* Style Color Settings */}
        <div className="flex items-center justify-between text-xs py-0.5">
          <span className="text-[var(--text-mid)] font-medium">Accent color</span>
          <div className="flex gap-1" id="accent-swatches" />
        </div>

        {/* Visibility Setting */}
        <div className="flex items-center justify-between text-xs py-0.5">
          <div className="flex flex-col">
            <span className="text-[var(--text-mid)] font-medium">Show timer</span>
            <span className="text-[10px] text-[var(--text-dim)]">Custom countdown bar per task</span>
          </div>
          <button
            onClick={onToggleTimerVisible}
            className="w-9 h-5 rounded-full p-0.5 transition-colors duration-200 border border-[var(--divider)]"
            style={{ backgroundColor: timerVisible ? 'var(--accent)' : 'var(--divider)' }}
          >
            <div
              className="w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200"
              style={{ transform: timerVisible ? 'translateX(14px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        {/* Sound Selection */}
        <div className="flex items-center justify-between text-xs py-0.5">
          <div className="flex flex-col">
            <span className="text-[var(--text-mid)] font-medium">Bell Sound</span>
            <span className="text-[10px] text-[var(--text-dim)]">Triggered at 00:00:00</span>
          </div>
          <div className="flex items-center gap-1.5 font-sans">
            <select
              id="bell-selector"
              className="bg-[var(--select-bg)] border border-[var(--input-border)] rounded-lg text-[11px] text-[var(--select-text)] px-2.5 py-1.5 outline-none cursor-pointer hover:border-[var(--text-dim)] transition-all font-medium"
              value={selectedBell}
              onChange={(e) => onBellSelect(e.target.value)}
            >
              {BELL_SOUNDS.map((sound) => (
                <option key={sound.key} value={sound.key}>
                  {sound.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => onPreviewBell(selectedBell)}
              className="w-7 h-7 bg-[var(--row-bg)] border border-[var(--divider)] hover:bg-[var(--row-hover)] rounded-lg text-[var(--text-mid)] hover:text-[var(--text)] flex items-center justify-center transition-colors"
              title="Test bell"
            >
              <Play size={10} fill="currentColor" />
            </button>
          </div>
        </div>

        {/* Text Animation toggle */}
        <div className="flex items-center justify-between text-xs py-0.5">
          <div className="flex flex-col">
            <span className="text-[var(--text-mid)] font-medium">Typewriter effect</span>
            <span className="text-[10px] text-[var(--text-dim)]">Stutters with blink effect</span>
          </div>
          <button
            onClick={onToggleIdleAnim}
            className="w-9 h-5 rounded-full p-0.5 transition-colors duration-200 border border-[var(--divider)]"
            style={{ backgroundColor: idleAnim ? 'var(--accent)' : 'var(--divider)' }}
          >
            <div
              className="w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200"
              style={{ transform: idleAnim ? 'translateX(14px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        {/* Sound toggle */}
        <div className="flex items-center justify-between text-xs py-0.5">
          <div className="flex flex-col">
            <span className="text-[var(--text-mid)] font-medium">Audio feedback</span>
            <span className="text-[10px] text-[var(--text-dim)]">Tick sounds and complete chimes</span>
          </div>
          <button
            onClick={onToggleSound}
            className="w-9 h-5 rounded-full p-0.5 transition-colors duration-200 border border-[var(--divider)]"
            style={{ backgroundColor: soundOn ? 'var(--accent)' : 'var(--divider)' }}
          >
            <div
              className="w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200"
              style={{ transform: soundOn ? 'translateX(14px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        {/* Voice control toggle */}
        <div className="flex flex-col gap-1 py-0.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex flex-col">
              <span className="text-[var(--text-mid)] font-medium">Voice controls (Experimental)</span>
              <span className="text-[10px] text-[var(--text-dim)]">"Next", "Back", "Pause", "Resume"</span>
            </div>
            <button
              onClick={onToggleVoice}
              className="w-9 h-5 rounded-full p-0.5 transition-colors duration-200 border border-[var(--divider)]"
              style={{ backgroundColor: voiceOn ? 'var(--accent)' : 'var(--divider)' }}
            >
              <div
                className="w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200"
                style={{ transform: voiceOn ? 'translateX(14px)' : 'translateX(0)' }}
              />
            </button>
          </div>
          
          {voiceOn && (
            <div className="mt-1 p-2 rounded-lg bg-[var(--row-bg)] border border-[var(--divider)] text-[10px] leading-normal font-medium flex flex-col gap-1 select-text">
              {voiceError ? (
                <span className={voiceError.includes('active') ? "text-emerald-500" : "text-amber-500"}>
                  🎙️ {voiceError}
                </span>
              ) : isIframe ? (
                <div className="flex flex-col gap-1 text-[10px]">
                  <span className="text-sky-400">
                    🎙️ Offline Assembly Voice Engine initialized.
                  </span>
                  <span className="text-[var(--text-dim)]">
                    Note: If you run into permission limits inside this iframe, click "Open in New Tab" in the top-right corner to grant microphone access.
                  </span>
                </div>
              ) : (
                <span className="text-emerald-500">
                  🎙️ Offline voice matching active! Try speaking: "Next", "Back", "Pause", "Resume".
                </span>
              )}
            </div>
          )}
        </div>

        {/* Danger Zone / Deactivation / Reset Option */}
        <div className="flex flex-col gap-2.5 pt-2 border-t border-[var(--divider)]">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[var(--text-dim)] font-medium">Danger Zone</span>
            <button
              onClick={handleResetClick}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all duration-200 ${
                isResetConfirm 
                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 scale-102 border border-red-500/30' 
                  : 'bg-[var(--row-bg)] border border-[var(--divider)] hover:bg-[var(--row-hover)] text-red-500'
              }`}
            >
              {isResetConfirm ? 'Really Reset?' : '↺ Reset Application'}
            </button>
          </div>
        </div>

        {/* About App footer */}
        <div
          onClick={onOpenAbout}
          className="text-center text-[10px] font-bold text-[var(--text-dim)] hover:text-[var(--text-mid)] cursor-pointer pt-2 pb-1 transition-all"
        >
          Overdesk v2.0
        </div>
      </div>
    </div>
  );
}
