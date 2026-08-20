import { useEffect, useRef, useState } from 'react';
import { Plane, Crosshair, Trophy, Users, X, RotateCcw, Heart, Skull } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { getTheme } from '../lib/colors';
import type { SkyBattleState } from '../lib/types';

interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  health: number;
  isAlive: boolean;
  kills: number;
  isLocal: boolean;
  color: string;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

const CANVAS_W = 800;
const CANVAS_H = 500;
const FIRE_COOLDOWN = 250;
const SYNC_INTERVAL = 120;
const STALE_MS = 5000;

export default function SkyBattle() {
  const { user } = useUser();
  const theme = getTheme(user?.color_theme ?? 'blue');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<'menu' | 'playing' | 'dead'>('menu');
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [localHealth, setLocalHealth] = useState(5);
  const [localKills, setLocalKills] = useState(0);

  // refs for game loop
  const localPos = useRef({ x: 100, y: 200 });
  const targetPos = useRef({ x: 100, y: 200 });
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const remotePlayersRef = useRef<Map<string, SkyBattleState>>(new Map());
  const lastFire = useRef(0);
  const lastSync = useRef(0);
  const firingRef = useRef(false);
  const localHealthRef = useRef(5);
  const localKillsRef = useRef(0);
  const aliveRef = useRef(true);
  const scrollOffsetRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const myStateIdRef = useRef<string | null>(null);

  // join game
  const joinGame = async () => {
    if (!user) return;
    // remove old stale state
    await supabase.from('sky_battle_state').delete().eq('profile_id', user.id);

    const { data, error } = await supabase
      .from('sky_battle_state')
      .insert({
        profile_id: user.id,
        profile_name: user.name,
        x: 100,
        y: 200,
        health: 5,
        is_alive: true,
        kills: 0,
      })
      .select('*')
      .maybeSingle();

    if (error || !data) return;
    myStateIdRef.current = (data as SkyBattleState).id;
    localPos.current = { x: 100, y: 200 };
    targetPos.current = { x: 100, y: 200 };
    localHealthRef.current = 5;
    localKillsRef.current = 0;
    aliveRef.current = true;
    bulletsRef.current = [];
    particlesRef.current = [];
    setLocalHealth(5);
    setLocalKills(0);
    setGameState('playing');
  };

  const leaveGame = async () => {
    if (user) {
      await supabase.from('sky_battle_state').delete().eq('profile_id', user.id);
    }
    cancelAnimationFrame(animFrameRef.current);
    setGameState('menu');
  };

  // subscribe to remote players
  useEffect(() => {
    if (gameState !== 'playing') return;

    const loadInitial = async () => {
      const { data } = await supabase.from('sky_battle_state').select('*');
      if (data) {
        const map = new Map<string, SkyBattleState>();
        (data as SkyBattleState[]).forEach((s) => {
          if (s.profile_id !== user?.id) map.set(s.profile_id, s);
        });
        remotePlayersRef.current = map;
      }
    };
    loadInitial();

    const channel = supabase
      .channel('sky-battle-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sky_battle_state' },
        (payload) => {
          const row = (payload.new ?? payload.old) as SkyBattleState;
          if (!row || row.profile_id === user?.id) return;
          if (payload.eventType === 'DELETE') {
            remotePlayersRef.current.delete(row.profile_id);
          } else {
            remotePlayersRef.current.set(row.profile_id, row);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameState, user]);

  // main game loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleMove = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      targetPos.current = {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches[0]) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onMouseDown = () => { firingRef.current = true; };
    const onMouseUp = () => { firingRef.current = false; };
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      firingRef.current = true;
      if (e.touches[0]) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      firingRef.current = false;
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    const loop = (timestamp: number) => {
      // smooth follow
      localPos.current.x += (targetPos.current.x - localPos.current.x) * 0.15;
      localPos.current.y += (targetPos.current.y - localPos.current.y) * 0.15;
      // clamp
      localPos.current.x = Math.max(20, Math.min(CANVAS_W - 20, localPos.current.x));
      localPos.current.y = Math.max(20, Math.min(CANVAS_H - 20, localPos.current.y));

      scrollOffsetRef.current = (scrollOffsetRef.current + 2) % CANVAS_W;

      // firing
      if (firingRef.current && timestamp - lastFire.current > FIRE_COOLDOWN && aliveRef.current) {
        lastFire.current = timestamp;
        bulletsRef.current.push({
          x: localPos.current.x + 30,
          y: localPos.current.y,
          vx: 8,
          vy: 0,
          ownerId: user!.id,
        });
      }

      // update bullets
      bulletsRef.current = bulletsRef.current.filter((b) => {
        b.x += b.vx;
        b.y += b.vy;
        return b.x > -20 && b.x < CANVAS_W + 20 && b.y > -20 && b.y < CANVAS_H + 20;
      });

      // check bullet hits on remote players
      if (aliveRef.current) {
        remotePlayersRef.current.forEach((rp) => {
          if (!rp.is_alive) return;
          bulletsRef.current = bulletsRef.current.filter((b) => {
            if (b.ownerId !== user!.id) return true;
            const dx = b.x - rp.x;
            const dy = b.y - rp.y;
            if (Math.sqrt(dx * dx + dy * dy) < 25) {
              // hit!
              const newHealth = rp.health - 1;
              const killed = newHealth <= 0;
              supabase.from('sky_battle_state').update({
                health: Math.max(0, newHealth),
                is_alive: !killed,
              }).eq('id', rp.id);
              if (killed) {
                localKillsRef.current += 1;
                setLocalKills(localKillsRef.current);
                supabase.from('sky_battle_state').update({ kills: localKillsRef.current }).eq('profile_id', user!.id);
                // explosion particles
                for (let i = 0; i < 20; i++) {
                  particlesRef.current.push({
                    x: rp.x, y: rp.y,
                    vx: (Math.random() - 0.5) * 8,
                    vy: (Math.random() - 0.5) * 8,
                    life: 1,
                    color: `hsl(${Math.random() * 60}, 100%, 60%)`,
                    size: Math.random() * 4 + 2,
                  });
                }
              }
              return false;
            }
            return true;
          });
        });
      }

      // check bullet hits on local player
      bulletsRef.current = bulletsRef.current.filter((b) => {
        if (b.ownerId === user!.id) return true;
        if (!aliveRef.current) return true;
        const dx = b.x - localPos.current.x;
        const dy = b.y - localPos.current.y;
        if (Math.sqrt(dx * dx + dy * dy) < 25) {
          localHealthRef.current -= 1;
          setLocalHealth(localHealthRef.current);
          if (localHealthRef.current <= 0) {
            aliveRef.current = false;
            setGameState('dead');
            supabase.from('sky_battle_state').update({ is_alive: false, health: 0 }).eq('profile_id', user!.id);
            // explosion
            for (let i = 0; i < 30; i++) {
              particlesRef.current.push({
                x: localPos.current.x, y: localPos.current.y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1,
                color: `hsl(${Math.random() * 60}, 100%, 60%)`,
                size: Math.random() * 5 + 2,
              });
            }
            // record score
            supabase.from('game_scores').insert({
              profile_id: user!.id,
              profile_name: user!.name,
              game: 'sky_battle',
              score: localKillsRef.current * 100,
            });
          } else {
            supabase.from('sky_battle_state').update({ health: localHealthRef.current }).eq('profile_id', user!.id);
          }
          return false;
        }
        return true;
      });

      // update particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life -= 0.02;
        return p.life > 0;
      });

      // sync to DB
      if (timestamp - lastSync.current > SYNC_INTERVAL) {
        lastSync.current = timestamp;
        supabase.from('sky_battle_state').update({
          x: localPos.current.x,
          y: localPos.current.y,
          updated_at: new Date().toISOString(),
        }).eq('profile_id', user!.id);
      }

      // build player list for scoreboard
      const allPlayers: PlayerState[] = [];
      if (aliveRef.current || localHealthRef.current > 0) {
        allPlayers.push({
          id: user!.id,
          name: user!.name + ' (You)',
          x: localPos.current.x,
          y: localPos.current.y,
          health: localHealthRef.current,
          isAlive: aliveRef.current,
          kills: localKillsRef.current,
          isLocal: true,
          color: theme.solid,
        });
      }
      remotePlayersRef.current.forEach((rp) => {
        const age = Date.now() - new Date(rp.updated_at).getTime();
        if (age < STALE_MS) {
          allPlayers.push({
            id: rp.profile_id,
            name: rp.profile_name,
            x: rp.x,
            y: rp.y,
            health: rp.health,
            isAlive: rp.is_alive,
            kills: rp.kills,
            isLocal: false,
            color: '#F43F5E',
          });
        }
      });
      setPlayers(allPlayers);

      // ===== RENDER =====
      // sky background
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, '#0B0F19');
      grad.addColorStop(0.5, '#0F172A');
      grad.addColorStop(1, '#1E293B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // scrolling clouds
      ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 200) - scrollOffsetRef.current + CANVAS_W) % CANVAS_W;
        const cy = 60 + i * 80;
        ctx.beginPath();
        ctx.arc(cx, cy, 40, 0, Math.PI * 2);
        ctx.arc(cx + 35, cy, 30, 0, Math.PI * 2);
        ctx.arc(cx - 30, cy, 25, 0, Math.PI * 2);
        ctx.fill();
      }

      // grid lines
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 20; i++) {
        const x = (i * 50 - scrollOffsetRef.current + CANVAS_W) % CANVAS_W;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_H);
        ctx.stroke();
      }

      // particles
      particlesRef.current.forEach((p) => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // bullets
      bulletsRef.current.forEach((b) => {
        ctx.fillStyle = b.ownerId === user!.id ? '#60A5FA' : '#F43F5E';
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(b.x - 3, b.y - 2, 6, 4);
        ctx.shadowBlur = 0;
      });

      // remote planes
      remotePlayersRef.current.forEach((rp) => {
        const age = Date.now() - new Date(rp.updated_at).getTime();
        if (age >= STALE_MS || !rp.is_alive) return;
        drawPlane(ctx, rp.x, rp.y, '#F43F5E', false, rp.health);
      });

      // local plane
      if (aliveRef.current) {
        drawPlane(ctx, localPos.current.x, localPos.current.y, theme.solid, true, localHealthRef.current);
      }

      // health bar
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(10, 10, 120, 24);
      ctx.fillStyle = '#F1F5F9';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText('HP', 18, 26);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i < localHealthRef.current ? '#3B82F6' : '#334155';
        ctx.fillRect(42 + i * 16, 16, 12, 12);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [gameState, user, theme]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (user && myStateIdRef.current) {
        supabase.from('sky_battle_state').delete().eq('profile_id', user.id);
      }
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [user]);

  if (gameState === 'menu') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="glass-strong rounded-3xl p-8 text-center relative overflow-hidden animate-slide-up">
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl nav-gradient flex items-center justify-center mx-auto mb-6 animate-float">
              <Plane className="w-10 h-10 text-cream" />
            </div>
            <h2 className="text-3xl font-bold text-cream mb-2">Sky Battle</h2>
            <p className="text-slate-400 mb-6">Infinite Dogfight — Multiplayer</p>

            <div className="glass rounded-2xl p-5 mb-6 text-left space-y-3">
              <div className="flex items-start gap-3">
                <Crosshair className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-300">Move your plane by moving the mouse or dragging your finger. Click or tap to fire bullets.</p>
              </div>
              <div className="flex items-start gap-3">
                <Heart className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-300">Each plane has 5 health. Take 5 hits and you're eliminated with an explosion.</p>
              </div>
              <div className="flex items-start gap-3">
                <Trophy className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-300">Score points by shooting down other players. Live scoreboard tracks everyone.</p>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-300">Real-time multiplayer — other lounge members appear in your sky instantly.</p>
              </div>
            </div>

            <button onClick={joinGame} className="btn-primary text-lg px-8 py-3 inline-flex items-center gap-2">
              <Plane className="w-5 h-5" /> Launch & Join Battle
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'dead') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="glass-strong rounded-3xl p-8 text-center animate-pop">
          <div className="w-20 h-20 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto mb-6">
            <Skull className="w-10 h-10 text-rose-400" />
          </div>
          <h2 className="text-3xl font-bold text-cream mb-2">Eliminated!</h2>
          <p className="text-slate-400 mb-6">Your plane was shot down.</p>
          <div className="glass rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-around">
              <div>
                <p className="text-3xl font-bold text-amber-400">{localKills}</p>
                <p className="text-xs text-slate-500">Kills</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-400">{localKills * 100}</p>
                <p className="text-xs text-slate-500">Score</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={leaveGame} className="btn-ghost flex items-center gap-2">
              <X className="w-5 h-5" /> Exit
            </button>
            <button onClick={joinGame} className="btn-primary flex items-center gap-2">
              <RotateCcw className="w-5 h-5" /> Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // playing
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl nav-gradient flex items-center justify-center">
            <Plane className="w-5 h-5 text-cream" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-cream">Sky Battle</h2>
            <p className="text-xs text-slate-500">Move to fly, tap/click to fire</p>
          </div>
        </div>
        <button onClick={leaveGame} className="btn-ghost flex items-center gap-2 text-sm">
          <X className="w-4 h-4" /> Leave
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
        {/* canvas */}
        <div ref={containerRef} className="relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="w-full rounded-2xl glass cursor-crosshair touch-none"
            style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
          />
        </div>

        {/* scoreboard */}
        <div className="glass rounded-2xl p-4 h-fit">
          <h3 className="text-sm font-bold text-cream mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Live Scoreboard
          </h3>
          <div className="space-y-2">
            {players.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Waiting for players...</p>
            ) : (
              [...players]
                .sort((a, b) => b.kills - a.kills)
                .map((p) => (
                  <div
                    key={p.id}
                    className={`rounded-xl p-2.5 ${p.isLocal ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-slate-800/40'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-cream truncate flex-1">{p.name}</span>
                      <span className="text-xs text-amber-400 font-bold ml-2">{p.kills}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {p.isAlive ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full ${i < p.health ? 'bg-blue-400' : 'bg-slate-700'}`}
                          />
                        ))
                      ) : (
                        <span className="text-[10px] text-rose-400 flex items-center gap-1">
                          <Skull className="w-3 h-3" /> Eliminated
                        </span>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <p className="text-xs text-slate-500">Active: {players.filter((p) => p.isAlive).length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function drawPlane(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  isLocal: boolean,
  health: number
) {
  ctx.save();
  ctx.translate(x, y);

  // glow
  ctx.shadowBlur = 15;
  ctx.shadowColor = color;

  // body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-10, -8);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-10, 8);
  ctx.closePath();
  ctx.fill();

  // wings
  ctx.fillStyle = isLocal ? '#60A5FA' : '#FB7185';
  ctx.beginPath();
  ctx.moveTo(-2, -2);
  ctx.lineTo(-14, -16);
  ctx.lineTo(-8, -16);
  ctx.lineTo(2, -4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-2, 2);
  ctx.lineTo(-14, 16);
  ctx.lineTo(-8, 16);
  ctx.lineTo(2, 4);
  ctx.closePath();
  ctx.fill();

  // cockpit
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.arc(5, 0, 3, 0, Math.PI * 2);
  ctx.fill();

  // health pips
  ctx.shadowBlur = 0;
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < health ? '#3B82F6' : '#334155';
    ctx.fillRect(-12 + i * 5, -22, 4, 3);
  }

  ctx.restore();
}
