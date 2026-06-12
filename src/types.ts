export interface Category {
  id: string;
  label: string;
  color: string;
  active: boolean;
  tasks: string[];
}

export interface AccentPreset {
  hex: string;
  rgba: string;
  glow: string;
  glowf: string;
}

export interface BellSound {
  label: string;
  key: string;
}

export interface AppState {
  categories: Category[];
  step: number;
  isDone: boolean;
  isLight: boolean;
  idleAnim: boolean;
  soundOn: boolean;
  voiceOn: boolean;
  accentIdx: number;
  selectedBell: string;
  timerTarget: number;
  timerVisible: boolean;
}
