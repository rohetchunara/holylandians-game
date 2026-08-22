export interface ColorTheme {
  id: string;
  name: string;
  from: string;
  to: string;
}

export const COLOR_THEMES: ColorTheme[] = [
  { id: 'blue', name: 'Ocean Blue', from: '#1e3a5f', to: '#2a4a7a' },
  { id: 'emerald', name: 'Emerald', from: '#0f5132', to: '#198754' },
  { id: 'rose', name: 'Rose Gold', from: '#7a2e3a', to: '#b5485a' },
  { id: 'amber', name: 'Amber', from: '#7a5c1e', to: '#b5892e' },
  { id: 'cyan', name: 'Cyan', from: '#0e4f5f', to: '#1e7a8a' },
  { id: 'slate', name: 'Slate', from: '#2a3340', to: '#3e4a5a' },
];

export function getTheme(id: string): ColorTheme {
  return COLOR_THEMES.find((t) => t.id === id) ?? COLOR_THEMES[0];
}
