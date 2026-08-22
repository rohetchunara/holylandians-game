import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Heart, Crosshair } from 'lucide-react';

interface Props {
  onBack: () => void;
  onScore: (score: number) => void;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  speed: number;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
}

const GAME_WIDTH = 360;
const GAME_HEIGHT = 500;
const PLAYER_SIZE = 30;
const BULLET_SPEED = 8;
const ENEMY_SIZE = 25;

export default function SkyBattle({ onBack, onScore }: Props) {
  const [playerX, setPlayerX] = useState(GAME_WIDTH / 2);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [playing, setPlaying] = useState(false);
  const enemyIdRef = useRef(0);
  const bulletIdRef = useRef(0);
  const frameRef = useRef<number>(0);
  const playerXRef = useRef(playerX);

  useEffect(() => { playerXRef.current = playerX; }, [playerX]);

  const shoot = useCallback(() => {
    setBullets((prev) => [...prev, { id: bulletIdRef.current++, x: playerXRef.current, y: GAME_HEIGHT - 60 }]);
  }, []);

  useEffect(() => {
    if (!playing || gameOver) return;

    const gameLoop = () => {
      frameRef.current = requestAnimationFrame(gameLoop);

      setBullets((prev) => prev
        .map((b) => ({ ...b, y: b.y - BULLET_SPEED }))
        .filter((b) => b.y > -10)
      );

      setEnemies((prev) => {
        const updated = prev.map((e) => ({ ...e, y: e.y + e.speed })).filter((e) => e.y < GAME_HEIGHT + 30);
        return updated;
      });

      if (Math.random() < 0.02 + score * 0.0005) {
        setEnemies((prev) => [...prev, { id: enemyIdRef.current++, x: Math.random() * (GAME_WIDTH - ENEMY_SIZE), y: -ENEMY_SIZE, speed: 1.5 + Math.random() * 2 }]);
      }
    };

    const collisionCheck = setInterval(() => {
      setBullets((prevBullets) => {
        let hit = false;
        const remaining = prevBullets.filter((b) => {
          setEnemies((prevEnemies) => {
            const enemyIdx = prevEnemies.findIndex((e) => Math.abs(e.x - b.x) < ENEMY_SIZE && Math.abs(e.y - b.y) < ENEMY_SIZE);
            if (enemyIdx >= 0) {
              hit = true;
              return prevEnemies.filter((_, i) => i !== enemyIdx);
            }
            return prevEnemies;
          });
          return !hit;
        });
        if (hit) setScore((s) => s + 10);
        return remaining;
      });

      setEnemies((prevEnemies) => {
        const colliding = prevEnemies.some((e) => Math.abs(e.x - playerXRef.current) < PLAYER_SIZE && e.y > GAME_HEIGHT - 80);
        if (colliding) {
          setHealth((h) => {
            const newH = h - 1;
            if (newH <= 0) { setGameOver(true); setPlaying(false); }
            return newH;
          });
          return prevEnemies.filter((e) => !(Math.abs(e.x - playerXRef.current) < PLAYER_SIZE && e.y > GAME_HEIGHT - 80));
        }
        return prevEnemies;
      });
    }, 50);

    gameLoop();
    return () => { cancelAnimationFrame(frameRef.current); clearInterval(collisionCheck); };
  }, [playing, gameOver, score]);

  const startGame = () => {
    setScore(0); setHealth(3); setEnemies([]); setBullets([]); setGameOver(false); setPlaying(true);
  };

  const endGame = () => {
    onScore(score);
    onBack();
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={endGame} className="p-1.5 rounded-lg text-slate-400 hover:text-cream hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-cream">Sky Battle</h2>
        <div className="flex items-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart key={i} className={`w-4 h-4 ${i < health ? 'text-rose-400' : 'text-slate-700'}`} />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-amber-400 font-bold">Score: {score}</span>
      </div>

      <div
        className="relative bg-slate-950 rounded-2xl overflow-hidden border border-blue-500/20 mx-auto"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT, maxWidth: '100%' }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * GAME_WIDTH;
          setPlayerX(Math.max(PLAYER_SIZE / 2, Math.min(GAME_WIDTH - PLAYER_SIZE / 2, x)));
        }}
        onTouchMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.touches[0].clientX - rect.left) / rect.width) * GAME_WIDTH;
          setPlayerX(Math.max(PLAYER_SIZE / 2, Math.min(GAME_WIDTH - PLAYER_SIZE / 2, x)));
        }}
        onClick={shoot}
      >
        {playing ? (
          <>
            <div className="absolute" style={{ left: playerX - PLAYER_SIZE / 2, bottom: 20, width: PLAYER_SIZE, height: PLAYER_SIZE, transition: 'left 0.05s' }}>
              <div className="w-full h-full rounded-lg nav-gradient flex items-center justify-center text-sm">✈️</div>
            </div>
            {bullets.map((b) => (
              <div key={b.id} className="absolute w-1 h-3 bg-blue-400 rounded-full" style={{ left: b.x, top: b.y }} />
            ))}
            {enemies.map((e) => (
              <div key={e.id} className="absolute flex items-center justify-center text-lg" style={{ left: e.x, top: e.y, width: ENEMY_SIZE, height: ENEMY_SIZE }}>
                ☄️
              </div>
            ))}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {gameOver ? (
              <>
                <p className="text-2xl font-bold text-rose-400 mb-2">Game Over!</p>
                <p className="text-amber-400 mb-4">Final Score: {score}</p>
                <button onClick={startGame} className="btn-primary">Play Again</button>
              </>
            ) : (
              <>
                <Crosshair className="w-12 h-12 text-blue-400 mb-3" />
                <p className="text-slate-400 text-sm mb-4 text-center px-4">Move to steer, tap/click to shoot. Destroy asteroids for points!</p>
                <button onClick={startGame} className="btn-primary">Start Game</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
