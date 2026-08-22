import { useState, useEffect } from 'react';
import { ArrowLeft, Swords, Shield, Zap, Heart, Skull } from 'lucide-react';

interface Props {
  onBack: () => void;
  onScore: (score: number) => void;
}

interface Fighter {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
}

const ENEMIES = [
  { name: 'Shadow Knight', hp: 50, attack: 12, defense: 5 },
  { name: 'Fire Mage', hp: 40, attack: 18, defense: 2 },
  { name: 'Stone Golem', hp: 80, attack: 8, defense: 12 },
  { name: 'Dark Assassin', hp: 35, attack: 20, defense: 3 },
  { name: 'Ice Queen', hp: 60, attack: 15, defense: 8 },
];

export default function HolylandWarfare({ onBack, onScore }: Props) {
  const [player, setPlayer] = useState<Fighter>({ name: 'You', hp: 100, maxHp: 100, attack: 15, defense: 8 });
  const [enemy, setEnemy] = useState<Fighter | null>(null);
  const [round, setRound] = useState(1);
  const [log, setLog] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    startRound(1, 100, 15, 8);
  }, []);

  const startRound = (r: number, hp: number, atk: number, def: number) => {
    const template = ENEMIES[(r - 1) % ENEMIES.length];
    const scale = 1 + (r - 1) * 0.3;
    setEnemy({
      name: template.name,
      hp: Math.round(template.hp * scale),
      maxHp: Math.round(template.hp * scale),
      attack: Math.round(template.attack * scale),
      defense: template.defense,
    });
    setPlayer((prev) => ({ ...prev, hp: hp, maxHp: 100, attack: atk, defense: def }));
    setLog([`Round ${r}: ${template.name} appears!`]);
  };

  const playerAttack = async () => {
    if (!enemy || busy || gameOver) return;
    setBusy(true);
    const dmg = Math.max(1, player.attack - enemy.defense + Math.floor(Math.random() * 5) - 2);
    const newEnemyHp = enemy.hp - dmg;
    setLog((prev) => [`You dealt ${dmg} damage to ${enemy.name}!`, ...prev].slice(0, 5));
    setEnemy({ ...enemy, hp: newEnemyHp });

    if (newEnemyHp <= 0) {
      setLog((prev) => [`${enemy.name} defeated!`, ...prev]);
      const newRound = round + 1;
      const newHp = Math.min(100, player.hp + 20);
      setRound(newRound);
      setBusy(false);
      setTimeout(() => startRound(newRound, newHp, player.attack + 2, player.defense + 1), 1000);
      return;
    }

    setTimeout(() => {
      const enemyDmg = Math.max(1, enemy.attack - player.defense + Math.floor(Math.random() * 5) - 2);
      const newPlayerHp = player.hp - enemyDmg;
      setLog((prev) => [`${enemy.name} dealt ${enemyDmg} damage to you!`, ...prev].slice(0, 5));
      setPlayer((prev) => ({ ...prev, hp: newPlayerHp }));

      if (newPlayerHp <= 0) {
        setGameOver(true);
        setLog((prev) => ['You were defeated!', ...prev]);
        onScore((round - 1) * 100);
      }
      setBusy(false);
    }, 600);
  };

  const defend = async () => {
    if (!enemy || busy || gameOver) return;
    setBusy(true);
    const enemyDmg = Math.max(1, Math.floor((enemy.attack - player.defense * 2) * 0.5));
    const newPlayerHp = player.hp - enemyDmg;
    setLog((prev) => [`You defended! Took only ${enemyDmg} damage.`, ...prev].slice(0, 5));
    setPlayer((prev) => ({ ...prev, hp: newPlayerHp }));

    if (newPlayerHp <= 0) {
      setGameOver(true);
      setLog((prev) => ['You were defeated!', ...prev]);
      onScore((round - 1) * 100);
    }
    setBusy(false);
  };

  const specialAttack = async () => {
    if (!enemy || busy || gameOver) return;
    setBusy(true);
    const dmg = Math.max(1, player.attack * 2 - enemy.defense);
    const newEnemyHp = enemy.hp - dmg;
    setLog((prev) => [`Special attack! Dealt ${dmg} damage!`, ...prev].slice(0, 5));
    setEnemy({ ...enemy, hp: newEnemyHp });

    if (newEnemyHp <= 0) {
      setLog((prev) => [`${enemy.name} defeated with a special!`, ...prev]);
      const newRound = round + 1;
      const newHp = Math.min(100, player.hp + 15);
      setRound(newRound);
      setBusy(false);
      setTimeout(() => startRound(newRound, newHp, player.attack + 2, player.defense + 1), 1000);
      return;
    }

    setTimeout(() => {
      const enemyDmg = Math.max(1, enemy.attack - player.defense + Math.floor(Math.random() * 5) - 2);
      const newPlayerHp = player.hp - enemyDmg;
      setLog((prev) => [`${enemy.name} countered for ${enemyDmg}!`, ...prev].slice(0, 5));
      setPlayer((prev) => ({ ...prev, hp: newPlayerHp }));

      if (newPlayerHp <= 0) {
        setGameOver(true);
        setLog((prev) => ['You were defeated!', ...prev]);
        onScore((round - 1) * 100);
      }
      setBusy(false);
    }, 600);
  };

  const restart = () => {
    setRound(1); setGameOver(false); setBusy(false);
    startRound(1, 100, 15, 8);
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-1.5 rounded-lg text-slate-400 hover:text-cream hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-cream">Holyland Warfare</h2>
        <span className="text-sm text-amber-400 font-bold">Round {round}</span>
      </div>

      <div className="glass-strong rounded-2xl p-4 space-y-3 animate-fade-in">
        {/* Player */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-bold text-cream">You</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4 text-rose-400" />
            <span className="text-sm text-rose-400">{player.hp}/{player.maxHp}</span>
          </div>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-rose-400 transition-all duration-300" style={{ width: `${(player.hp / player.maxHp) * 100}%` }} />
        </div>

        {/* Enemy */}
        {enemy && (
          <>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Skull className="w-5 h-5 text-rose-400" />
                <span className="text-sm font-bold text-cream">{enemy.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-rose-400" />
                <span className="text-sm text-rose-400">{enemy.hp}/{enemy.maxHp}</span>
              </div>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} />
            </div>
          </>
        )}
      </div>

      {/* Battle log */}
      <div className="glass rounded-2xl p-3 space-y-1">
        {log.map((entry, i) => (
          <p key={i} className={`text-xs ${i === 0 ? 'text-cream' : 'text-slate-500'}`}>{entry}</p>
        ))}
      </div>

      {/* Actions */}
      {!gameOver ? (
        <div className="grid grid-cols-3 gap-2">
          <button onClick={playerAttack} disabled={busy} className="btn-primary flex flex-col items-center gap-1 py-3">
            <Swords className="w-5 h-5" /><span className="text-xs">Attack</span>
          </button>
          <button onClick={defend} disabled={busy} className="btn-ghost flex flex-col items-center gap-1 py-3">
            <Shield className="w-5 h-5" /><span className="text-xs">Defend</span>
          </button>
          <button onClick={specialAttack} disabled={busy} className="btn-ghost flex flex-col items-center gap-1 py-3">
            <Zap className="w-5 h-5" /><span className="text-xs">Special</span>
          </button>
        </div>
      ) : (
        <div className="glass-strong rounded-2xl p-6 text-center animate-slide-up">
          <p className="text-2xl font-bold text-rose-400 mb-2">Defeated!</p>
          <p className="text-amber-400 mb-4">You reached Round {round}</p>
          <button onClick={restart} className="btn-primary w-full">Play Again</button>
        </div>
      )}
    </div>
  );
}
