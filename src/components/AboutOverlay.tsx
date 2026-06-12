import { X } from 'lucide-react';
import { OverdeskLogo } from './OverdeskLogo';

interface AboutOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  updaterMessage?: string;
  updaterReady?: boolean;
  isElectron?: boolean;
  onRestartToUpdate?: () => void;
}

export default function AboutOverlay({
  isOpen,
  onClose,
  isLight,
  updaterMessage,
  updaterReady,
  isElectron,
  onRestartToUpdate,
}: AboutOverlayProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-[300px] border rounded-3xl p-6 text-center select-none transition-transform duration-300 scale-100"
        style={{
          background: isLight 
            ? '#ffffff' 
            : 'linear-gradient(155deg, rgba(0,10,45,0.98) 0%, rgba(4,8,28,0.99) 50%, rgba(0,15,65,0.98) 100%)',
          borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
          boxShadow: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 transition-colors duration-150 ${
            isLight ? 'text-black/40 hover:text-black font-semibold' : 'text-white/40 hover:text-white'
          }`}
        >
          <X size={18} />
        </button>

        <div className="flex items-center justify-center mb-4">
          <OverdeskLogo size={56} className="hover:scale-105 transition-transform duration-200" />
        </div>

        <h3 className={`text-xl font-bold tracking-tight ${isLight ? 'text-black' : 'text-white'}`}>Overdesk</h3>
        <p className={`text-xs mt-1 mb-4 leading-relaxed ${isLight ? 'text-black/60' : 'text-white/50'}`}>
          Your pre-market trading ritual
        </p>

        <div className="inline-block text-xs font-semibold tracking-wider text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1 mb-5">
          Version 2.0 (React)
        </div>

        <div className={`h-px my-4 ${isLight ? 'bg-black/10' : 'bg-white/10'}`} />

        <p className={`text-xs leading-relaxed max-w-[240px] mx-auto ${isLight ? 'text-black/50' : 'text-white/40'}`}>
          Built for traders who take their preparation seriously.<br /><br />
          <strong className={isLight ? 'text-black/85' : 'text-white/70'}>Overdesk</strong> keeps your checklist always visible, always ready.
        </p>

        {isElectron && (
          <div className="mt-5 p-3 rounded-2xl border bg-violet-500/5 text-left transition-all duration-200" style={{ borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }}>
            <div className={`text-[9px] uppercase tracking-wider font-bold ${isLight ? 'text-black/40' : 'text-white/35'}`}>
              System Updates
            </div>
            {updaterMessage ? (
              <p className={`text-xs mt-1.5 font-medium ${isLight ? 'text-black/85' : 'text-white/90'}`}>
                {updaterMessage}
              </p>
            ) : (
              <p className={`text-xs mt-1.5 font-medium ${isLight ? 'text-black/50' : 'text-white/50'}`}>
                ✓ Up to date (silent cloud delivery active)
              </p>
            )}
            {updaterReady && onRestartToUpdate && (
              <button
                onClick={onRestartToUpdate}
                className="mt-2.5 w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-[10px] tracking-wide transition-all active:scale-95 duration-150 shadow-md shadow-violet-500/15 cursor-pointer"
              >
                Restart & Apply Update
              </button>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs tracking-wide transition-all active:scale-95 duration-150"
        >
          Done
        </button>
      </div>
    </div>
  );
}
