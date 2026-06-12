import { CAT_COLORS } from '../data';

interface ColorPickerPopupProps {
  isOpen: boolean;
  activeColor: string;
  triggerRect: DOMRect | null;
  onSelect: (color: string) => void;
  onClose: () => void;
  isLight: boolean;
}

export default function ColorPickerPopup({
  isOpen,
  activeColor,
  triggerRect,
  onSelect,
  onClose,
  isLight,
}: ColorPickerPopupProps) {
  if (!isOpen || !triggerRect) return null;

  // Position relative to triggering color dot
  const top = triggerRect.bottom + 6;
  const left = Math.min(triggerRect.left, window.innerWidth - 185);

  return (
    <>
      {/* Click-away backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="fixed z-50 flex flex-wrap gap-2 w-44 p-3 border rounded-2xl animate-fade-in"
        style={{
          top: `${top}px`,
          left: `${left}px`,
          background: isLight ? '#ffffff' : 'rgba(8, 12, 36, 0.92)',
          borderColor: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.1)',
          boxShadow: 'none',
        }}
      >
        {CAT_COLORS.map((col) => (
          <button
            key={col}
            onClick={() => {
              onSelect(col);
              onClose();
            }}
            className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 active:scale-90"
            style={{
              background: col,
              borderColor: activeColor === col ? (isLight ? '#000000' : '#ffffff') : 'transparent',
            }}
          />
        ))}

        {/* Custom Color Input */}
        <div
          className="w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110 relative overflow-hidden border border-white/20"
          style={{
            background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
          }}
          title="Custom color"
        >
          <input
            type="color"
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            onChange={(e) => {
              const hex = e.target.value;
              const r = parseInt(hex.slice(1, 3), 16);
              const g = parseInt(hex.slice(3, 5), 16);
              const b = parseInt(hex.slice(5, 7), 16);
              onSelect(`rgba(${r},${g},${b},0.9)`);
            }}
          />
        </div>
      </div>
    </>
  );
}
