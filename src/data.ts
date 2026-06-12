import { Category, AccentPreset, BellSound } from './types';

export const BELL_SOUNDS: BellSound[] = [
  { label: 'No Sound', key: 'none' },
  { label: 'School Bell', key: 'school_bell' },
  { label: 'Pokemon Heal', key: 'pokemon_colo_heal' },
  { label: 'Princess Bell', key: 'princess_bell' },
];

export const ACCENT_PRESETS: AccentPreset[] = [
  { hex: '#6e00d2', rgba: 'rgba(110,0,210,0.9)',  glow: 'rgba(130,0,255,0.8)',  glowf: 'rgba(130,0,255,0.22)' },
  { hex: '#0a84ff', rgba: 'rgba(10,132,255,0.9)', glow: 'rgba(10,132,255,0.8)', glowf: 'rgba(10,132,255,0.22)' },
  { hex: '#30d158', rgba: 'rgba(48,209,88,0.9)',  glow: 'rgba(48,209,88,0.8)',  glowf: 'rgba(48,209,88,0.22)' },
  { hex: '#ff453a', rgba: 'rgba(255,69,58,0.9)',  glow: 'rgba(255,69,58,0.8)',  glowf: 'rgba(255,69,58,0.22)' },
  { hex: '#ff9f0a', rgba: 'rgba(255,159,10,0.9)', glow: 'rgba(255,159,10,0.8)', glowf: 'rgba(255,159,10,0.22)' },
  { hex: '#ff375f', rgba: 'rgba(255,55,95,0.9)',  glow: 'rgba(255,55,95,0.8)',  glowf: 'rgba(255,55,95,0.22)' },
  { hex: '#5ac8fa', rgba: 'rgba(90,200,250,0.9)', glow: 'rgba(90,200,250,0.8)', glowf: 'rgba(90,200,250,0.22)' },
  { hex: '#bf5af2', rgba: 'rgba(191,90,242,0.9)', glow: 'rgba(191,90,242,0.8)', glowf: 'rgba(191,90,242,0.22)' },
];

export const CAT_COLORS: string[] = [
  'rgba(255,160,50,0.9)',
  'rgba(130,0,255,0.9)',
  'rgba(220,50,80,0.9)',
  'rgba(0,170,220,0.9)',
  'rgba(50,195,110,0.9)',
  'rgba(255,80,180,0.9)',
  'rgba(255,210,0,0.9)',
  'rgba(0,200,180,0.9)',
];

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'premarket',
    label: 'Pre-Market',
    color: 'rgba(255,160,50,0.9)',
    active: true,
    tasks: ['Review overnight news', 'Review economic calendar', 'Mark key S/R levels', 'Set entry alerts'],
  },
  {
    id: 'analysis',
    label: 'Analysis',
    color: 'rgba(130,0,255,0.9)',
    active: true,
    tasks: ['1H candlestick review', '4H structure check', 'Confirm daily bias', 'Check weekly trend'],
  },
  {
    id: 'risk',
    label: 'Risk',
    color: 'rgba(220,50,80,0.9)',
    active: false,
    tasks: ['Define risk per trade', 'Set daily loss limit', 'Check margin level', 'Review open P&L'],
  },
  {
    id: 'session',
    label: 'Session',
    color: 'rgba(0,170,220,0.9)',
    active: false,
    tasks: ['Enable Do Not Disturb', 'Close social media', 'Open trade journal', 'Start focus timer'],
  },
  {
    id: 'review',
    label: 'Review',
    color: 'rgba(50,195,110,0.9)',
    active: false,
    tasks: ["Log today's trades", 'Calculate net P&L', 'Note key mistakes', 'Rate your trading discipline'],
  },
];
