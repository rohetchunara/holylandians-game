import { useState, useEffect, type ReactNode } from 'react';
import { MessageCircle, Image, User, Gift, Shield, Gamepad2, LogOut, Menu, X, Users, Globe, ShoppingBag, Brain, Send } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { getTheme } from '../lib/colors';

export type Tab = 'chat' | 'vault' | 'profile' | 'rewards' | 'admin' | 'games' | 'groups' | 'feed' | 'marketplace' | 'messages' | 'quizzes';

interface NavItem {
  id: Tab;
  label: string;
  icon: typeof MessageCircle;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'chat', label: 'Chat Room', icon: MessageCircle },
  { id: 'feed', label: 'Feed', icon: Globe },
  { id: 'groups', label: 'Groups', icon: Users },
  { id: 'messages', label: 'Messages', icon: Send },
  { id: 'vault', label: 'Media Vault', icon: Image },
  { id: 'marketplace', label: 'Market', icon: ShoppingBag },
  { id: 'quizzes', label: 'Quizzes', icon: Brain },
  { id: 'games', label: 'Arcade', icon: Gamepad2 },
  { id: 'rewards', label: 'Rewards', icon: Gift },
  { id: 'profile', label: 'Profile', icon: User },
];

// tabs shown in the mobile bottom nav (max 5)
const MOBILE_BOTTOM_TABS: Tab[] = ['chat', 'feed', 'groups', 'marketplace', 'profile'];

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onAdminTrigger: () => void;
  children: ReactNode;
}

export default function Layout({ activeTab, onTabChange, onAdminTrigger, children }: Props) {
  const { user, signOut } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shiftBuffer, setShiftBuffer] = useState('');
  const theme = getTheme(user?.color_theme ?? 'blue');

  // Shift + "rohit" secret trigger
  useEffect(() => {
    let buffer = '';
    let shiftHeld = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftHeld = true;
        return;
      }
      if (shiftHeld && e.key.length === 1) {
        buffer += e.key.toLowerCase();
        if (buffer.length > 10) buffer = buffer.slice(-10);
        if (buffer.includes('rohit')) {
          onAdminTrigger();
          buffer = '';
          shiftHeld = false;
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftHeld = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onAdminTrigger]);

  const items = user?.is_admin
    ? [...NAV_ITEMS, { id: 'admin' as Tab, label: 'Admin', icon: Shield }]
    : NAV_ITEMS;

  const handleNav = (tab: Tab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  const handleProfileShiftClick = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      e.preventDefault();
      onAdminTrigger();
    }
  };

  return (
    <div className="min-h-screen bg-royal-gradient flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 glass-strong border-r border-blue-500/20 fixed h-screen z-30">
        <div className="p-6 border-b border-blue-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl nav-gradient flex items-center justify-center glow-blue">
              <Gamepad2 className="w-6 h-6 text-cream" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-cream tracking-tight text-glow">HOLYLANDIANS</h1>
              <p className="text-xs text-slate-500">Members Lounge</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  active
                    ? 'nav-gradient text-cream shadow-lg glow-blue'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-cream'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-500/10">
          <button
            onClick={handleProfileShiftClick}
            className="w-full flex items-center gap-3 mb-3 px-2 group"
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-cream"
                style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
              >
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-cream truncate group-hover:text-blue-400 transition-colors">{user?.name}</p>
              <p className="text-xs text-amber-400">{user?.points ?? 0} pts</p>
            </div>
          </button>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 glass-strong border-b border-blue-500/20">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg nav-gradient flex items-center justify-center glow-blue">
              <Gamepad2 className="w-5 h-5 text-cream" />
            </div>
            <span className="font-bold text-cream tracking-tight text-glow">HOLYLANDIANS</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-300 hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 glass-strong border-b border-blue-500/20 p-4 space-y-1 max-h-[70vh] overflow-y-auto animate-fade-in">
            {items.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    active ? 'nav-gradient text-cream' : 'text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
            <button
              onClick={handleProfileShiftClick}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/60"
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-cream text-sm"
                  style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}>
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-cream">{user?.name} ({user?.points ?? 0} pts)</span>
            </button>
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 glass-strong border-t border-blue-500/20">
        <div className="flex items-center justify-around px-1 py-2">
          {MOBILE_BOTTOM_TABS.map((tabId) => {
            const item = NAV_ITEMS.find((n) => n.id === tabId)!;
            const Icon = item.icon;
            const active = activeTab === tabId;
            return (
              <button
                key={tabId}
                onClick={() => handleNav(tabId)}
                className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-colors ${
                  active ? 'text-blue-400' : 'text-slate-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
