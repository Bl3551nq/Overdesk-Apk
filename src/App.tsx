import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, 
  Moon, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  RotateCcw, 
  Play, 
  Pause, 
  SlidersHorizontal,
  FolderLock,
  X,
  Mic,
  Minus
} from 'lucide-react';
import { Category, AppState } from './types';
import { DEFAULT_CATEGORIES, ACCENT_PRESETS } from './data';
import { 
  warmAudioContext, 
  playTick, 
  playCancel, 
  playChime, 
  playBellTick, 
  playBellOnce 
} from './utils/audio';
import EditPanel from './components/EditPanel';
import AboutOverlay from './components/AboutOverlay';
import ColorPickerPopup from './components/ColorPickerPopup';
import AutoUpdaterPopup from './components/AutoUpdaterPopup';
import { TypewriterText } from './components/TypewriterText';
import { OfflineVoiceEngine } from './utils/offlineVoice';

const STORE_KEY = 'overdesk_react_v2';

export default function App() {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isClosed, setIsClosed] = useState<boolean>(false);

  useEffect(() => {
    const handleCheckMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleCheckMobile();
    window.addEventListener('resize', handleCheckMobile);
    return () => window.removeEventListener('resize', handleCheckMobile);
  }, []);

  // Load State
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.categories) return parsed.categories;
      }
    } catch (e) {}
    return DEFAULT_CATEGORIES;
  });

  const [step, setStep] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) return JSON.parse(saved).step || 0;
    } catch (e) {}
    return 0;
  });

  const [isDone, setIsDone] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) return JSON.parse(saved).isDone || false;
    } catch (e) {}
    return false;
  });

  const [isLight, setIsLight] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) return JSON.parse(saved).isLight || false;
    } catch (e) {}
    return false;
  });

  const [idleAnim, setIdleAnim] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) return saved.includes('idleAnim') ? JSON.parse(saved).idleAnim : true;
    } catch (e) {}
    return true;
  });

  const [soundOn, setSoundOn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) return saved.includes('soundOn') ? JSON.parse(saved).soundOn : true;
    } catch (e) {}
    return true;
  });

  const [voiceOn, setVoiceOn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) return JSON.parse(saved).voiceOn || false;
    } catch (e) {}
    return false;
  });

  const [accentIdx, setAccentIdx] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) return JSON.parse(saved).accentIdx ?? 0;
    } catch (e) {}
    return 0;
  });

  const [selectedBell, setSelectedBell] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) return JSON.parse(saved).selectedBell || 'school_bell';
    } catch (e) {}
    return 'school_bell';
  });

  const [timerTarget, setTimerTarget] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) return JSON.parse(saved).timerTarget ?? 300;
    } catch (e) {}
    return 300;
  });

  const [timerVisible, setTimerVisible] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) return saved.includes('timerVisible') ? JSON.parse(saved).timerVisible : true;
    } catch (e) {}
    return true;
  });

  // UI state
  const [posX, setPosX] = useState(() => {
    const space = window.innerWidth - 320;
    if (space > 80) return Math.round(space / 2);
    return 10;
  });
  const [posY, setPosY] = useState(() => {
    const cardEstHeight = 220;
    const space = window.innerHeight - cardEstHeight;
    if (space > 110) return Math.round((space - 28) / 2);
    return 10;
  });
  const [cardWidth, setCardWidth] = useState(320);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Floating Mini-Icon Drag
  const [miniX, setMiniX] = useState(() => Math.round(window.innerWidth - 68));
  const [miniY, setMiniY] = useState(() => Math.round(window.innerHeight - 108));
  const [isDraggingMini, setIsDraggingMini] = useState(false);
  const miniDragOffset = useRef({ x: 0, y: 0 });
  const miniStartCoords = useRef({ x: 0, y: 0 });
  const miniDidMove = useRef(false);
  const miniFrameRef = useRef<number | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState<{ cat: Category; rect: DOMRect } | null>(null);
  const [updaterMessage, setUpdaterMessage] = useState<string>('');
  const [updaterReady, setUpdaterReady] = useState<boolean>(false);

  // Dragging Card
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragFrameRef = useRef<number | null>(null);

  // Resizing Card
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(320);
  const resizeStartLeft = useRef(0);

  // References & Electron Detection
  const cardRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<HTMLDivElement>(null);
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
  const lastIgnoreRef = useRef<boolean | null>(null);

  const activateInteraction = () => {
    if (isElectron) {
      if (lastIgnoreRef.current !== false) {
        lastIgnoreRef.current = false;
        try {
          (window as any).electronAPI.setIgnoreMouseEvents(false);
        } catch (err) {}
      }
    }
  };

  // Timer run variables
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStartedAt, setTimerStartedAt] = useState<string | null>(null);
  const [isEditingTimer, setIsEditingTimer] = useState(false);
  const [editHoursStr, setEditHoursStr] = useState("00");
  const [editMinutesStr, setEditMinutesStr] = useState("00");
  const [editSecondsStr, setEditSecondsStr] = useState("00");

  // Voice indicators
  const [voiceHeardLabel, setVoiceHeardLabel] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isIframe, setIsIframe] = useState<boolean>(false);
  const [voiceActiveTrigger, setVoiceActiveTrigger] = useState<boolean>(false);
  const voiceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      setIsIframe(window.self !== window.top);
    } catch (e) {
      setIsIframe(true);
    }
  }, []);

  // Keep card and floating mini in viewport on window resize
  useEffect(() => {
    const handleResize = () => {
      const cardH = cardRef.current?.offsetHeight || 220;
      setPosX((prev) => {
        const maxX = Math.max(0, window.innerWidth - cardWidth);
        return Math.max(0, Math.min(maxX, prev));
      });
      setPosY((prev) => {
        const minY = window.innerHeight < cardH ? window.innerHeight - cardH : 0;
        const maxY = window.innerHeight < cardH ? 0 : window.innerHeight - cardH;
        return Math.max(minY, Math.min(maxY, prev));
      });
      setMiniX((prev) => Math.max(0, Math.min(window.innerWidth - 48, prev)));
      setMiniY((prev) => Math.max(0, Math.min(window.innerHeight - 48, prev)));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [cardWidth]);

  // Listen for auto-updater events in Electron
  useEffect(() => {
    if (!isElectron) return;

    let unsubscribeMsg: (() => void) | undefined;
    let unsubscribeDownloaded: (() => void) | undefined;

    try {
      if ((window as any).electronAPI?.onUpdaterMessage) {
        unsubscribeMsg = (window as any).electronAPI.onUpdaterMessage((text: string) => {
          setUpdaterMessage(text);
        });
      }
      if ((window as any).electronAPI?.onUpdaterDownloaded) {
        unsubscribeDownloaded = (window as any).electronAPI.onUpdaterDownloaded((text: string) => {
          setUpdaterReady(true);
          setUpdaterMessage(text);
        });
      }
    } catch (err) {
      console.error('Failed to subscribe to auto-updater events:', err);
    }

    return () => {
      if (unsubscribeMsg) unsubscribeMsg();
      if (unsubscribeDownloaded) unsubscribeDownloaded();
    };
  }, [isElectron]);

  // Active task queue
  const queue = buildQueue();

  function buildQueue() {
    const q: { text: string; cat: string; color: string }[] = [];
    categories.forEach((cat) => {
      if (cat.active) {
        cat.tasks.forEach((t) => {
          q.push({ text: t, cat: cat.label, color: cat.color });
        });
      }
    });
    return q;
  }

  const [customAccent, setCustomAccent] = useState<string | null>(null);

  // Save State on Change
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        categories, step, isDone, isLight, idleAnim, soundOn, voiceOn, accentIdx, selectedBell, timerTarget, timerVisible
      }));
    } catch (e) {}
  }, [categories, step, isDone, isLight, idleAnim, soundOn, voiceOn, accentIdx, selectedBell, timerTarget, timerVisible]);

  // Accent Color implementation in CSS (Presets + Custom)
  useEffect(() => {
    if (accentIdx === -1 && customAccent) {
      const r = parseInt(customAccent.slice(1, 3), 16);
      const g = parseInt(customAccent.slice(3, 5), 16);
      const b = parseInt(customAccent.slice(5, 7), 16);
      const rgba = `rgba(${r},${g},${b},0.9)`;
      const root = document.documentElement;
      root.style.setProperty('--accent', rgba);
      root.style.setProperty('--accent-soft', `rgba(${r},${g},${b},0.18)`);
      root.style.setProperty('--glow', `rgba(${r},${g},${b},0.8)`);
      root.style.setProperty('--glowfade', `rgba(${r},${g},${b},0.22)`);
      root.style.setProperty('--ibg', rgba);
    } else {
      const p = ACCENT_PRESETS[accentIdx] || ACCENT_PRESETS[0];
      const root = document.documentElement;
      root.style.setProperty('--accent', p.rgba);
      root.style.setProperty('--accent-soft', p.rgba.replace(/[\d.]+\)$/, '0.18)'));
      root.style.setProperty('--glow', p.glow);
      root.style.setProperty('--glowfade', p.glowf);
      root.style.setProperty('--ibg', p.rgba);
    }
  }, [accentIdx, customAccent]);

  // Timer Tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          const next = prev + 1;
          const remaining = timerTarget - next;
          if (remaining === 1) {
            playBellTick(selectedBell, soundOn);
          }
          if (remaining <= 0) {
            setTimerRunning(false);
            if (interval) clearInterval(interval);
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timerTarget, selectedBell, soundOn]);

  const skipTimerResetRef = useRef(false);

  // Start timer automatically when task slides
  const startTimerForTask = () => {
    setTimerRunning(true);
    if (!timerStartedAt) {
      const now = new Date();
      setTimerStartedAt(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  };

  useEffect(() => {
    if (queue.length > 0 && !isDone) {
      if (skipTimerResetRef.current) {
        skipTimerResetRef.current = false;
      } else {
        startTimerForTask();
      }
    }
  }, [step, isDone]);

  // Web Speech API Voice Recognition Configuration
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognitionRef = useRef<any | null>(null);
  const offlineVoiceRef = useRef<OfflineVoiceEngine | null>(null);

  // Maintain actual voice action & state refs to prevent constant re-initialization of microphone
  const voiceStateRef = useRef({ soundOn, selectedBell });
  const voiceActionsRef = useRef({ handleAdvance, handleGoBack, setTimerRunning, setTimerSeconds });

  useEffect(() => {
    voiceStateRef.current = { soundOn, selectedBell };
  }, [soundOn, selectedBell]);

  useEffect(() => {
    voiceActionsRef.current = { handleAdvance, handleGoBack, setTimerRunning, setTimerSeconds };
  }, [handleAdvance, handleGoBack, setTimerRunning, setTimerSeconds]);

  useEffect(() => {
    if (!voiceOn) {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onstart = null;
        try {
          recognitionRef.current.stop();
        } catch (err) {}
        recognitionRef.current = null;
      }
      if (offlineVoiceRef.current) {
        offlineVoiceRef.current.stop();
        offlineVoiceRef.current = null;
      }
      setVoiceError(null);
      return;
    }

    // 1. Initialize and start the offline local signal parsing voice engine (always works completely offline!)
    if (!offlineVoiceRef.current) {
      const offlineEngine = new OfflineVoiceEngine();
      
      offlineEngine.onCommand = (cmd: string) => {
        console.log("Offline engine command triggered:", cmd);
        if (cmd === "Next") {
          skipTimerResetRef.current = true;
          voiceActionsRef.current.handleAdvance();
          setVoiceActiveTrigger(true);
          if (voiceTimeout.current) clearTimeout(voiceTimeout.current);
          voiceTimeout.current = setTimeout(() => setVoiceActiveTrigger(false), 1000);
        } else if (cmd === "Back") {
          skipTimerResetRef.current = true;
          voiceActionsRef.current.handleGoBack();
          setVoiceActiveTrigger(true);
          if (voiceTimeout.current) clearTimeout(voiceTimeout.current);
          voiceTimeout.current = setTimeout(() => setVoiceActiveTrigger(false), 1000);
        }
      };

      offlineEngine.onState = (status: string) => {
        setVoiceError(status);
      };

      offlineVoiceRef.current = offlineEngine;
      offlineEngine.start().catch((err) => {
        console.log("Failed starting offline phonetic audio listener:", err);
      });
    }

    // 2. Fallback/Concurrent Web Speech recognition
    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = false; // More responsive, instant triggers across safari & mobile chrome
        rec.interimResults = false;
        rec.lang = 'en-US';
        rec.maxAlternatives = 1;

        rec.onstart = () => {
          // Active
        };

        rec.onresult = (e: any) => {
          // With continuous = false, there is usually exactly one final result
          const result = e.results[0];
          if (!result || !result[0]) return;
          const speech = result[0].transcript.toLowerCase().trim();
          console.log('Online Speech heard transcript:', speech);
          
          let recognizedCmd = '';
          if (
            speech.includes('next') || 
            speech.includes('forward') || 
            speech.includes('advance') || 
            speech.includes('skip') || 
            speech.includes('done') || 
            speech.includes('complete') || 
            speech === 'ok' || 
            speech === 'okay' ||
            speech.includes('text') ||
            speech.includes('necks') ||
            speech.includes('neks') ||
            speech.includes('nest') ||
            speech.includes('net') ||
            speech.includes('makes') ||
            speech.includes('mixed') ||
            speech.includes('legs')
          ) {
            recognizedCmd = 'Next';
            skipTimerResetRef.current = true;
            voiceActionsRef.current.handleAdvance();
          } else if (
            speech.includes('back') || 
            speech.includes('previous') || 
            speech.includes('prev') || 
            speech.includes('go back') ||
            speech.includes('bag') ||
            speech.includes('pack') ||
            speech.includes('black') ||
            speech.includes('beck') ||
            speech.includes('return')
          ) {
            recognizedCmd = 'Back';
            skipTimerResetRef.current = true;
            voiceActionsRef.current.handleGoBack();
          }

          if (recognizedCmd) {
            setVoiceActiveTrigger(true);
            if (voiceTimeout.current) clearTimeout(voiceTimeout.current);
            voiceTimeout.current = setTimeout(() => setVoiceActiveTrigger(false), 1000);
          }
        };

        rec.onend = () => {
          // Delay restart slightly to allow browser audio context to cycle smoothly
          if (voiceOn && recognitionRef.current) {
            setTimeout(() => {
              if (voiceOn && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (err) {
                  console.log('Error restarting speech recognition:', err);
                }
              }
            }, 200);
          }
        };

        rec.onerror = (e: any) => {
          console.log('Speech recognition error event:', e.error);
          if (e.error === 'not-allowed') {
            setVoiceError('Microphone permission blocked. Please ensure you open the app in a new tab.');
            if (recognitionRef.current) {
              recognitionRef.current.onend = null;
            }
          } else if (e.error === 'service-not-allowed') {
            // Speech recognition service offline / disabled in browser
            if (offlineVoiceRef.current) {
              setVoiceError('Offline Assembly voice active 🎙️');
            } else {
              setVoiceError('Speech recognition service blocked.');
            }
          } else if (e.error === 'network') {
            if (offlineVoiceRef.current) {
              setVoiceError('Offline Assembly active 🎙️ (Standard API Offline)');
            } else {
              setVoiceError('Network offline.');
            }
          }
        };

        recognitionRef.current = rec;
        try {
          rec.start();
        } catch (err) {
          console.log('Error starting SpeechRecognition:', err);
        }
      } catch (err) {
        console.log('Error constructing SpeechRecognition:', err);
        if (offlineVoiceRef.current) {
          setVoiceError('Offline Assembly active 🎙️');
        }
      }
    } else {
      // If Web Speech is completely unsupported (e.g. some native Electron config / other environments)
      if (offlineVoiceRef.current) {
        setVoiceError('Offline Assembly active 🎙️');
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onstart = null;
        try {
          recognitionRef.current.stop();
        } catch (err) {}
        recognitionRef.current = null;
      }
      if (offlineVoiceRef.current) {
        offlineVoiceRef.current.stop();
        offlineVoiceRef.current = null;
      }
    };
  }, [voiceOn]);

  // Dynamic card auto-resizing IPC for Electron
  useEffect(() => {
    if (!isElectron) return;

    if (isMinimized) {
      try {
        (window as any).electronAPI.resizeWindow(80, 80);
      } catch (err) {}
      return;
    }

    const cardEl = cardRef.current;
    if (!cardEl) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = cardEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Send width + 120px (60px left/right padding) and height + 180px (90px top/bottom padding) to host the large soft drop shadow perfectly without bottom clipping
        (window as any).electronAPI.resizeWindow(rect.width + 120, rect.height + 180);
      }
    });

    resizeObserver.observe(cardEl);
    return () => {
      resizeObserver.disconnect();
    };
  }, [isElectron, isMinimized]);

  // Toggle ignoring click-through on transparent padding space outside the app card in Electron
  useEffect(() => {
    if (!isElectron) return;

    if (isMinimized) {
      // In minimized widget mode, ensure mouse interaction works over the 48px circular target
      // but is ignored/click-through outside the circular radius (25px radius from center 40,40)
      const handleMinimizedMouseMove = (e: MouseEvent) => {
        const dx = e.clientX - 40;
        const dy = e.clientY - 40;
        const isInsideCircle = (dx * dx + dy * dy) <= 25 * 25;

        if (isInsideCircle) {
          if (lastIgnoreRef.current !== false) {
            lastIgnoreRef.current = false;
            try {
              (window as any).electronAPI.setIgnoreMouseEvents(false);
            } catch (err) {}
          }
        } else {
          if (lastIgnoreRef.current !== true) {
            lastIgnoreRef.current = true;
            try {
              (window as any).electronAPI.setIgnoreMouseEvents(true, { forward: true });
            } catch (err) {}
          }
        }
      };

      window.addEventListener('mousemove', handleMinimizedMouseMove);
      return () => {
        window.removeEventListener('mousemove', handleMinimizedMouseMove);
        if (isElectron) {
          try {
            (window as any).electronAPI.setIgnoreMouseEvents(false);
          } catch (err) {}
        }
      };
    }

    const handleWindowMouseMove = (e: MouseEvent) => {
      // If full screen overlays are open, ensure the entire window is interactive
      if (isAboutOpen || !!colorPickerTarget) {
        if (lastIgnoreRef.current !== false) {
          lastIgnoreRef.current = false;
          (window as any).electronAPI.setIgnoreMouseEvents(false);
        }
        return;
      }

      const cardEl = cardRef.current;
      if (!cardEl) return;

      const rect = cardEl.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;

      // Check if mouse is within the visual card element
      const isInside = (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      );

      if (isInside) {
        if (lastIgnoreRef.current !== false) {
          lastIgnoreRef.current = false;
          (window as any).electronAPI.setIgnoreMouseEvents(false);
        }
      } else {
        if (lastIgnoreRef.current !== true) {
          lastIgnoreRef.current = true;
          (window as any).electronAPI.setIgnoreMouseEvents(true, { forward: true });
        }
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      if (isElectron) {
        try {
          (window as any).electronAPI.setIgnoreMouseEvents(false);
        } catch (err) {}
      }
    };
  }, [isElectron, isMinimized, isAboutOpen, colorPickerTarget]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      // ignore keys inside inputs or textareas
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.getAttribute('contenteditable') === 'true') {
        return;
      }
      if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        playTick(soundOn);
        handleAdvance();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        playTick(soundOn);
        handleGoBack();
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [isDone, step, queue.length, soundOn]);

  // Nav Handlers
  function handleAdvance() {
    if (isDone) {
      setIsDone(false);
      setStep(0);
      setTimerSeconds(0);
      setTimerRunning(true);
      playTick(soundOn);
      return;
    }
    if (!queue.length) return;
    if (step < queue.length - 1) {
      setStep((prev) => prev + 1);
      playTick(soundOn);
    } else {
      setIsDone(true);
      playChime(soundOn);
    }
  }

  function handleGoBack() {
    if (step === 0 && !isDone) return;
    if (isDone) {
      setIsDone(false);
      setStep(queue.length - 1);
    } else {
      setStep((prev) => prev - 1);
    }
    playTick(soundOn);
  }

  const handleTimerReset = () => {
    setTimerSeconds(0);
    setTimerRunning(true);
    playTick(soundOn);
  };

  /* Dragging handlers for main card */
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, a, .accent-swatch, .cat-color-dot, .nodrag')) {
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);

    let curX = posX;
    let curY = posY;
    if (cardRef.current) {
      const leftVal = cardRef.current.style.left;
      const topVal = cardRef.current.style.top;
      if (leftVal && leftVal.endsWith('px')) curX = parseFloat(leftVal);
      if (topVal && topVal.endsWith('px')) curY = parseFloat(topVal);
    }

    dragOffset.current = {
      x: e.clientX - curX,
      y: e.clientY - curY,
    };
    warmAudioContext();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (dragFrameRef.current) {
      cancelAnimationFrame(dragFrameRef.current);
    }

    dragFrameRef.current = requestAnimationFrame(() => {
      const cardH = cardRef.current?.offsetHeight || 220;
      const rawX = clientX - dragOffset.current.x;
      const rawY = clientY - dragOffset.current.y;
      
      const minX = 0;
      const maxX = Math.max(0, window.innerWidth - cardWidth);
      const clampedX = Math.max(minX, Math.min(maxX, rawX));

      const minY = window.innerHeight < cardH ? window.innerHeight - cardH : 0;
      const maxY = window.innerHeight < cardH ? 0 : window.innerHeight - cardH;
      const clampedY = Math.max(minY, Math.min(maxY, rawY));

      if (cardRef.current) {
        cardRef.current.style.left = `${clampedX}px`;
        cardRef.current.style.top = `${clampedY}px`;
      }
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    setIsDragging(false);
    if (dragFrameRef.current) {
      cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    if (cardRef.current) {
      const finalLeft = parseFloat(cardRef.current.style.left);
      const finalTop = parseFloat(cardRef.current.style.top);
      if (!isNaN(finalLeft)) setPosX(finalLeft);
      if (!isNaN(finalTop)) setPosY(finalTop);
    }
  };

  /* Dragging handlers for mini bullseye icon */
  const handleMiniPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (isElectron) {
      try {
        if ((window as any).electronAPI?.startWindowDrag) {
          (window as any).electronAPI.startWindowDrag();
        }
      } catch (err) {}
      setIsDraggingMini(true);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingMini(true);
    miniDidMove.current = false;
    miniStartCoords.current = {
      x: e.clientX,
      y: e.clientY,
    };

    let curX = miniX;
    let curY = miniY;
    if (miniRef.current) {
      const leftVal = miniRef.current.style.left;
      const topVal = miniRef.current.style.top;
      if (leftVal && leftVal.endsWith('px')) curX = parseFloat(leftVal);
      if (topVal && topVal.endsWith('px')) curY = parseFloat(topVal);
    }

    miniDragOffset.current = {
      x: e.clientX - curX,
      y: e.clientY - curY,
    };
    warmAudioContext();
  };

  const handleMiniPointerMove = (e: React.PointerEvent) => {
    if (isElectron) return;
    if (!isDraggingMini) return;
    const clientX = e.clientX;
    const clientY = e.clientY;

    const dx = Math.abs(clientX - miniStartCoords.current.x);
    const dy = Math.abs(clientY - miniStartCoords.current.y);
    if (dx > 4 || dy > 4) {
      miniDidMove.current = true;
    }

    if (miniFrameRef.current) {
      cancelAnimationFrame(miniFrameRef.current);
    }

    miniFrameRef.current = requestAnimationFrame(() => {
      const newX = Math.max(0, Math.min(window.innerWidth - 48, clientX - miniDragOffset.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 48, clientY - miniDragOffset.current.y));
      
      if (miniRef.current) {
        miniRef.current.style.left = `${newX}px`;
        miniRef.current.style.top = `${newY}px`;
      }
    });
  };

  const handleMiniPointerUp = (e: React.PointerEvent) => {
    if (isElectron) {
      try {
        if ((window as any).electronAPI?.endWindowDrag) {
          (window as any).electronAPI.endWindowDrag();
        }
      } catch (err) {}
      setIsDraggingMini(false);
      return;
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    setIsDraggingMini(false);
    if (miniFrameRef.current) {
      cancelAnimationFrame(miniFrameRef.current);
      miniFrameRef.current = null;
    }
    if (miniRef.current) {
      const finalLeft = parseFloat(miniRef.current.style.left);
      const finalTop = parseFloat(miniRef.current.style.top);
      if (!isNaN(finalLeft)) setMiniX(finalLeft);
      if (!isNaN(finalTop)) setMiniY(finalTop);
    }
  };

  const handleMiniPointerCancel = (e: React.PointerEvent) => {
    if (isElectron) {
      try {
        if ((window as any).electronAPI?.endWindowDrag) {
          (window as any).electronAPI.endWindowDrag();
        }
      } catch (err) {}
      setIsDraggingMini(false);
      return;
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    setIsDraggingMini(false);
    if (miniFrameRef.current) {
      cancelAnimationFrame(miniFrameRef.current);
      miniFrameRef.current = null;
    }
    if (miniRef.current) {
      const finalLeft = parseFloat(miniRef.current.style.left);
      const finalTop = parseFloat(miniRef.current.style.top);
      if (!isNaN(finalLeft)) setMiniX(finalLeft);
      if (!isNaN(finalTop)) setMiniY(finalTop);
    }
  };

  /* Left-side Resizing */
  const handleResizeDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = cardWidth;
    
    let curX = posX;
    if (cardRef.current) {
      const leftVal = cardRef.current.style.left;
      if (leftVal && leftVal.endsWith('px')) curX = parseFloat(leftVal);
    }
    resizeStartLeft.current = curX;
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!isResizing) return;
    const dx = resizeStartX.current - e.clientX; // drag left to increase width, right to decrease
    
    const minCardW = 230;
    const maxCardW = 480;
    const nextWidth = Math.min(maxCardW, Math.max(minCardW, resizeStartWidth.current + dx));
    const widthDiff = nextWidth - resizeStartWidth.current;
    
    setCardWidth(nextWidth);
    
    const nextLeft = resizeStartLeft.current - widthDiff;
    const maxX = Math.max(0, window.innerWidth - nextWidth);
    const clampedLeft = Math.max(0, Math.min(maxX, nextLeft));
    
    setPosX(clampedLeft);
    if (cardRef.current) {
      cardRef.current.style.left = `${clampedLeft}px`;
    }
  };

  const handleResizeUp = () => {
    setIsResizing(false);
  };

  const toggleTheme = () => {
    setIsLight((prev) => !prev);
  };

  const minimizeCard = () => {
    setIsMinimized(true);
  };

  const toggleEdit = () => {
    setIsEditOpen((prev) => !prev);
  };

  const closeApp = () => {
    playCancel(soundOn);
    if ((window as any).electronAPI) {
      (window as any).electronAPI.close();
    } else {
      setIsClosed(true);
      try {
        window.close();
      } catch (err) {}
    }
  };

  const timerFormat = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const sec = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const timerTogglePause = () => {
    setTimerRunning((prev) => !prev);
  };

  const applyAccent = (idx: number) => {
    setAccentIdx(idx);
    setCustomAccent(null);
  };

  const applyAccentCustom = (hex: string) => {
    setAccentIdx(-1);
    setCustomAccent(hex);
  };

  const onBellSelect = (key: string) => {
    setSelectedBell(key);
    playPreviewBell(key);
  };

  const handleStartEditTimer = () => {
    const totalSeconds = timerTarget;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    setEditHoursStr(String(h).padStart(2, '0'));
    setEditMinutesStr(String(m).padStart(2, '0'));
    setEditSecondsStr(String(s).padStart(2, '0'));
    setIsEditingTimer(true);
  };

  const handleSaveTimer = () => {
    const h = parseInt(editHoursStr, 10) || 0;
    const m = parseInt(editMinutesStr, 10) || 0;
    const s = parseInt(editSecondsStr, 10) || 0;
    const totalSeconds = (h * 3600) + (m * 60) + s;
    const finalSeconds = Math.max(1, totalSeconds);
    setTimerTarget(finalSeconds);
    setTimerSeconds(0);
    setIsEditingTimer(false);
    if (timerRunning) {
      const now = new Date();
      setTimerStartedAt(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  };

  const playPreviewBell = (key: string) => {
    warmAudioContext();
    playBellOnce(key, true);
  };

  const resetApp = () => {
    setCategories(DEFAULT_CATEGORIES.map((c) => ({ ...c, tasks: [...c.tasks] })));
    setIsLight(false);
    setIdleAnim(true);
    setSoundOn(true);
    setVoiceOn(false);
    setAccentIdx(0);
    setCustomAccent(null);
    setSelectedBell('school_bell');
    setTimerTarget(300);
    setTimerSeconds(0);
    setTimerRunning(false);
    setTimerStartedAt(null);
    setTimerVisible(true);
    setStep(0);
    setIsDone(false);
  };

  const openAbout = () => {
    setIsAboutOpen(true);
  };

  const activeItem = queue[isDone ? -1 : step];

  return (
    <div className="relative w-screen h-screen overflow-hidden font-sans select-none bg-transparent flex items-center justify-center">
      {/* Draggable Red Circular Target Icon (Bullseye, No Glow) when minimized */}
          <AnimatePresence>
            {isMinimized && (
              <motion.div
                ref={miniRef}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                style={isElectron ? {
                  position: 'fixed',
                  left: 0,
                  top: 0,
                  width: '80px',
                  height: '80px',
                  zIndex: 99999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                } : {
                  position: 'fixed',
                  left: miniX,
                  top: miniY,
                  width: '48px',
                  height: '48px',
                  zIndex: 99999,
                }}
                className="select-none touch-none"
              >
                <div
                  onPointerDown={handleMiniPointerDown}
                  onPointerMove={handleMiniPointerMove}
                  onPointerUp={handleMiniPointerUp}
                  onPointerCancel={handleMiniPointerCancel}
                  onLostPointerCapture={handleMiniPointerCancel}
                  onMouseEnter={activateInteraction}
                  onPointerOver={activateInteraction}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized(false);
                  }}
                  className="flex items-center justify-center select-none cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 transition-transform duration-150 relative"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#d9251c', // Deep solid target red
                    border: 'none',
                    boxShadow: 'none', // Strict requirement: no glow
                  }}
                  title="Double click to Open Overdesk"
                >
                  <svg viewBox="0 0 100 100" className="w-9 h-9 text-white select-none pointer-events-none" stroke="currentColor" fill="none" strokeWidth="6">
                    {/* Outer concentric white ring */}
                    <circle cx="50" cy="50" r="40" />
                    {/* Middle concentric white ring */}
                    <circle cx="50" cy="50" r="22" strokeWidth="5.5" />
                    {/* Small central solid white dot */}
                    <circle cx="50" cy="50" r="7" fill="currentColor" stroke="none" />
                  </svg>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

      {/* Main card interface */}
      <div
        id="card"
        ref={cardRef}
        className={`card-shell cursor-default flex flex-col touch-none select-none ${isLight ? 'light_mode' : ''} ${isMinimized || (isClosed && !isElectron) ? 'hidden' : ''} ${isElectron ? 'relative animate-fade-in' : 'absolute'}`}
        style={{
          left: isElectron ? undefined : `${posX}px`,
          top: isElectron ? undefined : `${posY}px`,
          width: isMobile ? `${Math.min(window.innerWidth - 32, cardWidth)}px` : `${cardWidth}px`,
          maxWidth: '100%',
        }}
        onMouseEnter={activateInteraction}
        onPointerOver={activateInteraction}
        onPointerDown={(e) => {
          activateInteraction();
          if (!isElectron) {
            handlePointerDown(e);
          }
        }}
        onPointerMove={isElectron ? undefined : handlePointerMove}
        onPointerUp={isElectron ? undefined : handlePointerUp}
      >
        {/* Left Side Resize Handle */}
        <div
          id="resize-handle"
          className="resize-handle"
          onPointerDown={handleResizeDown}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeUp}
        />

        {/* Top Control Bar */}
        <div className="top-bar flex items-center justify-between mb-2">
          {/* Left Controls: Theme switcher & Edit Button */}
          <div className="flex items-center gap-2">
            {/* Theme switcher */}
            <button
              className="theme-switch flex items-center w-11 h-6 rounded-full p-0.5 border border-[var(--divider)] relative transition-colors duration-200"
              onClick={toggleTheme}
              title="Toggle theme mode"
            >
              <div
                className="theme-knob w-4.5 h-4.5 bg-white rounded-full flex items-center justify-center transition-transform duration-200"
                style={{ transform: isLight ? 'translateX(18px)' : 'translateX(0)' }}
              >
                {isLight ? (
                  <Moon size={10} className="text-slate-800 animate-fade-in" />
                ) : (
                  <Sun size={10} className="text-slate-700 animate-fade-in" />
                )}
              </div>
            </button>

            {/* Edit Button beside Theme switcher */}
            <button
              id="edit-btn"
              className={`edit-btn flex items-center justify-center w-7 h-7 rounded-full transition-all active:scale-90 ${
                isEditOpen 
                  ? 'bg-violet-600 text-white' 
                  : 'bg-[var(--row-bg)] border border-[var(--divider)] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--row-hover)]'
              }`}
              onClick={toggleEdit}
              title="Edit habits & steps"
            >
              <SlidersHorizontal size={13} />
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action Tools */}
          <div className="flex items-center gap-1.5">
            <button
              className="minimize-btn flex items-center justify-center w-7 h-7 rounded-full bg-[var(--row-bg)] border border-[var(--divider)] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--row-hover)] transition-all active:scale-90"
              onClick={minimizeCard}
              title="Minimize panel"
            >
              <Minus size={14} className="stroke-[2.5]" />
            </button>

            <button
              className="cancel-btn flex items-center justify-center w-7 h-7 rounded-full bg-[var(--row-bg)] border border-[var(--divider)] text-[var(--text-dim)] hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90"
              onClick={closeApp}
              title="Close app"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="progress-wrap flex items-center gap-2 mb-2.5">
          <div className="progress-bar-track flex-1 h-2 rounded-full overflow-hidden bg-[var(--divider)]">
            <div
              id="progress-fill"
              className="progress-bar-fill-animated"
              style={{ width: `${queue.length ? Math.round(((isDone ? queue.length : step) / queue.length) * 100) : 0}%` }}
            />
          </div>
          <span className="progress-label text-[11px] font-bold text-[var(--text-dim)] min-w-8 text-right font-mono tracking-wider">
            {isDone ? queue.length : step}/{queue.length}
          </span>
        </div>

        {/* Custom Timer Sub-Row */}
        {timerVisible && (
          <div 
            id="timer-row" 
            className="timer-row flex items-center justify-between p-1 px-2 mb-2 rounded-xl bg-[var(--row-bg)] border border-[var(--divider)] transition-all"
          >
            <div className="timer-left flex items-center gap-2">
              {isEditingTimer ? (
                <div className="flex items-center gap-1 font-mono text-xs font-semibold select-all bg-[var(--row-bg)] p-0.5 rounded-lg border border-[var(--divider)]">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoFocus
                    value={editHoursStr}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 2) {
                        setEditHoursStr(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTimer();
                      if (e.key === 'Escape') setIsEditingTimer(false);
                    }}
                    className="w-8 bg-transparent text-center text-[11px] font-bold text-[var(--text)] outline-none"
                    placeholder="HH"
                    title="Hours"
                  />
                  <span className="text-[var(--text-dim)]">:</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editMinutesStr}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 2) {
                        setEditMinutesStr(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTimer();
                      if (e.key === 'Escape') setIsEditingTimer(false);
                    }}
                    className="w-8 bg-transparent text-center text-[11px] font-bold text-[var(--text)] outline-none"
                    placeholder="MM"
                    title="Minutes"
                  />
                  <span className="text-[var(--text-dim)]">:</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editSecondsStr}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 2) {
                        setEditSecondsStr(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTimer();
                      if (e.key === 'Escape') setIsEditingTimer(false);
                    }}
                    className="w-8 bg-transparent text-center text-[11px] font-bold text-[var(--text)] outline-none"
                    placeholder="SS"
                    title="Seconds"
                  />
                  <button
                    onClick={handleSaveTimer}
                    className="p-1 text-emerald-500 hover:text-emerald-400 rounded transition-colors"
                    title="Save (Enter)"
                  >
                    <Check size={11} strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => setIsEditingTimer(false)}
                    className="p-1 text-rose-500 hover:text-rose-400 rounded transition-colors"
                    title="Cancel (Esc)"
                  >
                    <X size={11} strokeWidth={3} />
                  </button>
                </div>
              ) : (
                <span
                  id="timer-display"
                  className="timer-display font-mono text-sm font-semibold tracking-wider text-[var(--text)] hover:bg-[var(--row-hover)] cursor-pointer rounded-lg px-2.5 py-0.5 transition-all outline-none border border-transparent hover:border-[var(--divider)]"
                  onClick={handleStartEditTimer}
                  title="Click to edit timer duration"
                >
                  {timerFormat(Math.max(0, timerTarget - timerSeconds))}
                </span>
              )}
              <span id="timer-status" className={`timer-status-dot ${!timerRunning ? 'paused' : (timerTarget - timerSeconds) <= 5 ? 'warn' : ''}`}>
                ●
              </span>

              {voiceOn && (
                <div 
                  id="timer-mic-indicator"
                  className="flex items-center justify-center relative w-4 h-4"
                  title="Offline Assembly Voice input active (Next / Back)"
                >
                  <span className={`absolute inline-flex h-2.5 w-2.5 rounded-full opacity-65 animate-ping transition-colors duration-300 ${
                    voiceActiveTrigger ? 'bg-red-500' : 'bg-orange-500'
                  }`} />
                  <Mic 
                    size={11} 
                    className={`transition-colors duration-300 ${
                      voiceActiveTrigger ? 'text-red-500' : 'text-orange-500'
                    }`}
                    strokeWidth={2.5}
                  />
                </div>
              )}
            </div>
            <div className="timer-right flex items-center gap-1.5">
              <button
                className="timer-action-btn w-6.5 h-6.5 bg-[var(--row-bg)] border border-[var(--divider)] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--row-hover)] rounded-full flex items-center justify-center transition-all active:scale-90"
                onClick={timerTogglePause}
                title={timerRunning ? 'Pause timer' : 'Resume timer'}
              >
                {timerRunning ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
              </button>
              <button
                className="timer-action-btn w-6.5 h-6.5 bg-[var(--row-bg)] border border-[var(--divider)] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--row-hover)] rounded-full flex items-center justify-center transition-all active:scale-90"
                onClick={handleTimerReset}
                title="Reset timer"
              >
                <RotateCcw size={10} />
              </button>
            </div>
          </div>
        )}

        {/* Principal task slides action row */}
        <div className="main-row flex items-center gap-2">
          <button
            id="back-btn"
            disabled={step === 0 && !isDone}
            onClick={() => { playTick(soundOn); handleGoBack(); }}
            className={`back-btn w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              step > 0 || isDone
                ? 'opacity-100 cursor-pointer pointer-events-auto bg-[var(--row-bg)] border border-[var(--divider)] text-[var(--text)] hover:bg-[var(--row-hover)] active:scale-90'
                : 'opacity-20 pointer-events-none text-[var(--text-dim)]'
            }`}
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>

          {/* Interactive Screen stage with Typewriter slider */}
          <div className="stage flex-1 min-w-0 h-11 relative overflow-hidden flex flex-col justify-center">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={isDone ? 'finished-stage' : activeItem ? activeItem.text : 'no-active-stage'}
                initial={{ x: 26, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -26, opacity: 0 }}
                transition={{ duration: 0.28, cubicBezier: [0.4, 0, 0.2, 1] }}
                className="slide absolute left-0 right-0 flex flex-col text-left truncate"
              >
                {isDone ? (
                  <span className="slide-label text-emerald-500 font-semibold tracking-wide flex items-center justify-center gap-1.5 h-full animate-pulse text-xs">
                    <Check size={14} strokeWidth={3} /> Routine completed!
                  </span>
                ) : activeItem ? (
                  <>
                    <span 
                      className="slide-cat-label text-[9px] font-bold uppercase tracking-wider h-[14px]" 
                      style={{ color: activeItem.color }}
                    >
                      {activeItem.cat}
                    </span>
                    <TypewriterText
                      text={activeItem.text}
                      enabled={idleAnim}
                      color={activeItem.color}
                    />
                  </>
                ) : (
                  <span className="slide-label text-[var(--text-dim)] font-medium tracking-wide text-xs">
                    No active steps
                  </span>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            id="next-btn"
            onClick={() => { playTick(soundOn); handleAdvance(); }}
            className={`next-btn w-11 h-11 rounded-full flex items-center justify-center text-white transition-all duration-200 active:scale-90 ${
              isDone ? 'complete bg-emerald-500 hover:bg-emerald-600' : 'bg-violet-600 hover:bg-violet-700'
            }`}
          >
            {isDone ? <Check size={16} strokeWidth={3} /> : <ChevronRight size={16} strokeWidth={2.5} />}
          </button>
        </div>

        {/* Dynamic Slidout Edit menu */}
        <EditPanel
          isOpen={isEditOpen}
          categories={categories}
          onUpdateCategories={(newCats) => {
            setCategories(newCats);
            // rebuild queue and sync
            const nextQueue = [];
            newCats.forEach((cat) => { if (cat.active) cat.tasks.forEach((t) => nextQueue.push({ text: t, cat: cat.label, color: cat.color })); });
            if (step >= nextQueue.length) {
              setStep(Math.max(0, nextQueue.length - 1));
            }
          }}
          soundOn={soundOn}
          onToggleSound={() => setSoundOn(!soundOn)}
          idleAnim={idleAnim}
          onToggleIdleAnim={() => setIdleAnim(!idleAnim)}
          voiceOn={voiceOn}
          onToggleVoice={() => setVoiceOn(!voiceOn)}
          voiceError={voiceError}
          isIframe={isIframe}
          voiceSupported={!!SpeechRecognition}
          timerVisible={timerVisible}
          onToggleTimerVisible={() => setTimerVisible(!timerVisible)}
          accentIdx={accentIdx}
          onSelectAccent={applyAccent}
          onSelectCustomAccent={applyAccentCustom}
          selectedBell={selectedBell}
          onBellSelect={onBellSelect}
          onPreviewBell={playPreviewBell}
          onResetApp={resetApp}
          onOpenAbout={openAbout}
          onOpenColorPicker={(cat, rect) => setColorPickerTarget({ cat, rect })}
        />
      </div>

      {/* Floating temporary popup to select custom Category focus colors */}
      <ColorPickerPopup
        isOpen={!!colorPickerTarget}
        activeColor={colorPickerTarget?.cat.color || ''}
        triggerRect={colorPickerTarget?.rect || null}
        isLight={isLight}
        onSelect={(newCol) => {
          if (!colorPickerTarget) return;
          const next = categories.map((c) => {
            if (c.id === colorPickerTarget.cat.id) {
              return { ...c, color: newCol };
            }
            return c;
          });
          setCategories(next);
        }}
        onClose={() => setColorPickerTarget(null)}
      />

      {/* Exquisite About info overlay modal */}
      <AboutOverlay
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        isLight={isLight}
        updaterMessage={updaterMessage}
        updaterReady={updaterReady}
        isElectron={isElectron}
        onRestartToUpdate={() => {
          if (isElectron && (window as any).electronAPI?.restartToUpdate) {
            (window as any).electronAPI.restartToUpdate();
          }
        }}
      />

      {/* Auto-Updater Popup overlay that triggers automatically when a background release is active or downloaded */}
      {isElectron && (
        <AutoUpdaterPopup
          message={updaterMessage}
          isReady={updaterReady}
          isLight={isLight}
          onRestartToUpdate={() => {
            if (isElectron && (window as any).electronAPI?.restartToUpdate) {
              (window as any).electronAPI.restartToUpdate();
            }
          }}
        />
      )}
    </div>
  );
}
