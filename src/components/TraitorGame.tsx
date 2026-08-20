import { useEffect, useState } from 'react';
import { Users, Copy, Check, Play, Skull, Vote, Target, CheckCircle2, AlertTriangle, Crown, ArrowLeft, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import type { TraitorGame, TraitorPlayer } from '../lib/types';

type View = 'lobby' | 'waiting' | 'role' | 'tasks' | 'discussion' | 'voting' | 'result';

const TASKS = [
  'Calibrate the navigation system',
  'Refuel the engines',
  'Check the radio signals',
  'Repair the hull breach',
  'Scan for nearby ships',
  'Decode the secret message',
  'Steady the steering wheel',
  'Inspect the cargo hold',
];

function genCode(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

export default function TraitorGame() {
  const { user } = useUser();
  const [view, setView] = useState<View>('lobby');
  const [game, setGame] = useState<TraitorGame | null>(null);
  const [players, setPlayers] = useState<TraitorPlayer[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [myRole, setMyRole] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [taskProgress, setTaskProgress] = useState(0);
  const [voteTarget, setVoteTarget] = useState<string | null>(null);
  const [voteResult, setVoteResult] = useState<string | null>(null);
  const [myTasks, setMyTasks] = useState<string[]>([]);
  const [roleRevealed, setRoleRevealed] = useState(false);

  // subscribe to game updates
  useEffect(() => {
    if (!game) return;

    const channel = supabase
      .channel(`traitor-${game.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'traitor_games', filter: `id=eq.${game.id}` },
        (payload) => {
          if (payload.new) setGame(payload.new as TraitorGame);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'traitor_players', filter: `game_id=eq.${game.id}` },
        () => loadPlayers(game.id)
      )
      .subscribe();

    loadPlayers(game.id);

    return () => { supabase.removeChannel(channel); };
  }, [game?.id]);

  // update view based on game phase
  useEffect(() => {
    if (!game || !user) return;
    const me = players.find((p) => p.profile_id === user.id);
    if (!me) return;

    if (game.status === 'waiting') {
      setView('waiting');
    } else if (game.status === 'playing') {
      setMyRole(me.role);
      if (!roleRevealed) {
        setView('role');
      } else if (game.phase === 'tasks') setView('tasks');
      else if (game.phase === 'discussion') setView('discussion');
      else if (game.phase === 'voting') setView('voting');
      else if (game.phase === 'result') {
        setVoteResult(game.traitor_id);
        setView('result');
      }
    } else if (game.status === 'finished') {
      setVoteResult(game.traitor_id);
      setView('result');
    }
  }, [game?.phase, game?.status, players, user, roleRevealed]);

  const loadPlayers = async (gameId: string) => {
    const { data } = await supabase.from('traitor_players').select('*').eq('game_id', gameId);
    if (data) setPlayers(data as TraitorPlayer[]);
  };

  const handleCreate = async () => {
    if (!user) return;
    setError('');
    const code = genCode();
    const { data, error: err } = await supabase
      .from('traitor_games')
      .insert({
        code,
        host_id: user.id,
        host_name: user.name,
        status: 'waiting',
        phase: 'lobby',
      })
      .select('*')
      .maybeSingle();

    if (err || !data) {
      setError('Could not create game.');
      return;
    }

    const g = data as TraitorGame;
    const { error: pErr } = await supabase.from('traitor_players').insert({
      game_id: g.id,
      profile_id: user.id,
      profile_name: user.name,
    });

    if (pErr) {
      setError('Could not join game.');
      return;
    }

    setGame(g);
    setView('waiting');
  };

  const handleJoin = async () => {
    if (!user || !joinCode.trim()) return;
    setError('');
    const code = joinCode.trim().toUpperCase();

    const { data: g, error: gErr } = await supabase
      .from('traitor_games')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (gErr || !g) {
      setError('Game not found. Check the code.');
      return;
    }

    const gameData = g as TraitorGame;
    if (gameData.status !== 'waiting') {
      setError('Game already started.');
      return;
    }

    // check if already in
    const { data: existing } = await supabase
      .from('traitor_players')
      .select('id')
      .eq('game_id', gameData.id)
      .eq('profile_id', user.id)
      .maybeSingle();

    if (!existing) {
      const { error: pErr } = await supabase.from('traitor_players').insert({
        game_id: gameData.id,
        profile_id: user.id,
        profile_name: user.name,
      });
      if (pErr) {
        setError('Could not join game.');
        return;
      }
    }

    setGame(gameData);
    setView('waiting');
  };

  const handleStart = async () => {
    if (!game || !user) return;
    if (players.length < 3) {
      setError('Need at least 3 players to start.');
      return;
    }

    // assign roles
    const traitorIdx = Math.floor(Math.random() * players.length);
    const traitorPlayer = players[traitorIdx];
    const updates = players.map((p, i) => ({
      id: p.id,
      role: i === traitorIdx ? 'traitor' : 'crewmate',
      total_tasks: 3,
    }));

    for (const u of updates) {
      await supabase.from('traitor_players').update({ role: u.role, total_tasks: u.total_tasks }).eq('id', u.id);
    }

    await supabase.from('traitor_games').update({
      status: 'playing',
      phase: 'tasks',
      traitor_id: traitorPlayer.profile_id,
    }).eq('id', game.id);

    // set my tasks
    const shuffled = [...TASKS].sort(() => Math.random() - 0.5).slice(0, 3);
    setMyTasks(shuffled);
    setTaskProgress(0);
  };

  const handleCompleteTask = async (taskIdx: number) => {
    if (!game || !user) return;
    const me = players.find((p) => p.profile_id === user.id);
    if (!me) return;

    const newCompleted = me.tasks_completed + 1;
    await supabase.from('traitor_players').update({ tasks_completed: newCompleted }).eq('id', me.id);
    setTaskProgress(newCompleted);

    // mark task as done in local list
    const updated = [...myTasks];
    updated[taskIdx] = updated[taskIdx] + ' ✓';
    setMyTasks(updated);

    // check if crew wins (all crew tasks done)
    const crew = players.filter((p) => p.role !== 'traitor');
    const allCrewDone = crew.every((c) => c.tasks_completed + (c.profile_id === user.id ? 1 : 0) >= c.total_tasks);
    if (allCrewDone && crew.length > 0) {
      await supabase.from('traitor_games').update({ status: 'finished', phase: 'result' }).eq('id', game.id);
    }
  };

  const handleMoveToDiscussion = async () => {
    if (!game) return;
    await supabase.from('traitor_games').update({ phase: 'discussion' }).eq('id', game.id);
  };

  const handleMoveToVoting = async () => {
    if (!game) return;
    await supabase.from('traitor_games').update({ phase: 'voting' }).eq('id', game.id);
  };

  const handleVote = async () => {
    if (!game || !user || !voteTarget) return;
    const me = players.find((p) => p.profile_id === user.id);
    if (!me) return;

    await supabase.from('traitor_players').update({ voted_for: voteTarget }).eq('id', me.id);

    // count votes
    const { data: updated } = await supabase.from('traitor_players').select('*').eq('game_id', game.id);
    if (!updated) return;
    const allPlayers = updated as TraitorPlayer[];

    const voteCount: Record<string, number> = {};
    allPlayers.forEach((p) => {
      if (p.voted_for) voteCount[p.voted_for] = (voteCount[p.voted_for] || 0) + 1;
    });

    const maxVotes = Math.max(...Object.values(voteCount), 0);
    const ejected = Object.entries(voteCount).find(([, v]) => v === maxVotes)?.[0] ?? null;

    if (ejected) {
      const ejectedPlayer = allPlayers.find((p) => p.profile_id === ejected);
      if (ejectedPlayer) {
        await supabase.from('traitor_players').update({ is_alive: false }).eq('id', ejectedPlayer.id);

        if (ejected === game.traitor_id) {
          // crew wins
          await supabase.from('traitor_games').update({ status: 'finished', phase: 'result' }).eq('id', game.id);
          // award points to surviving crew
          const { data: crewProfiles } = await supabase
            .from('profiles')
            .select('id, points')
            .in('id', allPlayers.filter((p) => p.role !== 'traitor' && p.is_alive).map((p) => p.profile_id));
          if (crewProfiles) {
            for (const cp of crewProfiles) {
              await supabase.from('profiles').update({ points: (cp.points ?? 0) + 50 }).eq('id', cp.id);
            }
          }
        } else {
          // check if traitor wins (crew <= 1 alive)
          const aliveCrew = allPlayers.filter((p) => p.role !== 'traitor' && p.is_alive && p.profile_id !== ejected).length;
          if (aliveCrew <= 1) {
            await supabase.from('traitor_games').update({ status: 'finished', phase: 'result' }).eq('id', game.id);
          } else {
            // continue - back to tasks
            await supabase.from('traitor_games').update({ phase: 'tasks', round: game.round + 1 }).eq('id', game.id);
            await supabase.from('traitor_players').update({ voted_for: null }).eq('game_id', game.id);
            setVoteTarget(null);
          }
        }
      }
    } else {
      // skip - back to tasks
      await supabase.from('traitor_games').update({ phase: 'tasks', round: game.round + 1 }).eq('id', game.id);
      await supabase.from('traitor_players').update({ voted_for: null }).eq('game_id', game.id);
      setVoteTarget(null);
    }
  };

  const handleLeave = async () => {
    if (game && user) {
      await supabase.from('traitor_players').delete().eq('game_id', game.id).eq('profile_id', user.id);
      // if no players left, delete game
      const { data } = await supabase.from('traitor_players').select('id').eq('game_id', game.id);
      if (!data || data.length === 0) {
        await supabase.from('traitor_games').delete().eq('id', game.id);
      }
    }
    setGame(null);
    setPlayers([]);
    setView('lobby');
    setError('');
    setMyRole(null);
    setRoleRevealed(false);
    setVoteTarget(null);
    setVoteResult(null);
  };

  const copyCode = () => {
    if (game) {
      navigator.clipboard.writeText(game.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ===== LOBBY =====
  if (view === 'lobby') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="glass-strong rounded-3xl p-8 text-center relative overflow-hidden animate-slide-up">
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-rose-500/20 blur-3xl" />
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-cream" />
            </div>
            <h2 className="text-3xl font-bold text-cream mb-2">The Traitor</h2>
            <p className="text-slate-400 mb-8">A social deduction game. Find the traitor before it's too late.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={handleCreate} className="btn-primary flex items-center justify-center gap-2 py-4">
                <Crown className="w-5 h-5" /> Create Game
              </button>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  placeholder="CODE"
                  maxLength={4}
                  className="input-field text-center text-lg tracking-widest font-bold uppercase"
                />
                <button onClick={handleJoin} className="btn-primary px-4">
                  Join
                </button>
              </div>
            </div>

            {error && (
              <p className="text-rose-400 text-sm mt-4 flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {error}
              </p>
            )}

            <div className="glass rounded-2xl p-5 mt-8 text-left space-y-3">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-300"><span className="text-cream font-medium">Crewmates</span> — Complete your tasks and vote out the traitor.</p>
              </div>
              <div className="flex items-start gap-3">
                <Skull className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-300"><span className="text-cream font-medium">Traitor</span> — Sabotage the crew and avoid getting voted out.</p>
              </div>
              <div className="flex items-start gap-3">
                <Vote className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-300"><span className="text-cream font-medium">Voting</span> — Discuss who's suspicious, then vote to eject someone.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== WAITING ROOM =====
  if (view === 'waiting') {
    const isHost = game?.host_id === user?.id;
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="glass-strong rounded-3xl p-8 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <button onClick={handleLeave} className="btn-ghost flex items-center gap-2 text-sm">
              <ArrowLeft className="w-4 h-4" /> Leave
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Room Code:</span>
              <button onClick={copyCode} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
                <span className="text-xl font-bold text-cream tracking-widest">{game?.code}</span>
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-blue-400" />}
              </button>
            </div>
          </div>

          <h3 className="text-lg font-bold text-cream mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" /> Players ({players.length})
          </h3>

          <div className="space-y-2 mb-6">
            {players.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/40">
                <div className="w-9 h-9 rounded-lg nav-gradient flex items-center justify-center text-sm font-bold text-cream">
                  {p.profile_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-cream text-sm font-medium">{p.profile_name}</span>
                {p.profile_id === game?.host_id && (
                  <Crown className="w-4 h-4 text-amber-400 ml-auto" />
                )}
              </div>
            ))}
          </div>

          {error && (
            <p className="text-rose-400 text-sm mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </p>
          )}

          {isHost ? (
            <button onClick={handleStart} disabled={players.length < 3} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              <Play className="w-5 h-5" /> {players.length < 3 ? `Need ${3 - players.length} more players` : 'Start Game'}
            </button>
          ) : (
            <div className="text-center text-slate-500 text-sm py-3">
              Waiting for host to start the game...
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== ROLE REVEAL =====
  if (view === 'role' && myRole) {
    const isTraitor = myRole === 'traitor';
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <div className={`glass-strong rounded-3xl p-8 text-center animate-pop ${isTraitor ? 'border-rose-500/40' : 'border-blue-500/40'}`}>
          <div className={`w-24 h-24 rounded-2xl mx-auto mb-6 flex items-center justify-center ${isTraitor ? 'bg-rose-500/20' : 'bg-blue-500/20'}`}>
            {isTraitor ? <Skull className="w-12 h-12 text-rose-400" /> : <Target className="w-12 h-12 text-blue-400" />}
          </div>
          <h2 className="text-3xl font-bold text-cream mb-2">You are the {isTraitor ? 'TRAITOR' : 'CREWMATE'}</h2>
          <p className="text-slate-400 mb-6">
            {isTraitor
              ? 'Sabotage the crew. Don\'t get caught. Eliminate them one by one.'
              : 'Complete your tasks. Find the traitor. Vote them out.'}
          </p>
          <button
            onClick={() => setRoleRevealed(true)}
            className="btn-primary inline-flex items-center gap-2 px-8 py-3"
          >
            <Play className="w-5 h-5" /> Begin Mission
          </button>
        </div>
      </div>
    );
  }

  // ===== TASKS PHASE =====
  if (view === 'tasks') {
    const me = players.find((p) => p.profile_id === user?.id);
    const isTraitor = me?.role === 'traitor';
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="glass-strong rounded-3xl p-6 sm:p-8 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-cream">Round {game?.round}</h2>
              <p className="text-xs text-slate-500">Task Phase</p>
            </div>
            <div className={`px-3 py-1.5 rounded-xl text-sm font-medium ${isTraitor ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'}`}>
              {isTraitor ? 'You are the Traitor' : 'You are a Crewmate'}
            </div>
          </div>

          {/* task progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Crew Task Progress</span>
              <span className="text-sm text-cream font-medium">
                {players.filter((p) => p.role !== 'traitor').reduce((sum, p) => sum + p.tasks_completed, 0)} /{' '}
                {players.filter((p) => p.role !== 'traitor').reduce((sum, p) => sum + p.total_tasks, 0)}
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full nav-gradient transition-all duration-500"
                style={{
                  width: `${(players.filter((p) => p.role !== 'traitor').reduce((s, p) => s + p.tasks_completed, 0) /
                    Math.max(1, players.filter((p) => p.role !== 'traitor').reduce((s, p) => s + p.total_tasks, 0))) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* my tasks */}
          <h3 className="text-sm font-bold text-cream mb-3">Your Tasks</h3>
          <div className="space-y-2 mb-6">
            {myTasks.map((task, i) => {
              const done = task.endsWith('✓');
              return (
                <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-xl ${done ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-800/40'}`}>
                  <span className={`text-sm ${done ? 'text-emerald-400 line-through' : 'text-slate-300'}`}>{task.replace(' ✓', '')}</span>
                  {!done && !isTraitor && (
                    <button onClick={() => handleCompleteTask(i)} className="btn-ghost text-xs py-1.5 px-3">
                      Do Task
                    </button>
                  )}
                  {isTraitor && !done && (
                    <span className="text-xs text-rose-400">Pretend to do it</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* player list */}
          <h3 className="text-sm font-bold text-cream mb-3">Players</h3>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {players.map((p) => (
              <div key={p.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${p.is_alive ? 'bg-slate-800/40' : 'bg-rose-500/10 opacity-60'}`}>
                <div className="w-7 h-7 rounded-lg nav-gradient flex items-center justify-center text-xs font-bold text-cream">
                  {p.profile_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-cream truncate">{p.profile_name}</span>
                {!p.is_alive && <Skull className="w-3 h-3 text-rose-400 ml-auto" />}
              </div>
            ))}
          </div>

          <button onClick={handleMoveToDiscussion} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            <Vote className="w-5 h-5" /> Move to Discussion
          </button>
        </div>
      </div>
    );
  }

  // ===== DISCUSSION PHASE =====
  if (view === 'discussion') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="glass-strong rounded-3xl p-6 sm:p-8 animate-slide-up">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-cream">Discussion</h2>
            <p className="text-slate-400 text-sm mt-1">Who do you think is the traitor? Talk it out in the chat room, then vote.</p>
          </div>

          <div className="space-y-2 mb-6">
            {players.filter((p) => p.is_alive).map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/40">
                <div className="w-9 h-9 rounded-lg nav-gradient flex items-center justify-center text-sm font-bold text-cream">
                  {p.profile_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-cream text-sm font-medium">{p.profile_name}</span>
                <span className="text-xs text-slate-500 ml-auto">{p.tasks_completed}/{p.total_tasks} tasks</span>
              </div>
            ))}
          </div>

          <button onClick={handleMoveToVoting} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            <Vote className="w-5 h-5" /> Start Voting
          </button>
        </div>
      </div>
    );
  }

  // ===== VOTING PHASE =====
  if (view === 'voting') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="glass-strong rounded-3xl p-6 sm:p-8 animate-slide-up">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto mb-4">
              <Vote className="w-8 h-8 text-rose-400" />
            </div>
            <h2 className="text-2xl font-bold text-cream">Vote to Eject</h2>
            <p className="text-slate-400 text-sm mt-1">Choose who you think is the traitor.</p>
          </div>

          <div className="space-y-2 mb-6">
            {players.filter((p) => p.is_alive && p.profile_id !== user?.id).map((p) => (
              <button
                key={p.id}
                onClick={() => setVoteTarget(p.profile_id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  voteTarget === p.profile_id
                    ? 'bg-rose-500/20 border-2 border-rose-500/40 scale-[1.02]'
                    : 'bg-slate-800/40 border-2 border-transparent hover:bg-slate-700/40'
                }`}
              >
                <div className="w-10 h-10 rounded-lg nav-gradient flex items-center justify-center text-sm font-bold text-cream">
                  {p.profile_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-cream text-sm font-medium flex-1 text-left">{p.profile_name}</span>
                {voteTarget === p.profile_id && <CheckCircle2 className="w-5 h-5 text-rose-400" />}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setVoteTarget(null)} className="btn-ghost flex-1">
              Skip Vote
            </button>
            <button onClick={handleVote} disabled={!voteTarget} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Skull className="w-5 h-5" /> Eject
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== RESULT =====
  if (view === 'result') {
    const traitor = players.find((p) => p.profile_id === game?.traitor_id);
    const crewWon = game?.status === 'finished';
    const me = players.find((p) => p.profile_id === user?.id);
    const myTeamWon = me?.role !== 'traitor' ? crewWon : !crewWon;

    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <div className={`glass-strong rounded-3xl p-8 text-center animate-pop ${myTeamWon ? 'border-emerald-500/40' : 'border-rose-500/40'}`}>
          <div className={`w-24 h-24 rounded-2xl mx-auto mb-6 flex items-center justify-center ${myTeamWon ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
            {myTeamWon ? <CheckCircle2 className="w-12 h-12 text-emerald-400" /> : <Skull className="w-12 h-12 text-rose-400" />}
          </div>
          <h2 className="text-3xl font-bold text-cream mb-2">{myTeamWon ? 'Victory!' : 'Defeat'}</h2>
          <p className="text-slate-400 mb-6">
            {crewWon ? 'The crew caught the traitor!' : 'The traitor eliminated the crew!'}
          </p>

          <div className="glass rounded-2xl p-5 mb-6">
            <p className="text-sm text-slate-400 mb-2">The traitor was</p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <Skull className="w-6 h-6 text-rose-400" />
              </div>
              <span className="text-xl font-bold text-cream">{traitor?.profile_name ?? 'Unknown'}</span>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button onClick={handleLeave} className="btn-ghost flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" /> Back to Lobby
            </button>
            <button onClick={handleLeave} className="btn-primary flex items-center gap-2">
              <RefreshCw className="w-5 h-5" /> New Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
