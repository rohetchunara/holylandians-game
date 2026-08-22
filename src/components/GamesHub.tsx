import { useState, useEffect } from 'react';
import { Gamepad2, Trophy, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { formatTime } from '../lib/hooks';
import type { GameScore } from '../lib/types';
import SkyBattle from './SkyBattle';
import TraitorGame from './TraitorGame';
import HolylandWarfare from './HolylandWarfare';

type GameId = 'skybattle' | 'traitor' | 'warfare' | null;

export default function GamesHub() {
  const { user } = useUser();
  const [activeGame, setActiveGame] = useState<GameId>(null);
  const [scores, setScores] = useState<GameScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadScores = async () => {
      const { data } = await supabase.from('game_scores').select('*').order('score', { ascending: false }).limit(20);
      if (data) setScores(data as GameScore[]);
      setLoading(false);
    };
    loadScores();
  }, []);

  const submitScore = async (game: string, score: number) => {
    if (!user) return;
    await supabase.from('game_scores').insert({ profile_id: user.id, profile_name: user.name, game, score });
    const { data } = await supabase.from('game_scores').select('*').order('score', { ascending: false }).limit(20);
    if (data) setScores(data as GameScore[]);
  };

  if (activeGame === 'skybattle') return <SkyBattle onBack={() => setActiveGame(null)} onScore={(s) => submitScore('Sky Battle', s)} />;
  if (activeGame === 'traitor') return <TraitorGame onBack={() => setActiveGame(null)} onScore={(s) => submitScore('Traitor Game', s)} />;
  if (activeGame === 'warfare') return <HolylandWarfare onBack={() => setActiveGame(null)} onScore={(s) => submitScore('Holyland Warfare', s)} />;

  const games = [
    { id: 'skybattle' as const, name: 'Sky Battle', desc: 'Pilot your ship, dodge asteroids, shoot enemies', icon: '✈️', color: 'from-blue-600 to-cyan-600' },
    { id: 'traitor' as const, name: 'Traitor Game', desc: 'Social deduction — find the traitor among you', icon: '🕵️', color: 'from-rose-600 to-amber-600' },
    { id: 'warfare' as const, name: 'Holyland Warfare', desc: 'Strategic turn-based combat', icon: '⚔️', color: 'from-amber-600 to-orange-600' },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Gamepad2 className="w-6 h-6 text-blue-400" />
        <h2 className="text-xl font-bold text-cream">Arcade</h2>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {games.map((game) => (
          <button key={game.id} onClick={() => setActiveGame(game.id)}
            className="glass-strong rounded-2xl p-5 flex items-center gap-4 hover:bg-slate-800/60 transition-all duration-200 hover:scale-[1.02] animate-fade-in text-left">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center text-2xl shrink-0`}>
              {game.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-cream">{game.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{game.desc}</p>
            </div>
            <Play className="w-5 h-5 text-blue-400 shrink-0" />
          </button>
        ))}
      </div>

      <div className="glass-strong rounded-2xl p-4">
        <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" /> Leaderboard
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : scores.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-8">No scores yet. Play a game!</p>
        ) : (
          <div className="space-y-2">
            {scores.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg glass animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-700' : 'text-slate-500'}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <span className="text-sm text-slate-200">{s.profile_name}</span>
                  <span className="text-xs text-slate-500">{s.game}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-amber-400">{s.score}</span>
                  <span className="text-xs text-slate-600">{formatTime(s.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
