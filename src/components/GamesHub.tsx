import { useState } from 'react';
import { ArrowLeft, Plane, Users, ShieldAlert } from 'lucide-react';
import SkyBattle from './SkyBattle';
import TraitorGame from './TraitorGame';
import HolylandWarfare from './HolylandWarfare';

type GameView = 'hub' | 'skybattle' | 'traitor' | 'warfare';

export default function GamesHub() {
  const [selected, setSelected] = useState<GameView>('hub');

  if (selected === 'skybattle') {
    return (
      <div>
        <div className="px-4 sm:px-6 lg:px-8 pt-4">
          <button onClick={() => setSelected('hub')} className="btn-ghost inline-flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> Arcade
          </button>
        </div>
        <SkyBattle />
      </div>
    );
  }

  if (selected === 'traitor') {
    return (
      <div>
        <div className="px-4 sm:px-6 lg:px-8 pt-4">
          <button onClick={() => setSelected('hub')} className="btn-ghost inline-flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> Arcade
          </button>
        </div>
        <TraitorGame />
      </div>
    );
  }

  if (selected === 'warfare') {
    return (
      <div>
        <div className="px-4 sm:px-6 lg:px-8 pt-4">
          <button onClick={() => setSelected('hub')} className="btn-ghost inline-flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> Arcade
          </button>
        </div>
        <HolylandWarfare />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl nav-gradient flex items-center justify-center">
          <Plane className="w-5 h-5 text-cream" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-cream">Arcade</h2>
          <p className="text-xs text-slate-500">Multiplayer games for lounge members</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Sky Battle */}
        <button
          onClick={() => setSelected('skybattle')}
          className="group glass-strong rounded-3xl p-6 text-left relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-blue-500/40 animate-slide-up"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-500/20 blur-3xl group-hover:bg-blue-500/30 transition-colors" />
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl nav-gradient flex items-center justify-center mb-4">
              <Plane className="w-7 h-7 text-cream" />
            </div>
            <h3 className="text-xl font-bold text-cream mb-1">Sky Battle</h3>
            <p className="text-sm text-slate-400 mb-4">Infinite Dogfight</p>
            <p className="text-sm text-slate-500 mb-4">
              Pilot a custom plane in an endless scrolling sky. Dodge enemy fire and blast opponents.
              First to 5 hits is eliminated. Real-time multiplayer with live scoreboard.
            </p>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs">
                <Users className="w-3 h-3" /> Multiplayer
              </span>
            </div>
            <div className="flex items-center gap-2 text-blue-400 text-sm font-medium group-hover:gap-3 transition-all">
              Launch Game
            </div>
          </div>
        </button>

        {/* The Traitor */}
        <button
          onClick={() => setSelected('traitor')}
          className="group glass-strong rounded-3xl p-6 text-left relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-rose-500/40 animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-rose-500/20 blur-3xl group-hover:bg-rose-500/30 transition-colors" />
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-cream" />
            </div>
            <h3 className="text-xl font-bold text-cream mb-1">The Traitor</h3>
            <p className="text-sm text-slate-400 mb-4">Social Deduction</p>
            <p className="text-sm text-slate-500 mb-4">
              Secret roles are assigned. Complete tasks as crew, or sabotage as the traitor.
              Debate who's suspicious, then vote them out before it's too late.
            </p>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs">
                <Users className="w-3 h-3" /> 3-8 Players
              </span>
            </div>
            <div className="flex items-center gap-2 text-rose-400 text-sm font-medium group-hover:gap-3 transition-all">
              Enter Game
            </div>
          </div>
        </button>

        {/* Holyland Warfare (NEW) */}
        <button
          onClick={() => setSelected('warfare')}
          className="group glass-strong rounded-3xl p-6 text-left relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-amber-500/40 animate-slide-up"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-500/20 blur-3xl group-hover:bg-amber-500/30 transition-colors" />
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center mb-4">
              <ShieldAlert className="w-7 h-7 text-cream" />
            </div>
            <h3 className="text-xl font-bold text-cream mb-1">Holyland Warfare</h3>
            <p className="text-sm text-slate-400 mb-4">Tactical Arena Shooter</p>
            <p className="text-sm text-slate-500 mb-4">
              Battlefield-style squad skirmish. Move with WASD, aim with mouse or touch, survive enemy waves, and rack up high scores.
            </p>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs">
                <Users className="w-3 h-3" /> Action
              </span>
            </div>
            <div className="flex items-center gap-2 text-amber-400 text-sm font-medium group-hover:gap-3 transition-all">
              Deploy Now
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
