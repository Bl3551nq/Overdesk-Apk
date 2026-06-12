import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, RefreshCw, X, Check, Minimize2, Maximize2 } from 'lucide-react';

interface AutoUpdaterPopupProps {
  message: string;
  isReady: boolean;
  onRestartToUpdate: () => void;
  isLight?: boolean;
}

export default function AutoUpdaterPopup({
  message,
  isReady,
  onRestartToUpdate,
  isLight = false,
}: AutoUpdaterPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Automatically show the popup whenever a message arrives
  useEffect(() => {
    if (message && message.trim().length > 0) {
      setIsVisible(true);
    }
  }, [message]);

  if (!isVisible || !message) return null;

  // Classify message & pick icon
  let updatePercent: number | null = null;
  const match = message.match(/(\d+)%/);
  if (match) {
    updatePercent = parseInt(match[1], 10);
  }

  const isDownloading = message.toLowerCase().includes('downloading');
  const isChecking = message.toLowerCase().includes('checking');

  // Aesthetic color classes & styles
  const textTitle = isReady 
    ? 'Update Ready!' 
    : isDownloading 
      ? 'Downloading Update' 
      : isChecking 
        ? 'Checking for Update...'
        : 'System Update';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`relative w-[310px] rounded-3xl border p-5 select-none text-center shadow-2xl ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-800'
              : 'bg-zinc-950 border-zinc-800/80 text-zinc-100'
          }`}
          style={{
            boxShadow: isLight
              ? '0 20px 40px -15px rgba(0,0,0,0.15)'
              : '0 25px 50px -12px rgba(139, 92, 246, 0.15)', // Violet subtle glow
          }}
        >
          {/* Header Controls */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={() => setIsVisible(false)}
              className={`p-1 rounded-full transition-colors ${
                isLight 
                  ? 'hover:bg-slate-200/60 text-slate-400 hover:text-slate-700' 
                  : 'hover:bg-zinc-900 text-zinc-500 hover:text-zinc-200'
              }`}
            >
              <X size={15} />
            </button>
          </div>

          {/* Animated Centered Icon */}
          <div className="flex justify-center mb-4 mt-2">
            <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center ${
              isReady 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-violet-600/10 text-violet-400 border border-violet-500/25'
            }`}>
              {isReady ? (
                <Check size={22} className="animate-bounce" />
              ) : isDownloading ? (
                <Download size={22} className="animate-pulse" />
              ) : (
                <RefreshCw size={22} className="animate-spin" style={{ animationDuration: '3s' }} />
              )}
            </div>
          </div>

          {/* Status Text Info */}
          <h4 className="text-sm font-bold tracking-tight mb-1">
            {textTitle}
          </h4>
          <p className={`text-[11px] leading-relaxed px-2 mb-4 ${
            isLight ? 'text-slate-500' : 'text-zinc-400'
          }`}>
            {message}
          </p>

          {/* Download Progress Bar */}
          {updatePercent !== null && (
            <div className="mb-5 px-1">
              <div className="flex justify-between text-[9px] font-semibold mb-1">
                <span className={isLight ? 'text-slate-400' : 'text-zinc-500'}>Progress</span>
                <span className="text-violet-500">{updatePercent}%</span>
              </div>
              <div className={`w-full h-2 rounded-full overflow-hidden ${
                isLight ? 'bg-slate-200' : 'bg-zinc-900'
              }`}>
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${updatePercent}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </div>
          )}

          {/* Action Button CTA */}
          <div className="space-y-2 mt-4">
            {isReady ? (
              <button
                onClick={onRestartToUpdate}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wide transition-all active:scale-[0.97] shadow-lg shadow-violet-500/15 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={12} className="animate-spin" style={{ animationDuration: '6s' }} />
                Restart & Apply Update
              </button>
            ) : (
              <button
                onClick={() => setIsVisible(false)}
                className={`w-full py-2 rounded-xl text-xs font-semibold tracking-wide transition-all active:scale-[0.97] cursor-pointer ${
                  isLight
                    ? 'bg-slate-200/80 hover:bg-slate-200 text-slate-700'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                }`}
              >
                Hide Progress
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
