import React, { useEffect, useRef, useState } from 'react';

export default function HolylandWarfare() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [ammo, setAmmo] = useState(30);
  const [gameOver, setGameOver] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 900;
    canvas.height = 550;

    let player = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      radius: 20,
      speed: 4.2,
      angle: 0,
      walkCycle: 0,
    };

    let keys: { [key: string]: boolean } = {};
    let mouse = { x: player.x, y: player.y };
    let bullets: { x: number; y: number; dx: number; dy: number; range: number }[] = [];
    let enemies: { x: number; y: number; radius: number; speed: number; health: number; walkCycle: number }[] = [];
    let particles: { x: number; y: number; dx: number; dy: number; color: string; life: number }[] = [];
    
    // Realistic Environment Obstacles (Tactical Jeeps & Concrete Barriers)
    let obstacles = [
      { x: 220, y: 150, w: 110, h: 55, type: 'vehicle' },
      { x: 580, y: 340, w: 120, h: 60, type: 'vehicle' },
      { x: 380, y: 410, w: 90, h: 50, type: 'barrier' },
      { x: 140, y: 380, w: 70, h: 70, type: 'barrier' }
    ];

    let currentScore = 0;
    let currentHealth = 100;
    let currentAmmo = 30;
    let animationFrameId: number;

    const handleKeyDown = (e: KeyboardEvent) => { 
      keys[e.key.toLowerCase()] = true; 
      if (e.key.toLowerCase() === 'r' && !isReloading) {
        setIsReloading(true);
        setTimeout(() => {
          currentAmmo = 30;
          setAmmo(30);
          setIsReloading(false);
        }, 1200);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleCanvasClick = () => {
      if (gameOver || isReloading || currentAmmo <= 0) return;
      currentAmmo -= 1;
      setAmmo(currentAmmo);

      const speed = 15;
      const spread = (Math.random() - 0.5) * 0.06;
      const finalAngle = player.angle + spread;
      const dx = Math.cos(finalAngle) * speed;
      const dy = Math.sin(finalAngle) * speed;

      bullets.push({ 
        x: player.x + Math.cos(player.angle) * 25, 
        y: player.y + Math.sin(player.angle) * 25, 
        dx, 
        dy, 
        range: 0 
      });

      // Muzzle flash particles
      for (let i = 0; i < 5; i++) {
        particles.push({
          x: player.x + Math.cos(player.angle) * 30,
          y: player.y + Math.sin(player.angle) * 30,
          dx: (Math.random() - 0.5) * 5,
          dy: (Math.random() - 0.5) * 5,
          color: '#FDE047',
          life: 12
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleCanvasClick);

    // Spawn Enemy Squads Wave
    const enemySpawner = setInterval(() => {
      if (gameOver) return;
      const side = Math.floor(Math.random() * 4);
      let ex = 0, ey = 0;
      if (side === 0) { ex = Math.random() * canvas.width; ey = -40; }
      else if (side === 1) { ex = canvas.width + 40; ey = Math.random() * canvas.height; }
      else if (side === 2) { ex = Math.random() * canvas.width; ey = canvas.height + 40; }
      else { ex = -40; ey = Math.random() * canvas.height; }

      enemies.push({ x: ex, y: ey, radius: 18, speed: 2.3 + Math.random() * 0.7, health: 2, walkCycle: 0 });
    }, 1300);

    const updateGame = () => {
      // 1. Realistic Outdoor Environment & Climate Rendering
      // Dynamic Sky gradient (Dawn/Dusk tactical horizon)
      const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGradient.addColorStop(0, '#1e3a8a');
      skyGradient.addColorStop(0.4, '#3b82f6');
      skyGradient.addColorStop(0.5, '#60a5fa');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Distant Realistic Hills
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, 260);
      ctx.lineTo(150, 180);
      ctx.lineTo(320, 240);
      ctx.lineTo(500, 160);
      ctx.lineTo(700, 220);
      ctx.lineTo(900, 170);
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.fill();

      // Rolling Green Grass Plains Ground
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, 250, canvas.width, canvas.height - 250);

      // Grass Field Texture Blades
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 1.5;
      for (let i = 20; i < canvas.width; i += 45) {
        ctx.beginPath();
        ctx.moveTo(i, 270);
        ctx.lineTo(i - 4, 258);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(i + 15, 340);
        ctx.lineTo(i + 12, 328);
        ctx.stroke();
      }

      // 2. Render Tactical Vehicles & Obstacles
      obstacles.forEach(obs => {
        ctx.save();
        if (obs.type === 'vehicle') {
          // Realistic military camo/tactical jeep body
          ctx.fillStyle = '#334155';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 10);
          ctx.fill();
          ctx.stroke();

          // Windshield & Wheels
          ctx.fillStyle = '#64748b';
          ctx.fillRect(obs.x + 20, obs.y + 8, obs.w - 40, 14);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(obs.x - 6, obs.y + 8, 8, 16);
          ctx.fillRect(obs.x + obs.w - 2, obs.y + 8, 8, 16);
          ctx.fillRect(obs.x - 6, obs.y + obs.h - 24, 8, 16);
          ctx.fillRect(obs.x + obs.w - 2, obs.y + obs.h - 24, 8, 16);
        } else {
          // Concrete barricade
          ctx.fillStyle = '#475569';
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 6);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      });

      // 3. Player Movement & Collision Handling
      let nextX = player.x;
      let nextY = player.y;
      let isMoving = false;

      if (keys['w'] || keys['arrowup']) { nextY -= player.speed; isMoving = true; }
      if (keys['s'] || keys['arrowdown']) { nextY += player.speed; isMoving = true; }
      if (keys['a'] || keys['arrowleft']) { nextX -= player.speed; isMoving = true; }
      if (keys['d'] || keys['arrowright']) { nextX += player.speed; isMoving = true; }

      let collided = false;
      obstacles.forEach(obs => {
        if (nextX + player.radius > obs.x && nextX - player.radius < obs.x + obs.w &&
            nextY + player.radius > obs.y && nextY - player.radius < obs.y + obs.h) {
          collided = true;
        }
      });

      if (!collided) {
        player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, nextX));
        player.y = Math.max(260 + player.radius, Math.min(canvas.height - player.radius, nextY));
      }

      if (isMoving) player.walkCycle += 0.2;
      player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

      // 4. Render Player (Realistic Soldier Character with Animated Limbs)
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);

      // Walking legs animation
      const legOffset = isMoving ? Math.sin(player.walkCycle) * 8 : 0;
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(-8, -14 + legOffset, 5, 11);
      ctx.fillRect(-8, 3 - legOffset, 5, 11);

      // Combat Vest / Torso
      ctx.shadowColor = '#2563eb';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(-14, -16, 28, 32, 8);
      ctx.fill();

      // Arms & Rifle
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(2, -18, 14, 6);
      ctx.fillRect(2, 12, 14, 6);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(4, -3, 30, 6);

      // Helmet & Visor
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#93c5fd';
      ctx.fillRect(4, -5, 6, 10);

      ctx.restore();

      // 5. Update & Render Bullets
      bullets.forEach((b, index) => {
        b.x += b.dx;
        b.y += b.dy;
        b.range += 1;

        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4.5, 0, Math.PI * 2);
        ctx.fill();

        obstacles.forEach(obs => {
          if (b.x > obs.x && b.x < obs.x + obs.w && b.y > obs.y && b.y < obs.y + obs.h) {
            bullets.splice(index, 1);
          }
        });

        if (b.x < 0 || b.x > canvas.width || b.y < 250 || b.y > canvas.height || b.range > 50) {
          bullets.splice(index, 1);
        }
      });

      // 6. Update & Render Enemy Squads (AI chasing and attacking the player)
      enemies.forEach((enemy, eIndex) => {
        enemy.walkCycle += 0.15;
        const angleToPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        
        let exNext = enemy.x + Math.cos(angleToPlayer) * enemy.speed;
        let eyNext = enemy.y + Math.sin(angleToPlayer) * enemy.speed;

        let enemyCollided = false;
        obstacles.forEach(obs => {
          if (exNext + enemy.radius > obs.x && exNext - enemy.radius < obs.x + obs.w &&
              eyNext + enemy.radius > obs.y && eyNext - enemy.radius < obs.y + obs.h) {
            enemyCollided = true;
          }
        });

        if (!enemyCollided) {
          enemy.x = exNext;
          enemy.y = Math.max(260 + enemy.radius, eyNext);
        }

        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(angleToPlayer);

        ctx.shadowColor = '#dc2626';
        ctx.shadowBlur = 12;

        // Enemy Torso
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.roundRect(-14, -16, 28, 32, 8);
        ctx.fill();

        // Enemy Rifle
        ctx.fillStyle = '#334155';
        ctx.fillRect(4, -3, 24, 6);

        // Enemy Helmet
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Check Bullet Hit Enemy
        bullets.forEach((bullet, bIndex) => {
          const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
          if (dist < enemy.radius + 6) {
            enemy.health -= 1;
            bullets.splice(bIndex, 1);

            for (let p = 0; p < 5; p++) {
              particles.push({
                x: enemy.x,
                y: enemy.y,
                dx: (Math.random() - 0.5) * 5,
                dy: (Math.random() - 0.5) * 5,
                color: '#ef4444',
                life: 18
              });
            }

            if (enemy.health <= 0) {
              enemies.splice(eIndex, 1);
              currentScore += 25;
              setScore(currentScore);
            }
          }
        });

        // Check Enemy Attacks & Kills Player
        const playerDist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (playerDist < player.radius + enemy.radius) {
          enemies.splice(eIndex, 1);
          currentHealth -= 20;
          setHealth(Math.max(0, currentHealth));
          
          // Damage blood splash effect on player
          for (let p = 0; p < 6; p++) {
            particles.push({
              x: player.x,
              y: player.y,
              dx: (Math.random() - 0.5) * 6,
              dy: (Math.random() - 0.5) * 6,
              color: '#ef4444',
              life: 20
            });
          }

          if (currentHealth <= 0) {
            setGameOver(true);
          }
        }
      });

      // 7. Render Particles
      particles.forEach((pt, pIdx) => {
        pt.x += pt.dx;
        pt.y += pt.dy;
        pt.life -= 1;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        if (pt.life <= 0) {
          particles.splice(pIdx, 1);
        }
      });

      if (!gameOver) {
        animationFrameId = requestAnimationFrame(updateGame);
      }
    };

    animationFrameId = requestAnimationFrame(updateGame);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleCanvasClick);
      clearInterval(enemySpawner);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameOver, isReloading]);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-[#050B14] text-[#F8FAFC] rounded-3xl border border-[#1E3A8A] shadow-[0_0_35px_rgba(59,130,246,0.35)] max-w-5xl mx-auto">
      <div className="flex justify-between w-full mb-4 items-center px-2">
        <h2 className="text-xl font-extrabold tracking-wider text-[#60A5FA] flex items-center gap-2">
          🎖️ HOLYLAND WARFARE: TACTICAL ARENA
        </h2>
        <div className="flex gap-4 text-sm font-bold">
          <span className="bg-[#1E293B] px-3.5 py-1.5 rounded-xl border border-[#3B82F6]/30">Score: <strong className="text-[#FBBF24]">{score}</strong></span>
          <span className="bg-[#1E293B] px-3.5 py-1.5 rounded-xl border border-[#3B82F6]/30">Ammo: <strong className="text-[#38BDF8]">{isReloading ? 'RELOADING...' : `${ammo}/30`}</strong></span>
          <span className="bg-[#1E293B] px-3.5 py-1.5 rounded-xl border border-[#3B82F6]/30">HP: <strong className="text-[#EF4444]">{health}%</strong></span>
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden border-2 border-[#1E3A8A] shadow-[0_0_25px_rgba(30,58,138,0.6)]">
        <canvas ref={canvasRef} className="cursor-crosshair block bg-[#030712]" />
        
        {gameOver && (
          <div className="absolute inset-0 bg-[#030712]/95 flex flex-col items-center justify-center gap-5 backdrop-blur-md">
            <h3 className="text-4xl font-black text-[#EF4444] tracking-widest drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]">SQUAD ELIMINATED</h3>
            <p className="text-[#93C5FD] text-lg font-semibold">Final Tactical Score: <span className="text-[#FBBF24] font-bold">{score}</span></p>
            <button
              onClick={() => { setGameOver(false); setHealth(100); setScore(0); }}
              className="px-8 py-3 bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] text-[#F8FAFC] font-extrabold rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.6)] hover:scale-105 transition-all"
            >
              Redeploy Squad
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-[#93C5FD] mt-4 font-medium tracking-wide">
        <strong>Controls:</strong> WASD / Arrows to move • Mouse to aim & Click to shoot • Press <strong className="text-[#FBBF24]">R</strong> to reload magazine
      </p>
    </div>
  );
}