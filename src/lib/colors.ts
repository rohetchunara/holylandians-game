export interface ColorTheme {
  id: string;
  name: string;
  from: string;
  to: string;
  solid: string;
  text: string;
}

export const COLOR_THEMES: ColorTheme[] = [
  { id: 'blue', name: 'Royal Blue', from: '#3B82F6', to: '#60A5FA', solid: '#3B82F6', text: 'text-blue-400' },
  { id: 'cyan', name: 'Arctic Cyan', from: '#06B6D4', to: '#22D3EE', solid: '#06B6D4', text: 'text-cyan-400' },
  { id: 'emerald', name: 'Emerald', from: '#10B981', to: '#34D399', solid: '#10B981', text: 'text-emerald-400' },
  { id: 'amber', name: 'Amber Gold', from: '#F59E0B', to: '#FBBF24', solid: '#F59E0B', text: 'text-amber-400' },
  { id: 'rose', name: 'Rose', from: '#F43F5E', to: '#FB7185', solid: '#F43F5E', text: 'text-rose-400' },
  { id: 'violet', name: 'Twilight', from: '#8B5CF6', to: '#A78BFA', solid: '#8B5CF6', text: 'text-violet-400' },
];

export function getTheme(id: string): ColorTheme {
  return COLOR_THEMES.find((t) => t.id === id) ?? COLOR_THEMES[0];
}
