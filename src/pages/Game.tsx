import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Home, RotateCcw } from "lucide-react";

// Game Constants
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const MAP_WIDTH = 2000;
const MAP_HEIGHT = 2000;

// Types
interface GameState {
  mode: 'futuristic' | 'magic' | null;
  wave: number;
  waveTimer: number;
  timeElapsed: number;
  isPaused: boolean;
  gameOver: boolean;
  score: number;
  kills: number;
}

interface PlayerStats {
  maxHP: number;
  currentHP: number;
  moveSpeed: number;
  attackSpeed: number;
  projectileSpeed: number;
  projectileAmount: number;
  damage: number;
  pickupRange: number;
  critChance: number;
  critMultiplier: number;
  armor: number;
  regen: number;
  xpMultiplier: number;
  pierce: number;
  bounce: number;
  chain: number;
  explosionChance: number;
  aoeSize: number;
  guardian: boolean;
  apocalypse: boolean;
  doubleFire: boolean;
  timeWarp: number;
  lifesteal: number;
  stationaryBonus: number;
  movingDamage: number;
  rampageBonus: number;
}

interface XPState {
  current: number;
  required: number;
  level: number;
}

interface Weapon {
  name: string;
  damage: number;
  cooldown: number;
  projectiles: number;
  spread: number;
  type: string;
  color: string;
  pierce?: number;
  chains?: number;
  explosive?: boolean;
  slow?: boolean;
  lifesteal?: boolean;
}

interface Upgrade {
  name: string;
  description?: string;
  stat?: keyof PlayerStats;
  value?: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  percent?: boolean;
  type?: 'weapon';
  weapon?: Weapon;
  effect?: () => void;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  size: number;
  color: string;
  xpValue: number;
  slowTimer: number;
  type: string;
}

interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  color: string;
  pierce: number;
  hitEnemies: number[];
  explosive: boolean;
}

interface XPOrb {
  id: number;
  x: number;
  y: number;
  value: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  opacity: number;
}

// Audio Context
let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
};

const playSound = (type: string) => {
  if (!audioCtx) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  const now = audioCtx.currentTime;
  
  switch(type) {
    case 'shoot':
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
    case 'hit':
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
      break;
    case 'kill':
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;
    case 'levelup':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.setValueAtTime(600, now + 0.1);
      osc.frequency.setValueAtTime(800, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
      break;
    case 'pickup':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
    case 'hurt':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    case 'explosion':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;
  }
};

// Weapon Definitions
const futuristicWeapons: Weapon[] = [
  { name: 'Pistol', damage: 10, cooldown: 500, projectiles: 1, spread: 0, type: 'bullet', color: '#00ff00' },
  { name: 'Shotgun', damage: 8, cooldown: 800, projectiles: 5, spread: 30, type: 'bullet', color: '#ffaa00' },
  { name: 'Minigun', damage: 5, cooldown: 100, projectiles: 1, spread: 15, type: 'bullet', color: '#ff0000' },
  { name: 'Laser Beam', damage: 15, cooldown: 200, projectiles: 1, spread: 0, type: 'laser', color: '#ff0000' },
  { name: 'Plasma Rifle', damage: 20, cooldown: 600, projectiles: 1, spread: 0, type: 'plasma', color: '#00ffff' },
  { name: 'Railgun', damage: 50, cooldown: 1500, projectiles: 1, spread: 0, type: 'rail', pierce: 10, color: '#0088ff' },
  { name: 'Rocket Launcher', damage: 40, cooldown: 1200, projectiles: 1, spread: 0, type: 'rocket', explosive: true, color: '#ff4400' },
  { name: 'Lightning Cannon', damage: 30, cooldown: 800, projectiles: 1, spread: 0, type: 'chain', chains: 5, color: '#ffff00' },
  { name: 'Homing Missiles', damage: 15, cooldown: 400, projectiles: 3, spread: 45, type: 'homing', color: '#ff00ff' },
  { name: 'Scatter Rail', damage: 35, cooldown: 1000, projectiles: 7, spread: 60, type: 'rail', pierce: 3, color: '#00aaff' },
  { name: 'Tesla Arc', damage: 12, cooldown: 300, projectiles: 1, spread: 0, type: 'chain', chains: 8, color: '#88ffff' },
  { name: 'Ion Storm', damage: 5, cooldown: 150, projectiles: 8, spread: 360, type: 'bullet', color: '#4488ff' },
  { name: 'Gravity Imploder', damage: 60, cooldown: 2000, projectiles: 1, spread: 0, type: 'gravity', color: '#8800ff' },
  { name: 'Nanobot Swarm', damage: 3, cooldown: 50, projectiles: 5, spread: 180, type: 'homing', color: '#888888' },
  { name: 'Cryo Beam', damage: 10, cooldown: 150, projectiles: 1, spread: 0, type: 'laser', slow: true, color: '#88ddff' },
];

const magicWeapons: Weapon[] = [
  { name: 'Fireball', damage: 15, cooldown: 600, projectiles: 1, spread: 0, type: 'fire', explosive: true, color: '#ff4400' },
  { name: 'Ice Shard', damage: 12, cooldown: 400, projectiles: 3, spread: 15, type: 'ice', slow: true, color: '#88ddff' },
  { name: 'Arcane Bolt', damage: 10, cooldown: 300, projectiles: 1, spread: 0, type: 'arcane', color: '#aa00ff' },
  { name: 'Chain Lightning', damage: 20, cooldown: 700, projectiles: 1, spread: 0, type: 'chain', chains: 6, color: '#ffff00' },
  { name: 'Meteor Strike', damage: 60, cooldown: 2000, projectiles: 1, spread: 0, type: 'meteor', explosive: true, color: '#ff2200' },
  { name: 'Poison Cloud', damage: 5, cooldown: 1000, projectiles: 1, spread: 0, type: 'poison', color: '#44ff00' },
  { name: 'Spirit Orb', damage: 8, cooldown: 200, projectiles: 2, spread: 0, type: 'orbital', color: '#88ffff' },
  { name: 'Shadow Beam', damage: 25, cooldown: 500, projectiles: 1, spread: 0, type: 'laser', pierce: 5, color: '#440066' },
  { name: 'Holy Nova', damage: 30, cooldown: 1500, projectiles: 8, spread: 360, type: 'holy', color: '#ffffaa' },
  { name: 'Wind Blade', damage: 18, cooldown: 350, projectiles: 2, spread: 10, type: 'wind', pierce: 3, color: '#aaffaa' },
  { name: 'Fire Serpent', damage: 12, cooldown: 400, projectiles: 1, spread: 0, type: 'homing', color: '#ff6600' },
  { name: 'Frost Comet', damage: 40, cooldown: 1200, projectiles: 1, spread: 0, type: 'ice', explosive: true, slow: true, color: '#66ddff' },
  { name: 'Arcane Spiral', damage: 8, cooldown: 250, projectiles: 4, spread: 90, type: 'arcane', color: '#cc44ff' },
  { name: 'Blood Nova', damage: 25, cooldown: 1000, projectiles: 6, spread: 360, type: 'blood', lifesteal: true, color: '#880000' },
  { name: 'Spirit Lance', damage: 45, cooldown: 1100, projectiles: 1, spread: 0, type: 'spirit', pierce: 10, color: '#aaffff' },
];

// Enemy Definitions
const enemyTypes = [
  { name: 'Walker', hp: 30, speed: 60, damage: 10, color: '#00ff00', size: 20, xpValue: 5 },
  { name: 'Runner', hp: 20, speed: 120, damage: 8, color: '#88ff00', size: 16, xpValue: 7 },
  { name: 'Tank', hp: 150, speed: 40, damage: 20, color: '#008800', size: 30, xpValue: 15 },
  { name: 'Swarmer', hp: 10, speed: 90, damage: 5, color: '#aaff00', size: 10, xpValue: 2 },
  { name: 'Charger', hp: 40, speed: 50, damage: 25, color: '#ff4400', size: 22, xpValue: 10 },
  { name: 'Spitter', hp: 25, speed: 50, damage: 15, color: '#00ffaa', size: 18, xpValue: 8 },
  { name: 'Bomber', hp: 35, speed: 70, damage: 30, color: '#ff0000', size: 20, xpValue: 12 },
  { name: 'Shielded', hp: 60, speed: 55, damage: 12, color: '#4444ff', size: 24, xpValue: 10 },
  { name: 'Teleporter', hp: 30, speed: 40, damage: 15, color: '#aa00ff', size: 18, xpValue: 12 },
  { name: 'Drone', hp: 20, speed: 100, damage: 8, color: '#aaaaaa', size: 14, xpValue: 6 },
];

const Game = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [searchParams] = useSearchParams();
  const [showModeSelect, setShowModeSelect] = useState(true);
  const [showUpgradeMenu, setShowUpgradeMenu] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [upgradeOptions, setUpgradeOptions] = useState<Upgrade[]>([]);
  
  // Game state refs
  const gameStateRef = useRef<GameState>({
    mode: null,
    wave: 1,
    waveTimer: 30,
    timeElapsed: 0,
    isPaused: false,
    gameOver: false,
    score: 0,
    kills: 0,
  });
  
  const playerStatsRef = useRef<PlayerStats>({
    maxHP: 100,
    currentHP: 100,
    moveSpeed: 200,
    attackSpeed: 1,
    projectileSpeed: 400,
    projectileAmount: 1,
    damage: 10,
    pickupRange: 100,
    critChance: 0.05,
    critMultiplier: 2,
    armor: 0,
    regen: 0,
    xpMultiplier: 1,
    pierce: 0,
    bounce: 0,
    chain: 0,
    explosionChance: 0,
    aoeSize: 1,
    guardian: false,
    apocalypse: false,
    doubleFire: false,
    timeWarp: 0,
    lifesteal: 0,
    stationaryBonus: 0,
    movingDamage: 0,
    rampageBonus: 0,
  });
  
  const xpStateRef = useRef<XPState>({
    current: 0,
    required: 20,
    level: 1,
  });
  
  const playerPosRef = useRef({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 });
  const cameraPosRef = useRef({ x: 0, y: 0 });
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const weaponsRef = useRef<Weapon[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const xpOrbsRef = useRef<XPOrb[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const lastFiredRef = useRef<{ [key: number]: number }>({});
  const spawnTimerRef = useRef(0);
  const waveTimerRef = useRef(0);
  const invulnerableRef = useRef(false);
  const idCounterRef = useRef(0);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef(0);
  
  const getId = () => ++idCounterRef.current;

  const resetGame = useCallback((mode: 'futuristic' | 'magic') => {
    initAudio();
    
    gameStateRef.current = {
      mode,
      wave: 1,
      waveTimer: 30,
      timeElapsed: 0,
      isPaused: false,
      gameOver: false,
      score: 0,
      kills: 0,
    };
    
    playerStatsRef.current = {
      maxHP: 100,
      currentHP: 100,
      moveSpeed: 200,
      attackSpeed: 1,
      projectileSpeed: 400,
      projectileAmount: 1,
      damage: 10,
      pickupRange: 100,
      critChance: 0.05,
      critMultiplier: 2,
      armor: 0,
      regen: 0,
      xpMultiplier: 1,
      pierce: 0,
      bounce: 0,
      chain: 0,
      explosionChance: 0,
      aoeSize: 1,
      guardian: false,
      apocalypse: false,
      doubleFire: false,
      timeWarp: 0,
      lifesteal: 0,
      stationaryBonus: 0,
      movingDamage: 0,
      rampageBonus: 0,
    };
    
    xpStateRef.current = { current: 0, required: 20, level: 1 };
    playerPosRef.current = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
    enemiesRef.current = [];
    projectilesRef.current = [];
    xpOrbsRef.current = [];
    floatingTextsRef.current = [];
    lastFiredRef.current = {};
    spawnTimerRef.current = 0;
    waveTimerRef.current = 0;
    
    const weaponPool = mode === 'futuristic' ? futuristicWeapons : magicWeapons;
    weaponsRef.current = [{ ...weaponPool[0] }];
    
    setShowModeSelect(false);
    setShowGameOver(false);
    setShowUpgradeMenu(false);
  }, []);

  // Check for mode in URL params
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'futuristic' || mode === 'magic') {
      resetGame(mode);
    }
  }, [searchParams, resetGame]);

  const addFloatingText = (x: number, y: number, text: string, color: string) => {
    floatingTextsRef.current.push({
      id: getId(),
      x: x - cameraPosRef.current.x,
      y: y - cameraPosRef.current.y,
      text,
      color,
      opacity: 1,
    });
  };

  const spawnEnemy = () => {
    const gs = gameStateRef.current;
    const availableTypes = enemyTypes.slice(0, Math.min(gs.wave + 2, enemyTypes.length));
    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    
    const angle = Math.random() * Math.PI * 2;
    const distance = 400 + Math.random() * 200;
    
    let x = playerPosRef.current.x + Math.cos(angle) * distance;
    let y = playerPosRef.current.y + Math.sin(angle) * distance;
    
    x = Math.max(50, Math.min(MAP_WIDTH - 50, x));
    y = Math.max(50, Math.min(MAP_HEIGHT - 50, y));
    
    const hpScale = (1 + gs.timeElapsed / 60) * Math.pow(1.1, gs.wave);
    
    enemiesRef.current.push({
      id: getId(),
      x,
      y,
      hp: Math.floor(type.hp * hpScale),
      maxHp: Math.floor(type.hp * hpScale),
      speed: type.speed * (1 - playerStatsRef.current.timeWarp),
      damage: type.damage,
      size: type.size,
      color: type.color,
      xpValue: type.xpValue,
      slowTimer: 0,
      type: type.name,
    });
  };

  const fireWeapons = (time: number) => {
    const ps = playerStatsRef.current;
    const enemies = enemiesRef.current;
    if (enemies.length === 0) return;
    
    // Find nearest enemy
    let nearest = enemies[0];
    let nearestDist = Infinity;
    for (const enemy of enemies) {
      const dist = Math.hypot(enemy.x - playerPosRef.current.x, enemy.y - playerPosRef.current.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }
    
    const attackSpeedMod = ps.attackSpeed * (keysRef.current.moving ? 1 : 1 + ps.stationaryBonus);
    
    weaponsRef.current.forEach((weapon, index) => {
      const cooldown = weapon.cooldown / attackSpeedMod;
      if (!lastFiredRef.current[index] || time > lastFiredRef.current[index] + cooldown) {
        const totalProjectiles = weapon.projectiles + ps.projectileAmount - 1;
        const baseAngle = Math.atan2(
          nearest.y - playerPosRef.current.y,
          nearest.x - playerPosRef.current.x
        );
        
        playSound('shoot');
        
        for (let i = 0; i < totalProjectiles; i++) {
          let angle = baseAngle;
          
          if (totalProjectiles > 1 && weapon.spread > 0) {
            if (weapon.spread === 360) {
              angle = (Math.PI * 2 / totalProjectiles) * i;
            } else {
              const spreadRad = weapon.spread * Math.PI / 180;
              const offset = (i - (totalProjectiles - 1) / 2) * (spreadRad / (totalProjectiles - 1));
              angle += offset;
            }
          }
          
          projectilesRef.current.push({
            id: getId(),
            x: playerPosRef.current.x,
            y: playerPosRef.current.y,
            vx: Math.cos(angle) * ps.projectileSpeed,
            vy: Math.sin(angle) * ps.projectileSpeed,
            damage: (weapon.damage + ps.damage) * (keysRef.current.moving ? 1 + ps.movingDamage : 1),
            color: weapon.color,
            pierce: (weapon.pierce || 0) + ps.pierce,
            hitEnemies: [],
            explosive: weapon.explosive || Math.random() < ps.explosionChance,
          });
        }
        
        lastFiredRef.current[index] = time;
      }
    });
  };

  const generateUpgradeOptions = (): Upgrade[] => {
    const options: Upgrade[] = [];
    const weaponPool = gameStateRef.current.mode === 'futuristic' ? futuristicWeapons : magicWeapons;
    
    const statUpgrades: Upgrade[] = [
      { name: 'Max HP +20', stat: 'maxHP', value: 20, rarity: 'common' },
      { name: 'Move Speed +15', stat: 'moveSpeed', value: 15, rarity: 'common' },
      { name: 'Attack Speed +10%', stat: 'attackSpeed', value: 0.1, rarity: 'common', percent: true },
      { name: 'Damage +5', stat: 'damage', value: 5, rarity: 'common' },
      { name: 'Pickup Range +30', stat: 'pickupRange', value: 30, rarity: 'common' },
      { name: 'Crit Chance +5%', stat: 'critChance', value: 0.05, rarity: 'uncommon' },
      { name: 'Projectile Amount +1', stat: 'projectileAmount', value: 1, rarity: 'rare' },
      { name: 'Pierce +1', stat: 'pierce', value: 1, rarity: 'rare' },
      { name: 'XP Bonus +20%', stat: 'xpMultiplier', value: 0.2, rarity: 'uncommon', percent: true },
    ];
    
    for (let i = 0; i < 3; i++) {
      const roll = Math.random();
      
      // 10% chance for weapon
      if (roll < 0.1 && weaponsRef.current.length < weaponPool.length) {
        const available = weaponPool.filter(w => !weaponsRef.current.some(pw => pw.name === w.name));
        if (available.length > 0) {
          const weapon = available[Math.floor(Math.random() * available.length)];
          options.push({
            name: `New: ${weapon.name}`,
            description: `Add ${weapon.name} to your arsenal`,
            type: 'weapon',
            weapon,
            rarity: 'rare',
          });
          continue;
        }
      }
      
      // Stat upgrade
      const rarityRoll = Math.random();
      let pool: Upgrade[];
      if (rarityRoll < 0.6) {
        pool = statUpgrades.filter(u => u.rarity === 'common');
      } else if (rarityRoll < 0.85) {
        pool = statUpgrades.filter(u => u.rarity === 'uncommon');
      } else {
        pool = statUpgrades.filter(u => u.rarity === 'rare');
      }
      
      options.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    
    return options;
  };

  const applyUpgrade = (upgrade: Upgrade) => {
    if (upgrade.type === 'weapon' && upgrade.weapon) {
      weaponsRef.current.push({ ...upgrade.weapon });
    } else if (upgrade.stat && upgrade.value !== undefined) {
      const stats = playerStatsRef.current;
      if (upgrade.percent) {
        (stats as any)[upgrade.stat] *= (1 + upgrade.value);
      } else {
        (stats as any)[upgrade.stat] += upgrade.value;
      }
      if (upgrade.stat === 'maxHP') {
        stats.currentHP += upgrade.value;
      }
    }
    
    playSound('levelup');
    setShowUpgradeMenu(false);
    gameStateRef.current.isPaused = false;
  };

  // Game loop
  useEffect(() => {
    if (showModeSelect || showGameOver) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let lastWaveTime = 0;
    
    const gameLoop = (time: number) => {
      const gs = gameStateRef.current;
      const ps = playerStatsRef.current;
      const xp = xpStateRef.current;
      
      if (gs.isPaused || gs.gameOver) {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      
      const delta = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0.016;
      lastTimeRef.current = time;
      
      // Wave timer
      if (time - lastWaveTime >= 1000) {
        lastWaveTime = time;
        gs.timeElapsed++;
        gs.waveTimer--;
        
        if (ps.regen > 0) {
          ps.currentHP = Math.min(ps.maxHP, ps.currentHP + ps.regen);
        }
        
        if (gs.waveTimer <= 0) {
          gs.wave++;
          gs.waveTimer = 30;
        }
      }
      
      // Player movement
      const keys = keysRef.current;
      let vx = 0, vy = 0;
      if (keys['w'] || keys['arrowup']) vy -= 1;
      if (keys['s'] || keys['arrowdown']) vy += 1;
      if (keys['a'] || keys['arrowleft']) vx -= 1;
      if (keys['d'] || keys['arrowright']) vx += 1;
      
      if (vx !== 0 || vy !== 0) {
        const len = Math.hypot(vx, vy);
        vx = (vx / len) * ps.moveSpeed * delta;
        vy = (vy / len) * ps.moveSpeed * delta;
        playerPosRef.current.x = Math.max(20, Math.min(MAP_WIDTH - 20, playerPosRef.current.x + vx));
        playerPosRef.current.y = Math.max(20, Math.min(MAP_HEIGHT - 20, playerPosRef.current.y + vy));
        keys.moving = true;
      } else {
        keys.moving = false;
      }
      
      // Camera
      cameraPosRef.current.x = playerPosRef.current.x - GAME_WIDTH / 2;
      cameraPosRef.current.y = playerPosRef.current.y - GAME_HEIGHT / 2;
      cameraPosRef.current.x = Math.max(0, Math.min(MAP_WIDTH - GAME_WIDTH, cameraPosRef.current.x));
      cameraPosRef.current.y = Math.max(0, Math.min(MAP_HEIGHT - GAME_HEIGHT, cameraPosRef.current.y));
      
      // Spawn enemies
      spawnTimerRef.current += delta * 1000;
      const spawnInterval = Math.max(200, 1000 - gs.wave * 50);
      if (spawnTimerRef.current >= spawnInterval) {
        spawnTimerRef.current = 0;
        const spawnCount = Math.min(5, 1 + Math.floor(gs.wave / 3));
        for (let i = 0; i < spawnCount; i++) {
          spawnEnemy();
        }
      }
      
      // Fire weapons
      fireWeapons(time);
      
      // Update projectiles
      projectilesRef.current = projectilesRef.current.filter(proj => {
        proj.x += proj.vx * delta;
        proj.y += proj.vy * delta;
        
        // Out of bounds
        if (proj.x < 0 || proj.x > MAP_WIDTH || proj.y < 0 || proj.y > MAP_HEIGHT) {
          return false;
        }
        
        // Check enemy hits
        for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
          const enemy = enemiesRef.current[i];
          if (proj.hitEnemies.includes(enemy.id)) continue;
          
          const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
          if (dist < enemy.size + 4) {
            proj.hitEnemies.push(enemy.id);
            
            let damage = proj.damage;
            const isCrit = Math.random() < ps.critChance;
            if (isCrit) {
              damage *= ps.critMultiplier;
              addFloatingText(enemy.x, enemy.y - 20, `${Math.floor(damage)}!`, '#ffff00');
            }
            
            enemy.hp -= damage;
            playSound('hit');
            
            if (enemy.hp <= 0) {
              playSound('kill');
              gs.kills++;
              
              // Drop XP
              const xpCount = Math.ceil(enemy.xpValue / 5);
              for (let j = 0; j < xpCount; j++) {
                xpOrbsRef.current.push({
                  id: getId(),
                  x: enemy.x + (Math.random() - 0.5) * 30,
                  y: enemy.y + (Math.random() - 0.5) * 30,
                  value: 5 * ps.xpMultiplier,
                });
              }
              
              if (proj.explosive) {
                playSound('explosion');
              }
              
              enemiesRef.current.splice(i, 1);
            }
            
            if (proj.pierce <= 0) {
              return false;
            }
            proj.pierce--;
          }
        }
        
        return true;
      });
      
      // Update enemies
      for (const enemy of enemiesRef.current) {
        const angle = Math.atan2(playerPosRef.current.y - enemy.y, playerPosRef.current.x - enemy.x);
        const speed = enemy.speed * (enemy.slowTimer > 0 ? 0.5 : 1) * delta;
        enemy.x += Math.cos(angle) * speed;
        enemy.y += Math.sin(angle) * speed;
        
        if (enemy.slowTimer > 0) enemy.slowTimer -= delta * 1000;
        
        // Player collision
        const distToPlayer = Math.hypot(playerPosRef.current.x - enemy.x, playerPosRef.current.y - enemy.y);
        if (distToPlayer < enemy.size + 16 && !invulnerableRef.current) {
          const damage = Math.max(1, enemy.damage - ps.armor);
          ps.currentHP -= damage;
          playSound('hurt');
          addFloatingText(playerPosRef.current.x, playerPosRef.current.y - 30, `-${damage}`, '#ff0000');
          
          invulnerableRef.current = true;
          setTimeout(() => { invulnerableRef.current = false; }, 500);
          
          if (ps.currentHP <= 0) {
            gs.gameOver = true;
            setShowGameOver(true);
          }
        }
      }
      
      // Collect XP
      xpOrbsRef.current = xpOrbsRef.current.filter(orb => {
        const dist = Math.hypot(playerPosRef.current.x - orb.x, playerPosRef.current.y - orb.y);
        
        // Magnet
        if (dist < ps.pickupRange) {
          const angle = Math.atan2(playerPosRef.current.y - orb.y, playerPosRef.current.x - orb.x);
          orb.x += Math.cos(angle) * 300 * delta;
          orb.y += Math.sin(angle) * 300 * delta;
        }
        
        // Collect
        if (dist < 20) {
          playSound('pickup');
          xp.current += orb.value;
          
          while (xp.current >= xp.required) {
            xp.current -= xp.required;
            xp.level++;
            xp.required = Math.floor(xp.required * (xp.level < 10 ? 1.2 : 1.4));
            
            playSound('levelup');
            const options = generateUpgradeOptions();
            setUpgradeOptions(options);
            setShowUpgradeMenu(true);
            gs.isPaused = true;
          }
          
          return false;
        }
        
        return true;
      });
      
      // Update floating texts
      floatingTextsRef.current = floatingTextsRef.current.filter(text => {
        text.y -= 50 * delta;
        text.opacity -= delta;
        return text.opacity > 0;
      });
      
      // Draw
      ctx.fillStyle = '#111122';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      
      // Grid
      ctx.strokeStyle = '#222244';
      ctx.lineWidth = 1;
      const offsetX = -cameraPosRef.current.x % 50;
      const offsetY = -cameraPosRef.current.y % 50;
      for (let x = offsetX; x < GAME_WIDTH; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, GAME_HEIGHT);
        ctx.stroke();
      }
      for (let y = offsetY; y < GAME_HEIGHT; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(GAME_WIDTH, y);
        ctx.stroke();
      }
      
      // Border
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 4;
      ctx.strokeRect(
        -cameraPosRef.current.x,
        -cameraPosRef.current.y,
        MAP_WIDTH,
        MAP_HEIGHT
      );
      
      // XP orbs
      ctx.fillStyle = '#00ff00';
      for (const orb of xpOrbsRef.current) {
        ctx.beginPath();
        ctx.arc(orb.x - cameraPosRef.current.x, orb.y - cameraPosRef.current.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Projectiles
      for (const proj of projectilesRef.current) {
        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(proj.x - cameraPosRef.current.x, proj.y - cameraPosRef.current.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Enemies
      for (const enemy of enemiesRef.current) {
        ctx.fillStyle = enemy.slowTimer > 0 ? '#88ddff' : enemy.color;
        ctx.beginPath();
        ctx.arc(enemy.x - cameraPosRef.current.x, enemy.y - cameraPosRef.current.y, enemy.size, 0, Math.PI * 2);
        ctx.fill();
        
        // HP bar
        const hpPercent = enemy.hp / enemy.maxHp;
        ctx.fillStyle = '#333';
        ctx.fillRect(enemy.x - cameraPosRef.current.x - 15, enemy.y - cameraPosRef.current.y - enemy.size - 10, 30, 4);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(enemy.x - cameraPosRef.current.x - 15, enemy.y - cameraPosRef.current.y - enemy.size - 10, 30 * hpPercent, 4);
      }
      
      // Player
      ctx.fillStyle = invulnerableRef.current ? '#ff4444' : '#4488ff';
      ctx.beginPath();
      ctx.arc(playerPosRef.current.x - cameraPosRef.current.x, playerPosRef.current.y - cameraPosRef.current.y, 16, 0, Math.PI * 2);
      ctx.fill();
      
      // Floating texts
      for (const text of floatingTextsRef.current) {
        ctx.globalAlpha = text.opacity;
        ctx.fillStyle = text.color;
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(text.text, text.x + GAME_WIDTH / 2, text.y + GAME_HEIGHT / 2);
      }
      ctx.globalAlpha = 1;
      
      // UI
      // HP Bar
      ctx.fillStyle = '#333';
      ctx.fillRect(GAME_WIDTH / 2 - 150, 20, 300, 20);
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(GAME_WIDTH / 2 - 148, 22, 296 * (ps.currentHP / ps.maxHP), 16);
      
      // XP Bar
      ctx.fillStyle = '#333';
      ctx.fillRect(GAME_WIDTH / 2 - 150, 45, 300, 12);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(GAME_WIDTH / 2 - 148, 47, 296 * (xp.current / xp.required), 8);
      
      // Text
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Level: ${xp.level}`, 16, 30);
      ctx.fillText(`Wave: ${gs.wave} (${gs.waveTimer}s)`, 16, 55);
      ctx.fillText(`Time: ${Math.floor(gs.timeElapsed / 60)}:${(gs.timeElapsed % 60).toString().padStart(2, '0')}`, 16, 80);
      
      ctx.textAlign = 'right';
      ctx.fillText(`Kills: ${gs.kills}`, GAME_WIDTH - 16, 30);
      ctx.fillStyle = '#88ff88';
      ctx.fillText(`Weapons: ${weaponsRef.current.length}`, GAME_WIDTH - 16, 55);
      
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [showModeSelect, showGameOver, showUpgradeMenu]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      {/* Mode Selection */}
      {showModeSelect && (
        <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-6">
          <div className="text-center max-w-lg">
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors">
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
            
            <h1 className="font-display text-5xl font-black text-primary text-glow-primary mb-4">SURVIVOR</h1>
            <p className="text-muted-foreground mb-8">Choose Your Weapon Mode</p>
            
            <div className="space-y-4">
              <button
                onClick={() => resetGame('futuristic')}
                className="w-full py-4 px-6 rounded-lg gradient-primary text-primary-foreground font-display font-bold text-lg glow-primary hover:scale-105 transition-transform"
              >
                ⚡ FUTURISTIC WEAPONS
              </button>
              <button
                onClick={() => resetGame('magic')}
                className="w-full py-4 px-6 rounded-lg gradient-secondary text-secondary-foreground font-display font-bold text-lg glow-secondary hover:scale-105 transition-transform"
              >
                ✨ MAGIC SPELLS
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Upgrade Menu */}
      {showUpgradeMenu && (
        <div className="fixed inset-0 bg-background/90 z-50 flex items-center justify-center p-6">
          <div className="text-center max-w-2xl">
            <h2 className="font-display text-4xl font-bold text-accent text-glow-accent mb-8">LEVEL UP!</h2>
            
            <div className="flex flex-wrap justify-center gap-4">
              {upgradeOptions.map((upgrade, i) => (
                <button
                  key={i}
                  onClick={() => applyUpgrade(upgrade)}
                  className={`w-48 p-4 rounded-xl border-2 text-left transition-all hover:scale-105 ${
                    upgrade.rarity === 'legendary' ? 'border-accent bg-accent/10 glow-accent' :
                    upgrade.rarity === 'rare' ? 'border-secondary bg-secondary/10' :
                    upgrade.rarity === 'uncommon' ? 'border-primary bg-primary/10' :
                    'border-border bg-card'
                  }`}
                >
                  <h3 className="font-display font-bold text-foreground mb-2">{upgrade.name}</h3>
                  <p className="text-sm text-muted-foreground">{upgrade.description || upgrade.name}</p>
                  <p className={`text-xs uppercase mt-2 ${
                    upgrade.rarity === 'legendary' ? 'text-accent' :
                    upgrade.rarity === 'rare' ? 'text-secondary' :
                    upgrade.rarity === 'uncommon' ? 'text-primary' :
                    'text-muted-foreground'
                  }`}>{upgrade.rarity}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Game Over */}
      {showGameOver && (
        <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-6">
          <div className="text-center">
            <h1 className="font-display text-5xl font-black text-destructive mb-6">GAME OVER</h1>
            
            <div className="text-lg text-muted-foreground space-y-2 mb-8">
              <p>Time: {Math.floor(gameStateRef.current.timeElapsed / 60)}:{(gameStateRef.current.timeElapsed % 60).toString().padStart(2, '0')}</p>
              <p>Wave: {gameStateRef.current.wave}</p>
              <p>Kills: {gameStateRef.current.kills}</p>
              <p>Level: {xpStateRef.current.level}</p>
            </div>
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowModeSelect(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-card border border-border text-foreground font-display font-bold hover:border-primary transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                Play Again
              </button>
              <Link
                to="/"
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-card border border-border text-foreground font-display font-bold hover:border-primary transition-colors"
              >
                <Home className="w-5 h-5" />
                Home
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        className="border-2 border-border rounded-lg max-w-full"
        style={{ maxHeight: '90vh', objectFit: 'contain' }}
      />
      
      {/* Controls hint */}
      {!showModeSelect && !showGameOver && !showUpgradeMenu && (
        <div className="mt-4 text-muted-foreground text-sm">
          Use <kbd className="px-2 py-1 bg-card rounded border border-border">W A S D</kbd> or Arrow keys to move
        </div>
      )}
    </div>
  );
};

export default Game;
