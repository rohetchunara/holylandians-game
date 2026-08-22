import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Users, Play, Copy, Check, Skull, Vote } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { formatTime } from '../lib/hooks';
import type { TraitorGame as TraitorGameType, TraitorPlayer } from '../lib/types';

interface Props {
  onBack: () => void;
  onScore: (score: number) => void;
}

const TASKS = ['Fix wiring', 'Calibrate engine', 'Scan database', 'Align thrusters', 'Check oxygen', 'Repair hull', 'Download logs', 'Empty trash'];

export default function TraitorGame({ onBack, onScore }: Props) {
  const { user } = useUser();
  const [games, setGames] = useState<TraitorGameType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState<TraitorGameType | null>(null);
  const [players, setPlayers] = useState<TraitorPlayer[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [myTasks, setMyTasks] = useState<string[]>([]);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [voting, setVoting] = useState(false);
  const [voteTarget, setVoteTarget] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const loadGames = async () => {
      const { data } = await supabase.from('traitor_games').select('*').eq('status', 'waiting').order('created_at', { ascending: false });
      if (data) setGames(data as TraitorGameType[]);
      setLoading(false);
    };
    loadGames();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  const handleCreate = async () => {
    if (!user) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error: createError } = await supabase
      .from('traitor_games')
      .insert({ code, host_id: user.id, host_name: user.name, status: 'waiting', phase: 'lobby', round: 0 })
      .select('*')
      .maybeSingle();
    if (createError || !data) { setError('Failed to create game.'); return; }
    const game = data as TraitorGameType;
    await supabase.from('traitor_players').insert({ game_id: game.id, profile_id: user.id, profile_name: user.name, is_alive: true, tasks_completed: 0, total_tasks: 3 });
    setActiveGame(game);
    setJoinCode('');
  };

  const handleJoin = async (game: TraitorGameType) => {
    if (!user) return;
    const { error: joinError } = await supabase.from('traitor_players').insert({ game_id: game.id, profile_id: user.id, profile_name: user.name, is_alive: true, tasks_completed: 0, total_tasks: 3 });
    if (joinError) { setError('Failed to join game.'); return; }
    setActiveGame(game);
  };

  const handleJoinByCode = async () => {
    if (!user || !joinCode.trim()) return;
    const { data } = await supabase.from('traitor_games').select('*').eq('code', joinCode.trim().toUpperCase()).eq('status', 'waiting').maybeSingle();
    if (!data) { setError('Game not found.'); return; }
    handleJoin(data as TraitorGameType);
  };

  useEffect(() => {
    if (!activeGame) return;
    const loadPlayers = async () => {
      const { data } = await supabase.from('traitor_players').select('*').eq('game_id', activeGame.id).order('created_at', { ascending: true });
      if (data) setPlayers(data as TraitorPlayer[]);
    };
    loadPlayers();

    const channel = supabase
      .channel(`traitor_${activeGame.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'traitor_players', filter: `game_id=eq.${activeGame.id}` },
        () => loadPlayers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'traitor_games', filter: `id=eq.${activeGame.id}` },
        (payload) => setActiveGame(payload.new as TraitorGameType))
      .subscribe();
    channelRef.current = channel;

    return () => { supabase.removeChannel(channel); };
  }, [activeGame?.id]);

  useEffect(() => {
    if (activeGame && activeGame.phase === 'tasks') {
      const myPlayer = players.find((p) => p.profile_id === user?.id);
      if (myPlayer && myTasks.length === 0) {
        const shuffled = [...TASKS].sort(() => Math.random() - 0.5).slice(0, myPlayer.total_tasks);
        setMyTasks(shuffled);
      }
    }
  }, [activeGame?.phase, players]);

  const startGame = async () => {
    if (!activeGame || players.length < 2) return;
    const traitorIdx = Math.floor(Math.random() * players.length);
    const traitor = players[traitorIdx];
    await supabase.from('traitor_games').update({ status: 'playing', phase: 'tasks', traitor_id: traitor.profile_id, round: 1 }).eq('id', activeGame.id);
    players.forEach((p, i) => {
      supabase.from('traitor_players').update({ role: i === traitorIdx ? 'traitor' : 'crew', total_tasks: 3 }).eq('id', p.id);
    });
  };

  const completeTask = async (task: string) => {
    if (!user) return;
    setCompletedTasks((prev) => [...prev, task]);
    const myPlayer = players.find((p) => p.profile_id === user.id);
    if (myPlayer) {
      await supabase.from('traitor_players').update({ tasks_completed: myPlayer.tasks_completed + 1 }).eq('id', myPlayer.id);
    }
  };

  const castVote = async (targetId: string) => {
    if (!user) return;
    const myPlayer = players.find((p) => p.profile_id === user.id);
    if (myPlayer) {
      await supabase.from('traitor_players').update({ voted_for: targetId }).eq('id', myPlayer.id);
    }
    setVoteTarget(targetId);
    setTimeout(() => { setVoting(false); setVoteTarget(null); }, 2000);
  };

  if (activeGame) {
    const myPlayer = players.find((p) => p.profile_id === user?.id);
    const isHost = activeGame.host_id === user?.id;
    const isTraitor = myPlayer?.role === 'traitor';
    const alivePlayers = players.filter((p) => p.is_alive);
    const allTasksDone = myPlayer && myPlayer.tasks_completed >= myPlayer.total_tasks;

    return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => { onScore(myPlayer?.tasks_completed ?? 0); onBack(); }} className="p-1.5 rounded-lg text-slate-400 hover:text-cream hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-cream">Game {activeGame.code}</h2>
          <button onClick={() => { setCopied(true); navigator.clipboard?.writeText(activeGame.code); setTimeout(() => setCopied(false), 2000); }}
            className="px-3 py-1.5 rounded-lg glass text-sm flex items-center gap-1">
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            {activeGame.code}
          </button>
        </div>

        {activeGame.phase === 'lobby' && (
          <div className="glass-strong rounded-2xl p-4 space-y-3 animate-fade-in">
            <p className="text-sm text-slate-400 text-center">Waiting for players... ({players.length} joined)</p>
            <div className="space-y-2">
              {players.map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg glass">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-slate-200">{p.profile_name}</span>
                  {p.profile_id === activeGame.host_id && <span className="text-xs text-amber-400">Host</span>}
                </div>
              ))}
            </div>
            {isHost && players.length >= 2 ? (
              <button onClick={startGame} className="btn-primary w-full flex items-center justify-center gap-2">
                <Play className="w-4 h-4" /> Start Game
              </button>
            ) : isHost ? (
              <p className="text-xs text-slate-500 text-center">Need at least 2 players to start</p>
            ) : (
              <p className="text-xs text-slate-500 text-center">Waiting for host to start...</p>
            )}
          </div>
        )}

        {activeGame.phase === 'tasks' && myPlayer && myPlayer.is_alive && (
          <div className="glass-strong rounded-2xl p-4 space-y-3 animate-fade-in">
            {isTraitor && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-center">
                <p className="text-sm font-bold text-rose-400">You are the TRAITOR!</p>
                <p className="text-xs text-rose-300/80 mt-1">Sabotage without getting caught.</p>
              </div>
            )}
            {!isTraitor && (
              <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/30 text-center">
                <p className="text-sm font-bold text-blue-400">You are CREW</p>
                <p className="text-xs text-blue-300/80 mt-1">Complete your tasks to win!</p>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Tasks: {myPlayer.tasks_completed}/{myPlayer.total_tasks}</span>
              <button onClick={() => setVoting(true)} className="btn-ghost px-3 py-1 text-xs flex items-center gap-1">
                <Vote className="w-3.5 h-3.5" /> Vote
              </button>
            </div>
            <div className="space-y-2">
              {myTasks.map((task) => (
                <button key={task} onClick={() => completeTask(task)} disabled={completedTasks.includes(task)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${completedTasks.includes(task) ? 'glass text-slate-500 line-through' : 'glass text-slate-200 hover:bg-slate-800/60'}`}>
                  <span className="flex items-center gap-2">
                    {completedTasks.includes(task) ? <Check className="w-4 h-4 text-green-400" /> : <div className="w-4 h-4 rounded border border-slate-600" />}
                    {task}
                  </span>
                </button>
              ))}
            </div>
            {allTasksDone && <p className="text-xs text-green-400 text-center">All tasks done! Crew wins!</p>}
          </div>
        )}

        {activeGame.phase === 'tasks' && myPlayer && !myPlayer.is_alive && (
          <div className="glass-strong rounded-2xl p-4 text-center animate-fade-in">
            <Skull className="w-12 h-12 text-rose-400 mx-auto mb-3" />
            <p className="text-sm text-slate-400">You were eliminated. Spectating...</p>
          </div>
        )}

        {voting && (
          <div className="glass-strong rounded-2xl p-4 space-y-3 animate-slide-up">
            <h3 className="text-sm font-bold text-cream">Vote to eject</h3>
            {alivePlayers.filter((p) => p.profile_id !== user?.id).map((p) => (
              <button key={p.id} onClick={() => castVote(p.profile_id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${voteTarget === p.profile_id ? 'nav-gradient text-cream' : 'glass text-slate-200 hover:bg-slate-800/60'}`}>
                {p.profile_name}
              </button>
            ))}
            {voteTarget && <p className="text-xs text-green-400 text-center">Vote cast!</p>}
          </div>
        )}

        <div className="glass rounded-2xl p-3">
          <p className="text-xs text-slate-500 mb-2">Players ({players.length})</p>
          <div className="space-y-1">
            {players.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${p.is_alive ? 'bg-green-400' : 'bg-rose-400'}`} />
                <span className={p.is_alive ? 'text-slate-300' : 'text-slate-600 line-through'}>{p.profile_name}</span>
                <span className="text-slate-600">({p.tasks_completed}/{p.total_tasks} tasks)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-1.5 rounded-lg text-slate-400 hover:text-cream hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-cream">Traitor Game</h2>
        <div className="w-7" />
      </div>

      <div className="glass-strong rounded-2xl p-4 space-y-3 animate-fade-in">
        <button onClick={handleCreate} className="btn-primary w-full flex items-center justify-center gap-2">
          <Play className="w-4 h-4" /> Create New Game
        </button>
        <div className="flex gap-2">
          <input type="text" value={joinCode} onChange={(e) => { setJoinCode(e.target.value); setError(''); }} placeholder="Game code" className="input-field flex-1 uppercase" maxLength={6} />
          <button onClick={handleJoinByCode} className="btn-ghost px-4">Join</button>
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>

      <div className="glass-strong rounded-2xl p-4">
        <h3 className="text-sm font-bold text-slate-300 mb-3">Open Games</h3>
        {loading ? (
          <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : games.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-4">No open games. Create one!</p>
        ) : (
          <div className="space-y-2">
            {games.map((g) => (
              <button key={g.id} onClick={() => handleJoin(g)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl glass hover:bg-slate-800/60 transition-colors">
                <div>
                  <p className="text-sm text-cream font-medium">{g.code}</p>
                  <p className="text-xs text-slate-500">Host: {g.host_name} · {formatTime(g.created_at)}</p>
                </div>
                <span className="text-xs text-blue-400">Join →</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
