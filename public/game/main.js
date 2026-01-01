// ===========================
// SURVIVOR - AUTO-SHOOTER ROGUELIKE
// ===========================

// Game Configuration
var GAME_WIDTH = 1280;
var GAME_HEIGHT = 720;
var MAP_WIDTH = 2000;
var MAP_HEIGHT = 2000;

// Global State
var gameState = {
    mode: null,
    wave: 1,
    waveTimer: 30,
    timeElapsed: 0,
    isPaused: false,
    gameOver: false,
    score: 0,
    kills: 0
};

// Player Stats (all support infinite stacking)
var playerStats = {
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
    aoeSize: 1
};

// XP and Leveling
var xpState = {
    current: 0,
    required: 20,
    level: 1
};

// Audio Context for SFX
var audioCtx = null;

function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type) {
    if (!audioCtx) return;
    
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    var now = audioCtx.currentTime;
    
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
        case 'laser':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(1500, now);
            osc.frequency.exponentialRampToValueAtTime(500, now + 0.15);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
            break;
        case 'magic':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.setValueAtTime(500, now + 0.05);
            osc.frequency.setValueAtTime(400, now + 0.1);
            osc.frequency.setValueAtTime(600, now + 0.15);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
            break;
        case 'crit':
            osc.type = 'square';
            osc.frequency.setValueAtTime(1000, now);
            osc.frequency.exponentialRampToValueAtTime(2000, now + 0.05);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
    }
}

// ===========================
// WEAPON DEFINITIONS
// ===========================

var futuristicWeapons = [
    // Original 10
    { name: 'Pistol', damage: 10, cooldown: 500, projectiles: 1, spread: 0, type: 'bullet', color: 0x00ff00, sound: 'shoot' },
    { name: 'Shotgun', damage: 8, cooldown: 800, projectiles: 5, spread: 30, type: 'bullet', color: 0xffaa00, sound: 'shoot' },
    { name: 'Minigun', damage: 5, cooldown: 100, projectiles: 1, spread: 15, type: 'bullet', color: 0xff0000, sound: 'shoot' },
    { name: 'Laser Beam', damage: 15, cooldown: 200, projectiles: 1, spread: 0, type: 'laser', color: 0xff0000, sound: 'laser' },
    { name: 'Plasma Rifle', damage: 20, cooldown: 600, projectiles: 1, spread: 0, type: 'plasma', color: 0x00ffff, sound: 'laser' },
    { name: 'Railgun', damage: 50, cooldown: 1500, projectiles: 1, spread: 0, type: 'rail', pierce: 10, color: 0x0088ff, sound: 'laser' },
    { name: 'Rocket Launcher', damage: 40, cooldown: 1200, projectiles: 1, spread: 0, type: 'rocket', explosive: true, color: 0xff4400, sound: 'explosion' },
    { name: 'Orbital Blade', damage: 25, cooldown: 50, projectiles: 2, spread: 0, type: 'orbital', color: 0xffffff, sound: 'shoot' },
    { name: 'Lightning Cannon', damage: 30, cooldown: 800, projectiles: 1, spread: 0, type: 'chain', chains: 5, color: 0xffff00, sound: 'laser' },
    { name: 'Homing Missiles', damage: 15, cooldown: 400, projectiles: 3, spread: 45, type: 'homing', color: 0xff00ff, sound: 'shoot' },
    
    // 20 Additional Futuristic Weapons
    { name: 'Scatter Rail', damage: 35, cooldown: 1000, projectiles: 7, spread: 60, type: 'rail', pierce: 3, color: 0x00aaff, sound: 'laser' },
    { name: 'Plasma Saw', damage: 8, cooldown: 80, projectiles: 1, spread: 0, type: 'orbital', color: 0x00ff88, sound: 'laser' },
    { name: 'Tesla Arc', damage: 12, cooldown: 300, projectiles: 1, spread: 0, type: 'chain', chains: 8, color: 0x88ffff, sound: 'laser' },
    { name: 'Ion Storm', damage: 5, cooldown: 150, projectiles: 8, spread: 360, type: 'bullet', color: 0x4488ff, sound: 'shoot' },
    { name: 'Gravity Imploder', damage: 60, cooldown: 2000, projectiles: 1, spread: 0, type: 'gravity', color: 0x8800ff, sound: 'explosion' },
    { name: 'Nanobot Swarm', damage: 3, cooldown: 50, projectiles: 5, spread: 180, type: 'homing', color: 0x888888, sound: 'shoot' },
    { name: 'Cryo Beam', damage: 10, cooldown: 150, projectiles: 1, spread: 0, type: 'laser', slow: true, color: 0x88ddff, sound: 'laser' },
    { name: 'Fusion Burst', damage: 45, cooldown: 1400, projectiles: 1, spread: 0, type: 'plasma', explosive: true, color: 0xffff00, sound: 'explosion' },
    { name: 'Hyper Rail', damage: 80, cooldown: 2500, projectiles: 1, spread: 0, type: 'rail', pierce: 20, color: 0xff00aa, sound: 'laser' },
    { name: 'Quantum Splitter', damage: 25, cooldown: 700, projectiles: 2, spread: 0, type: 'split', color: 0xaa00ff, sound: 'laser' },
    { name: 'Pulse Mine', damage: 35, cooldown: 1000, projectiles: 3, spread: 120, type: 'mine', color: 0xff8800, sound: 'explosion' },
    { name: 'Overcharge Coil', damage: 40, cooldown: 1100, projectiles: 1, spread: 0, type: 'chain', chains: 12, color: 0xffff88, sound: 'laser' },
    { name: 'Photon Scatter', damage: 6, cooldown: 200, projectiles: 12, spread: 360, type: 'bullet', color: 0xffffaa, sound: 'shoot' },
    { name: 'EMP Pulse', damage: 20, cooldown: 900, projectiles: 1, spread: 0, type: 'emp', color: 0x0044ff, sound: 'laser' },
    { name: 'Void Accelerator', damage: 55, cooldown: 1600, projectiles: 1, spread: 0, type: 'void', color: 0x220044, sound: 'explosion' },
    { name: 'Arc Blaster', damage: 18, cooldown: 350, projectiles: 3, spread: 20, type: 'chain', chains: 3, color: 0x00ffff, sound: 'laser' },
    { name: 'Micro-Missile Barrage', damage: 8, cooldown: 300, projectiles: 8, spread: 90, type: 'homing', color: 0xffaaaa, sound: 'shoot' },
    { name: 'Plasma Chain', damage: 22, cooldown: 550, projectiles: 1, spread: 0, type: 'chain', chains: 6, color: 0x00ffaa, sound: 'laser' },
    { name: 'Rail Nova', damage: 30, cooldown: 1200, projectiles: 8, spread: 360, type: 'rail', pierce: 5, color: 0xaaaaff, sound: 'laser' },
    { name: 'Singularity Core', damage: 100, cooldown: 3000, projectiles: 1, spread: 0, type: 'gravity', explosive: true, color: 0x000000, sound: 'explosion' }
];

var magicWeapons = [
    // Original 10
    { name: 'Fireball', damage: 15, cooldown: 600, projectiles: 1, spread: 0, type: 'fire', explosive: true, color: 0xff4400, sound: 'magic' },
    { name: 'Ice Shard', damage: 12, cooldown: 400, projectiles: 3, spread: 15, type: 'ice', slow: true, color: 0x88ddff, sound: 'magic' },
    { name: 'Arcane Bolt', damage: 10, cooldown: 300, projectiles: 1, spread: 0, type: 'arcane', color: 0xaa00ff, sound: 'magic' },
    { name: 'Chain Lightning', damage: 20, cooldown: 700, projectiles: 1, spread: 0, type: 'chain', chains: 6, color: 0xffff00, sound: 'laser' },
    { name: 'Meteor Strike', damage: 60, cooldown: 2000, projectiles: 1, spread: 0, type: 'meteor', explosive: true, color: 0xff2200, sound: 'explosion' },
    { name: 'Poison Cloud', damage: 5, cooldown: 1000, projectiles: 1, spread: 0, type: 'poison', dot: true, color: 0x44ff00, sound: 'magic' },
    { name: 'Spirit Orb', damage: 8, cooldown: 200, projectiles: 2, spread: 0, type: 'orbital', color: 0x88ffff, sound: 'magic' },
    { name: 'Shadow Beam', damage: 25, cooldown: 500, projectiles: 1, spread: 0, type: 'laser', pierce: 5, color: 0x440066, sound: 'laser' },
    { name: 'Holy Nova', damage: 30, cooldown: 1500, projectiles: 8, spread: 360, type: 'holy', color: 0xffffaa, sound: 'magic' },
    { name: 'Wind Blade', damage: 18, cooldown: 350, projectiles: 2, spread: 10, type: 'wind', pierce: 3, color: 0xaaffaa, sound: 'shoot' },
    
    // 20 Additional Magic Weapons
    { name: 'Fire Serpent', damage: 12, cooldown: 400, projectiles: 1, spread: 0, type: 'homing', color: 0xff6600, sound: 'magic' },
    { name: 'Frost Comet', damage: 40, cooldown: 1200, projectiles: 1, spread: 0, type: 'ice', explosive: true, slow: true, color: 0x66ddff, sound: 'explosion' },
    { name: 'Arcane Spiral', damage: 8, cooldown: 250, projectiles: 4, spread: 90, type: 'arcane', color: 0xcc44ff, sound: 'magic' },
    { name: 'Chaos Bolt', damage: 35, cooldown: 800, projectiles: 1, spread: 0, type: 'chaos', color: 0xff00ff, sound: 'magic' },
    { name: 'Blood Nova', damage: 25, cooldown: 1000, projectiles: 6, spread: 360, type: 'blood', lifesteal: true, color: 0x880000, sound: 'magic' },
    { name: 'Spirit Lance', damage: 45, cooldown: 1100, projectiles: 1, spread: 0, type: 'spirit', pierce: 10, color: 0xaaffff, sound: 'magic' },
    { name: 'Shadow Clone', damage: 15, cooldown: 600, projectiles: 3, spread: 30, type: 'shadow', color: 0x220033, sound: 'magic' },
    { name: 'Meteor Swarm', damage: 25, cooldown: 1800, projectiles: 5, spread: 60, type: 'meteor', explosive: true, color: 0xff4400, sound: 'explosion' },
    { name: 'Star Lance', damage: 50, cooldown: 1400, projectiles: 1, spread: 0, type: 'holy', pierce: 8, color: 0xffffcc, sound: 'magic' },
    { name: 'Void Orb', damage: 30, cooldown: 900, projectiles: 1, spread: 0, type: 'void', color: 0x110022, sound: 'explosion' },
    { name: 'Earthquake', damage: 20, cooldown: 1500, projectiles: 12, spread: 360, type: 'earth', color: 0x885522, sound: 'explosion' },
    { name: 'Chain Hex', damage: 15, cooldown: 600, projectiles: 1, spread: 0, type: 'chain', chains: 10, color: 0x660066, sound: 'magic' },
    { name: 'Phoenix Burst', damage: 35, cooldown: 1000, projectiles: 1, spread: 0, type: 'fire', explosive: true, color: 0xffaa00, sound: 'explosion' },
    { name: 'Soul Drain', damage: 10, cooldown: 300, projectiles: 1, spread: 0, type: 'spirit', lifesteal: true, color: 0x44ffaa, sound: 'magic' },
    { name: 'Wind Scythe', damage: 22, cooldown: 450, projectiles: 3, spread: 20, type: 'wind', pierce: 5, color: 0x88ff88, sound: 'shoot' },
    { name: 'Arcane Storm', damage: 6, cooldown: 100, projectiles: 6, spread: 360, type: 'arcane', color: 0xdd88ff, sound: 'magic' },
    { name: 'Gravity Rune', damage: 40, cooldown: 1300, projectiles: 1, spread: 0, type: 'gravity', color: 0x4400aa, sound: 'explosion' },
    { name: 'Holy Beam', damage: 18, cooldown: 200, projectiles: 1, spread: 0, type: 'laser', color: 0xffffee, sound: 'laser' },
    { name: 'Necro Swarm', damage: 4, cooldown: 150, projectiles: 8, spread: 180, type: 'homing', color: 0x448844, sound: 'magic' },
    { name: 'Cosmic Tear', damage: 70, cooldown: 2500, projectiles: 1, spread: 0, type: 'void', explosive: true, color: 0x8800ff, sound: 'explosion' }
];

// ===========================
// ENEMY DEFINITIONS
// ===========================

var enemyTypes = [
    { name: 'Walker', hp: 30, speed: 60, damage: 10, color: 0x00ff00, size: 20, xpValue: 5 },
    { name: 'Runner', hp: 20, speed: 120, damage: 8, color: 0x88ff00, size: 16, xpValue: 7 },
    { name: 'Tank', hp: 150, speed: 40, damage: 20, color: 0x008800, size: 30, xpValue: 15 },
    { name: 'Swarmer', hp: 10, speed: 90, damage: 5, color: 0xaaff00, size: 10, xpValue: 2 },
    { name: 'Charger', hp: 40, speed: 50, damage: 25, color: 0xff4400, size: 22, xpValue: 10, charger: true },
    { name: 'Spitter', hp: 25, speed: 50, damage: 15, color: 0x00ffaa, size: 18, xpValue: 8, ranged: true },
    { name: 'Bomber', hp: 35, speed: 70, damage: 30, color: 0xff0000, size: 20, xpValue: 12, explodes: true },
    { name: 'Shielded', hp: 60, speed: 55, damage: 12, color: 0x4444ff, size: 24, xpValue: 10, shielded: true },
    { name: 'Teleporter', hp: 30, speed: 40, damage: 15, color: 0xaa00ff, size: 18, xpValue: 12, teleports: true },
    { name: 'Leech', hp: 45, speed: 65, damage: 8, color: 0x880044, size: 20, xpValue: 10, leech: true },
    { name: 'Frostling', hp: 35, speed: 60, damage: 10, color: 0x88ddff, size: 18, xpValue: 8, slows: true },
    { name: 'Pyro', hp: 40, speed: 55, damage: 12, color: 0xff8800, size: 20, xpValue: 10, fireTrail: true },
    { name: 'Summoner', hp: 80, speed: 35, damage: 5, color: 0x660066, size: 26, xpValue: 20, summons: true },
    { name: 'Phase Beast', hp: 50, speed: 70, damage: 18, color: 0x4400aa, size: 22, xpValue: 15, phases: true },
    { name: 'Burrower', hp: 45, speed: 80, damage: 20, color: 0x664422, size: 20, xpValue: 12, burrows: true },
    { name: 'Drone', hp: 20, speed: 100, damage: 8, color: 0xaaaaaa, size: 14, xpValue: 6 },
    { name: 'Arc Wraith', hp: 55, speed: 50, damage: 15, color: 0xffff00, size: 24, xpValue: 14, ranged: true },
    { name: 'Voidling', hp: 40, speed: 65, damage: 12, color: 0x220044, size: 18, xpValue: 10, splits: true },
    { name: 'Elite Walker', hp: 100, speed: 80, damage: 20, color: 0x00ff88, size: 28, xpValue: 25 },
    { name: 'Elite Runner', hp: 60, speed: 150, damage: 15, color: 0xaaff88, size: 22, xpValue: 20 }
];

var bossTypes = [
    { name: 'Goliath', hp: 500, speed: 30, damage: 40, color: 0xff0000, size: 60, xpValue: 100 },
    { name: 'Swarm Queen', hp: 400, speed: 40, damage: 25, color: 0x00ff00, size: 50, xpValue: 100, summons: true },
    { name: 'Void Lord', hp: 600, speed: 35, damage: 35, color: 0x4400aa, size: 55, xpValue: 120, teleports: true },
    { name: 'Inferno', hp: 450, speed: 45, damage: 30, color: 0xff4400, size: 52, xpValue: 110, fireTrail: true },
    { name: 'Frost Titan', hp: 700, speed: 25, damage: 45, color: 0x88ddff, size: 65, xpValue: 150, slows: true }
];

// ===========================
// UPGRADE DEFINITIONS
// ===========================

var statUpgrades = [
    { name: 'Max HP +20', stat: 'maxHP', value: 20, rarity: 'common' },
    { name: 'Max HP +50', stat: 'maxHP', value: 50, rarity: 'uncommon' },
    { name: 'Move Speed +15', stat: 'moveSpeed', value: 15, rarity: 'common' },
    { name: 'Move Speed +30', stat: 'moveSpeed', value: 30, rarity: 'uncommon' },
    { name: 'Attack Speed +10%', stat: 'attackSpeed', value: 0.1, rarity: 'common', percent: true },
    { name: 'Attack Speed +25%', stat: 'attackSpeed', value: 0.25, rarity: 'uncommon', percent: true },
    { name: 'Damage +5', stat: 'damage', value: 5, rarity: 'common' },
    { name: 'Damage +15', stat: 'damage', value: 15, rarity: 'uncommon' },
    { name: 'Projectile Speed +50', stat: 'projectileSpeed', value: 50, rarity: 'common' },
    { name: 'Projectile Amount +1', stat: 'projectileAmount', value: 1, rarity: 'rare' },
    { name: 'Pickup Range +30', stat: 'pickupRange', value: 30, rarity: 'common' },
    { name: 'Crit Chance +5%', stat: 'critChance', value: 0.05, rarity: 'uncommon' },
    { name: 'Crit Damage +50%', stat: 'critMultiplier', value: 0.5, rarity: 'uncommon' },
    { name: 'Armor +5', stat: 'armor', value: 5, rarity: 'common' },
    { name: 'Regen +1/s', stat: 'regen', value: 1, rarity: 'uncommon' },
    { name: 'XP Bonus +20%', stat: 'xpMultiplier', value: 0.2, rarity: 'uncommon', percent: true },
    { name: 'Pierce +1', stat: 'pierce', value: 1, rarity: 'rare' },
    { name: 'Bounce +1', stat: 'bounce', value: 1, rarity: 'rare' },
    { name: 'Chain +1', stat: 'chain', value: 1, rarity: 'rare' },
    { name: 'AOE Size +20%', stat: 'aoeSize', value: 0.2, rarity: 'uncommon', percent: true }
];

var synergyUpgrades = [
    { name: 'Projectiles Pierce', description: 'All projectiles pierce +2 enemies', effect: function() { playerStats.pierce += 2; }, rarity: 'rare' },
    { name: 'Projectiles Bounce', description: 'All projectiles bounce +2 times', effect: function() { playerStats.bounce += 2; }, rarity: 'rare' },
    { name: 'Explosive Rounds', description: '+15% chance for explosions', effect: function() { playerStats.explosionChance += 0.15; }, rarity: 'rare' },
    { name: 'Chain Reaction', description: 'All projectiles chain +3 targets', effect: function() { playerStats.chain += 3; }, rarity: 'rare' },
    { name: 'Stationary Fire', description: 'Standing still: +50% attack speed', effect: function() { playerStats.stationaryBonus = (playerStats.stationaryBonus || 0) + 0.5; }, rarity: 'uncommon' },
    { name: 'Mobile Assault', description: 'Moving: +30% damage', effect: function() { playerStats.movingDamage = (playerStats.movingDamage || 0) + 0.3; }, rarity: 'uncommon' },
    { name: 'Rampage', description: 'Kills grant +10% speed for 2s', effect: function() { playerStats.rampageBonus = (playerStats.rampageBonus || 0) + 0.1; }, rarity: 'uncommon' },
    { name: 'Vampirism', description: '+3% lifesteal on all attacks', effect: function() { playerStats.lifesteal = (playerStats.lifesteal || 0) + 0.03; }, rarity: 'rare' }
];

var legendaryUpgrades = [
    { name: 'Double Stats', description: 'Double ALL current stats', effect: function() {
        playerStats.maxHP *= 2;
        playerStats.damage *= 2;
        playerStats.moveSpeed *= 2;
        playerStats.attackSpeed *= 2;
    }, rarity: 'legendary' },
    { name: 'Triple Projectiles', description: 'Triple projectile amount', effect: function() {
        playerStats.projectileAmount *= 3;
    }, rarity: 'legendary' },
    { name: 'Double Fire', description: 'All weapons fire twice', effect: function() {
        playerStats.doubleFire = true;
    }, rarity: 'legendary' },
    { name: 'Guardian Angel', description: 'Orbiting shield damages enemies', effect: function() {
        playerStats.guardian = true;
    }, rarity: 'legendary' },
    { name: 'Apocalypse', description: 'Massive AOE every 10 seconds', effect: function() {
        playerStats.apocalypse = true;
    }, rarity: 'legendary' },
    { name: 'Time Warp', description: 'Enemies move 30% slower', effect: function() {
        playerStats.timeWarp = (playerStats.timeWarp || 0) + 0.3;
    }, rarity: 'legendary' },
    { name: 'Bullet Hell', description: '+5 projectiles to all weapons', effect: function() {
        playerStats.projectileAmount += 5;
    }, rarity: 'legendary' },
    { name: 'Glass Cannon', description: 'Triple damage, half HP', effect: function() {
        playerStats.damage *= 3;
        playerStats.maxHP = Math.floor(playerStats.maxHP / 2);
        playerStats.currentHP = Math.min(playerStats.currentHP, playerStats.maxHP);
    }, rarity: 'legendary' }
];

// ===========================
// PHASER GAME SCENES
// ===========================

var BootScene = new Phaser.Class({
    Extends: Phaser.Scene,
    
    initialize: function BootScene() {
        Phaser.Scene.call(this, { key: 'BootScene' });
    },
    
    preload: function() {
        // Create placeholder graphics
        this.createPlaceholders();
    },
    
    createPlaceholders: function() {
        // Player sprite
        var playerGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        playerGraphics.fillStyle(0x4488ff, 1);
        playerGraphics.fillCircle(16, 16, 16);
        playerGraphics.generateTexture('player', 32, 32);
        
        // Bullet
        var bulletGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        bulletGraphics.fillStyle(0xffffff, 1);
        bulletGraphics.fillCircle(4, 4, 4);
        bulletGraphics.generateTexture('bullet', 8, 8);
        
        // XP orb
        var xpGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        xpGraphics.fillStyle(0x00ff00, 1);
        xpGraphics.fillCircle(6, 6, 6);
        xpGraphics.generateTexture('xp', 12, 12);
        
        // Enemy placeholder
        var enemyGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        enemyGraphics.fillStyle(0xff0000, 1);
        enemyGraphics.fillCircle(16, 16, 16);
        enemyGraphics.generateTexture('enemy', 32, 32);
    },
    
    create: function() {
        this.scene.start('GameScene');
    }
});

var GameScene = new Phaser.Class({
    Extends: Phaser.Scene,
    
    initialize: function GameScene() {
        Phaser.Scene.call(this, { key: 'GameScene' });
        this.player = null;
        this.enemies = null;
        this.projectiles = null;
        this.xpOrbs = null;
        this.weapons = [];
        this.cursors = null;
        this.wasd = null;
        this.lastFired = {};
        this.waveTimer = 0;
        this.spawnTimer = 0;
        this.apocalypseTimer = 0;
        this.floatingTexts = [];
        this.guardianAngle = 0;
    },
    
    create: function() {
        // Initialize audio
        initAudio();
        
        // Set world bounds
        this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
        
        // Create tilemap background
        this.createBackground();
        
        // Create groups
        this.enemies = this.physics.add.group();
        this.projectiles = this.physics.add.group();
        this.xpOrbs = this.physics.add.group();
        this.hazards = this.physics.add.group();
        
        // Create player
        this.createPlayer();
        
        // Setup controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
        
        // Setup collisions
        this.physics.add.overlap(this.projectiles, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.player, this.xpOrbs, this.collectXP, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.playerHit, null, this);
        
        // Setup camera
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
        
        // Create UI
        this.createUI();
        
        // Give starting weapon
        var weaponPool = gameState.mode === 'futuristic' ? futuristicWeapons : magicWeapons;
        this.weapons.push(Object.assign({}, weaponPool[0]));
        
        // Start game timers
        this.time.addEvent({
            delay: 1000,
            callback: this.updateGameTime,
            callbackScope: this,
            loop: true
        });
    },
    
    createBackground: function() {
        var graphics = this.add.graphics();
        
        // Dark background
        graphics.fillStyle(0x111122, 1);
        graphics.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
        
        // Grid pattern
        graphics.lineStyle(1, 0x222244, 0.3);
        for (var x = 0; x < MAP_WIDTH; x += 50) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, MAP_HEIGHT);
        }
        for (var y = 0; y < MAP_HEIGHT; y += 50) {
            graphics.moveTo(0, y);
            graphics.lineTo(MAP_WIDTH, y);
        }
        graphics.strokePath();
        
        // Border
        graphics.lineStyle(4, 0xff0000, 1);
        graphics.strokeRect(2, 2, MAP_WIDTH - 4, MAP_HEIGHT - 4);
    },
    
    createPlayer: function() {
        this.player = this.physics.add.sprite(MAP_WIDTH / 2, MAP_HEIGHT / 2, 'player');
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(100);
        this.player.body.setCircle(16);
    },
    
    createUI: function() {
        // HP Bar background
        this.hpBarBg = this.add.rectangle(GAME_WIDTH / 2, 30, 300, 20, 0x333333);
        this.hpBarBg.setScrollFactor(0);
        this.hpBarBg.setDepth(1000);
        
        // HP Bar
        this.hpBar = this.add.rectangle(GAME_WIDTH / 2 - 148, 30, 296, 16, 0xff0000);
        this.hpBar.setScrollFactor(0);
        this.hpBar.setDepth(1001);
        this.hpBar.setOrigin(0, 0.5);
        
        // XP Bar background
        this.xpBarBg = this.add.rectangle(GAME_WIDTH / 2, 55, 300, 12, 0x333333);
        this.xpBarBg.setScrollFactor(0);
        this.xpBarBg.setDepth(1000);
        
        // XP Bar
        this.xpBar = this.add.rectangle(GAME_WIDTH / 2 - 148, 55, 0, 8, 0x00ff00);
        this.xpBar.setScrollFactor(0);
        this.xpBar.setDepth(1001);
        this.xpBar.setOrigin(0, 0.5);
        
        // Level text
        this.levelText = this.add.text(16, 16, 'Level: 1', {
            fontSize: '20px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        });
        this.levelText.setScrollFactor(0);
        this.levelText.setDepth(1002);
        
        // Wave text
        this.waveText = this.add.text(16, 42, 'Wave: 1', {
            fontSize: '20px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        });
        this.waveText.setScrollFactor(0);
        this.waveText.setDepth(1002);
        
        // Timer text
        this.timerText = this.add.text(16, 68, 'Time: 0:00', {
            fontSize: '16px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        });
        this.timerText.setScrollFactor(0);
        this.timerText.setDepth(1002);
        
        // Kills text
        this.killsText = this.add.text(GAME_WIDTH - 16, 16, 'Kills: 0', {
            fontSize: '20px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        });
        this.killsText.setScrollFactor(0);
        this.killsText.setDepth(1002);
        this.killsText.setOrigin(1, 0);
        
        // Weapon display
        this.weaponText = this.add.text(GAME_WIDTH - 16, 42, 'Weapons: 1', {
            fontSize: '16px',
            fill: '#88ff88',
            fontFamily: 'Arial'
        });
        this.weaponText.setScrollFactor(0);
        this.weaponText.setDepth(1002);
        this.weaponText.setOrigin(1, 0);
    },
    
    updateGameTime: function() {
        if (gameState.isPaused || gameState.gameOver) return;
        
        gameState.timeElapsed++;
        gameState.waveTimer--;
        
        // Regen
        if (playerStats.regen > 0) {
            playerStats.currentHP = Math.min(playerStats.maxHP, playerStats.currentHP + playerStats.regen);
        }
        
        // Wave transition
        if (gameState.waveTimer <= 0) {
            gameState.wave++;
            gameState.waveTimer = 30;
            
            // Boss wave every 5 waves
            if (gameState.wave % 5 === 0) {
                this.spawnBoss();
            }
            
            // Random hazard chance
            if (Math.random() < 0.3) {
                this.spawnHazard();
            }
        }
        
        // Update UI
        var minutes = Math.floor(gameState.timeElapsed / 60);
        var seconds = gameState.timeElapsed % 60;
        this.timerText.setText('Time: ' + minutes + ':' + (seconds < 10 ? '0' : '') + seconds);
        this.waveText.setText('Wave: ' + gameState.wave + ' (' + gameState.waveTimer + 's)');
    },
    
    update: function(time, delta) {
        if (gameState.isPaused || gameState.gameOver) return;
        
        // Player movement
        this.handlePlayerMovement();
        
        // Auto-fire weapons
        this.fireWeapons(time);
        
        // Update enemies AI
        this.updateEnemies(delta);
        
        // Spawn enemies
        this.handleSpawning(delta);
        
        // Update UI
        this.updateUI();
        
        // Guardian angel
        if (playerStats.guardian) {
            this.updateGuardian(delta);
        }
        
        // Apocalypse
        if (playerStats.apocalypse) {
            this.apocalypseTimer += delta;
            if (this.apocalypseTimer >= 10000) {
                this.triggerApocalypse();
                this.apocalypseTimer = 0;
            }
        }
        
        // XP magnet
        this.magnetXP();
        
        // Cleanup floating texts
        this.cleanupFloatingTexts();
    },
    
    handlePlayerMovement: function() {
        var speed = playerStats.moveSpeed;
        
        // Stationary bonus check
        var isMoving = false;
        
        this.player.setVelocity(0);
        
        if (this.wasd.left.isDown || this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
            isMoving = true;
        } else if (this.wasd.right.isDown || this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
            isMoving = true;
        }
        
        if (this.wasd.up.isDown || this.cursors.up.isDown) {
            this.player.setVelocityY(-speed);
            isMoving = true;
        } else if (this.wasd.down.isDown || this.cursors.down.isDown) {
            this.player.setVelocityY(speed);
            isMoving = true;
        }
        
        // Normalize diagonal movement
        if (this.player.body.velocity.x !== 0 && this.player.body.velocity.y !== 0) {
            this.player.body.velocity.normalize().scale(speed);
        }
        
        this.player.isMoving = isMoving;
    },
    
    fireWeapons: function(time) {
        var self = this;
        
        // Find nearest enemy
        var nearestEnemy = this.findNearestEnemy();
        if (!nearestEnemy) return;
        
        var attackSpeedMod = playerStats.attackSpeed;
        if (!this.player.isMoving && playerStats.stationaryBonus) {
            attackSpeedMod *= (1 + playerStats.stationaryBonus);
        }
        
        this.weapons.forEach(function(weapon, index) {
            var cooldown = weapon.cooldown / attackSpeedMod;
            
            if (!self.lastFired[index] || time > self.lastFired[index] + cooldown) {
                self.fireWeapon(weapon, nearestEnemy);
                self.lastFired[index] = time;
                
                // Double fire
                if (playerStats.doubleFire) {
                    self.time.delayedCall(100, function() {
                        self.fireWeapon(weapon, nearestEnemy);
                    });
                }
            }
        });
    },
    
    fireWeapon: function(weapon, target) {
        var totalProjectiles = weapon.projectiles + playerStats.projectileAmount - 1;
        var spreadAngle = weapon.spread;
        var baseAngle = Phaser.Math.Angle.Between(
            this.player.x, this.player.y,
            target.x, target.y
        );
        
        // Play sound
        playSound(weapon.sound || 'shoot');
        
        for (var i = 0; i < totalProjectiles; i++) {
            var angle = baseAngle;
            
            if (totalProjectiles > 1 && spreadAngle > 0) {
                var spreadOffset = (i - (totalProjectiles - 1) / 2) * (spreadAngle / (totalProjectiles - 1));
                angle += Phaser.Math.DegToRad(spreadOffset);
            } else if (spreadAngle === 360) {
                angle = (Math.PI * 2 / totalProjectiles) * i;
            }
            
            // Random spread
            if (weapon.spread > 0 && weapon.spread < 360) {
                angle += (Math.random() - 0.5) * Phaser.Math.DegToRad(5);
            }
            
            this.createProjectile(weapon, angle, target);
        }
    },
    
    createProjectile: function(weapon, angle, target) {
        var proj = this.projectiles.create(this.player.x, this.player.y, 'bullet');
        proj.setTint(weapon.color);
        proj.damage = (weapon.damage + playerStats.damage) * (this.player.isMoving && playerStats.movingDamage ? (1 + playerStats.movingDamage) : 1);
        proj.pierce = (weapon.pierce || 0) + playerStats.pierce;
        proj.bounce = playerStats.bounce;
        proj.chain = (weapon.chains || 0) + playerStats.chain;
        proj.explosive = weapon.explosive || Math.random() < playerStats.explosionChance;
        proj.slow = weapon.slow;
        proj.lifesteal = weapon.lifesteal;
        proj.weaponType = weapon.type;
        proj.hitEnemies = [];
        
        var speed = playerStats.projectileSpeed;
        
        if (weapon.type === 'homing') {
            proj.target = target;
            proj.isHoming = true;
            speed *= 0.7;
        }
        
        if (weapon.type === 'orbital') {
            proj.isOrbital = true;
            proj.orbitAngle = angle;
            proj.orbitSpeed = 3;
            proj.orbitRadius = 80;
        } else {
            this.physics.velocityFromRotation(angle, speed, proj.body.velocity);
        }
        
        // Scale projectile size
        var scale = 1 + (playerStats.aoeSize - 1) * 0.5;
        proj.setScale(scale);
        
        // Auto-destroy after timeout
        this.time.delayedCall(3000, function() {
            if (proj.active) proj.destroy();
        });
    },
    
    findNearestEnemy: function() {
        var nearest = null;
        var nearestDist = Infinity;
        var playerX = this.player.x;
        var playerY = this.player.y;
        
        this.enemies.getChildren().forEach(function(enemy) {
            if (!enemy.active) return;
            var dist = Phaser.Math.Distance.Between(playerX, playerY, enemy.x, enemy.y);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = enemy;
            }
        });
        
        return nearest;
    },
    
    hitEnemy: function(projectile, enemy) {
        // Check if already hit
        if (projectile.hitEnemies && projectile.hitEnemies.indexOf(enemy) !== -1) {
            return;
        }
        
        if (projectile.hitEnemies) {
            projectile.hitEnemies.push(enemy);
        }
        
        // Calculate damage
        var damage = projectile.damage;
        var isCrit = Math.random() < playerStats.critChance;
        if (isCrit) {
            damage *= playerStats.critMultiplier;
            playSound('crit');
            this.showFloatingText(enemy.x, enemy.y - 20, Math.floor(damage) + '!', 0xffff00);
            this.cameras.main.shake(50, 0.005);
        } else {
            playSound('hit');
        }
        
        enemy.hp -= damage;
        
        // Slow effect
        if (projectile.slow) {
            enemy.slowTimer = 2000;
            enemy.setTint(0x88ddff);
        }
        
        // Lifesteal
        if (projectile.lifesteal || playerStats.lifesteal > 0) {
            var heal = damage * (playerStats.lifesteal || 0.05);
            playerStats.currentHP = Math.min(playerStats.maxHP, playerStats.currentHP + heal);
        }
        
        // Explosion
        if (projectile.explosive) {
            this.createExplosion(projectile.x, projectile.y, projectile.damage * 0.5);
        }
        
        // Chain
        if (projectile.chain > 0) {
            this.chainToNearby(projectile, enemy);
        }
        
        // Check enemy death
        if (enemy.hp <= 0) {
            this.killEnemy(enemy);
        }
        
        // Pierce handling
        if (projectile.pierce > 0) {
            projectile.pierce--;
        } else if (projectile.bounce > 0) {
            projectile.bounce--;
            // Bounce to new target
            var newTarget = this.findNearestEnemyExcluding(projectile.hitEnemies);
            if (newTarget) {
                var angle = Phaser.Math.Angle.Between(projectile.x, projectile.y, newTarget.x, newTarget.y);
                this.physics.velocityFromRotation(angle, playerStats.projectileSpeed, projectile.body.velocity);
            } else {
                projectile.destroy();
            }
        } else if (!projectile.isOrbital) {
            projectile.destroy();
        }
    },
    
    findNearestEnemyExcluding: function(excludeList) {
        var nearest = null;
        var nearestDist = Infinity;
        var px = this.player.x;
        var py = this.player.y;
        
        this.enemies.getChildren().forEach(function(enemy) {
            if (!enemy.active || excludeList.indexOf(enemy) !== -1) return;
            var dist = Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = enemy;
            }
        });
        
        return nearest;
    },
    
    chainToNearby: function(projectile, sourceEnemy) {
        var self = this;
        var chainRange = 150;
        
        this.enemies.getChildren().forEach(function(enemy) {
            if (!enemy.active || enemy === sourceEnemy) return;
            if (projectile.hitEnemies.indexOf(enemy) !== -1) return;
            
            var dist = Phaser.Math.Distance.Between(sourceEnemy.x, sourceEnemy.y, enemy.x, enemy.y);
            if (dist < chainRange && projectile.chain > 0) {
                projectile.chain--;
                
                // Visual chain effect
                var graphics = self.add.graphics();
                graphics.lineStyle(2, 0xffff00, 1);
                graphics.lineBetween(sourceEnemy.x, sourceEnemy.y, enemy.x, enemy.y);
                self.time.delayedCall(100, function() { graphics.destroy(); });
                
                // Damage chained enemy
                enemy.hp -= projectile.damage * 0.7;
                projectile.hitEnemies.push(enemy);
                
                if (enemy.hp <= 0) {
                    self.killEnemy(enemy);
                }
            }
        });
    },
    
    createExplosion: function(x, y, damage) {
        playSound('explosion');
        
        var explosionRadius = 80 * playerStats.aoeSize;
        
        // Visual
        var circle = this.add.circle(x, y, explosionRadius, 0xff4400, 0.5);
        this.tweens.add({
            targets: circle,
            alpha: 0,
            scale: 1.5,
            duration: 300,
            onComplete: function() { circle.destroy(); }
        });
        
        // Damage enemies in radius
        var self = this;
        this.enemies.getChildren().forEach(function(enemy) {
            if (!enemy.active) return;
            var dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
            if (dist < explosionRadius) {
                enemy.hp -= damage;
                if (enemy.hp <= 0) {
                    self.killEnemy(enemy);
                }
            }
        });
        
        this.cameras.main.shake(100, 0.01);
    },
    
    killEnemy: function(enemy) {
        playSound('kill');
        gameState.kills++;
        gameState.score += enemy.xpValue;
        
        // Drop XP
        var xpCount = Math.ceil(enemy.xpValue / 5);
        for (var i = 0; i < xpCount; i++) {
            var xp = this.xpOrbs.create(
                enemy.x + (Math.random() - 0.5) * 30,
                enemy.y + (Math.random() - 0.5) * 30,
                'xp'
            );
            xp.value = 5 * playerStats.xpMultiplier;
        }
        
        // Splits effect
        if (enemy.splits && !enemy.isSplit) {
            for (var j = 0; j < 2; j++) {
                var split = this.spawnEnemyAt(
                    enemy.x + (Math.random() - 0.5) * 40,
                    enemy.y + (Math.random() - 0.5) * 40,
                    { name: 'Swarmer', hp: 10, speed: 90, damage: 5, color: 0x220044, size: 10, xpValue: 2 }
                );
                if (split) split.isSplit = true;
            }
        }
        
        // Explodes on death
        if (enemy.explodes) {
            this.createExplosion(enemy.x, enemy.y, enemy.damage);
        }
        
        // Rampage bonus
        if (playerStats.rampageBonus) {
            var tempSpeed = playerStats.moveSpeed * playerStats.rampageBonus;
            playerStats.moveSpeed += tempSpeed;
            var self = this;
            this.time.delayedCall(2000, function() {
                playerStats.moveSpeed -= tempSpeed;
            });
        }
        
        enemy.destroy();
    },
    
    collectXP: function(player, xp) {
        playSound('pickup');
        xpState.current += xp.value;
        xp.destroy();
        
        // Level up check
        while (xpState.current >= xpState.required) {
            xpState.current -= xpState.required;
            xpState.level++;
            
            // XP scaling: gradual then exponential
            if (xpState.level < 10) {
                xpState.required = Math.floor(xpState.required * 1.2);
            } else {
                xpState.required = Math.floor(xpState.required * 1.4);
            }
            
            playSound('levelup');
            this.showUpgradeMenu();
        }
    },
    
    magnetXP: function() {
        var self = this;
        var range = playerStats.pickupRange;
        
        this.xpOrbs.getChildren().forEach(function(xp) {
            if (!xp.active) return;
            var dist = Phaser.Math.Distance.Between(self.player.x, self.player.y, xp.x, xp.y);
            if (dist < range) {
                var angle = Phaser.Math.Angle.Between(xp.x, xp.y, self.player.x, self.player.y);
                var speed = 300;
                xp.body.velocity.x = Math.cos(angle) * speed;
                xp.body.velocity.y = Math.sin(angle) * speed;
            }
        });
    },
    
    playerHit: function(player, enemy) {
        if (this.playerInvulnerable) return;
        
        var damage = Math.max(1, enemy.damage - playerStats.armor);
        playerStats.currentHP -= damage;
        
        playSound('hurt');
        this.cameras.main.shake(100, 0.02);
        this.showFloatingText(player.x, player.y - 30, '-' + damage, 0xff0000);
        
        // Brief invulnerability
        this.playerInvulnerable = true;
        player.setTint(0xff0000);
        
        var self = this;
        this.time.delayedCall(500, function() {
            self.playerInvulnerable = false;
            player.clearTint();
        });
        
        // Leech
        if (enemy.leech) {
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + damage);
        }
        
        // Check death
        if (playerStats.currentHP <= 0) {
            this.gameOver();
        }
    },
    
    handleSpawning: function(delta) {
        this.spawnTimer += delta;
        
        // Spawn rate increases with wave
        var spawnInterval = Math.max(200, 1000 - gameState.wave * 50);
        
        if (this.spawnTimer >= spawnInterval) {
            this.spawnTimer = 0;
            
            // Spawn enemies (more per spawn as waves progress)
            var spawnCount = Math.min(5, 1 + Math.floor(gameState.wave / 3));
            for (var i = 0; i < spawnCount; i++) {
                this.spawnEnemy();
            }
        }
    },
    
    spawnEnemy: function() {
        // Select enemy type based on wave
        var availableTypes = enemyTypes.filter(function(type, index) {
            return index <= Math.min(gameState.wave + 2, enemyTypes.length - 1);
        });
        
        var type = Phaser.Math.RND.pick(availableTypes);
        
        // Calculate spawn position (within bounds, but away from player)
        var angle = Math.random() * Math.PI * 2;
        var distance = 400 + Math.random() * 200;
        
        var spawnX = this.player.x + Math.cos(angle) * distance;
        var spawnY = this.player.y + Math.sin(angle) * distance;
        
        // Clamp to map bounds
        spawnX = Phaser.Math.Clamp(spawnX, 50, MAP_WIDTH - 50);
        spawnY = Phaser.Math.Clamp(spawnY, 50, MAP_HEIGHT - 50);
        
        this.spawnEnemyAt(spawnX, spawnY, type);
    },
    
    spawnEnemyAt: function(x, y, type) {
        var graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(type.color, 1);
        graphics.fillCircle(type.size, type.size, type.size);
        var textureName = 'enemy_' + type.name + '_' + Date.now();
        graphics.generateTexture(textureName, type.size * 2, type.size * 2);
        
        var enemy = this.enemies.create(x, y, textureName);
        
        // Scale HP with time and wave
        var hpScale = (1 + gameState.timeElapsed / 60) * Math.pow(1.1, gameState.wave);
        if (playerStats.timeWarp) {
            enemy.slowMultiplier = 1 - playerStats.timeWarp;
        } else {
            enemy.slowMultiplier = 1;
        }
        
        enemy.hp = Math.floor(type.hp * hpScale);
        enemy.maxHp = enemy.hp;
        enemy.speed = type.speed;
        enemy.damage = type.damage;
        enemy.xpValue = type.xpValue;
        enemy.charger = type.charger;
        enemy.ranged = type.ranged;
        enemy.explodes = type.explodes;
        enemy.shielded = type.shielded;
        enemy.teleports = type.teleports;
        enemy.leech = type.leech;
        enemy.slows = type.slows;
        enemy.fireTrail = type.fireTrail;
        enemy.summons = type.summons;
        enemy.phases = type.phases;
        enemy.burrows = type.burrows;
        enemy.splits = type.splits;
        enemy.body.setCircle(type.size);
        
        return enemy;
    },
    
    spawnBoss: function() {
        var bossIndex = Math.floor((gameState.wave / 5 - 1) % bossTypes.length);
        var type = bossTypes[bossIndex];
        
        var angle = Math.random() * Math.PI * 2;
        var spawnX = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * 500, 100, MAP_WIDTH - 100);
        var spawnY = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * 500, 100, MAP_HEIGHT - 100);
        
        var boss = this.spawnEnemyAt(spawnX, spawnY, type);
        boss.isBoss = true;
        boss.setScale(1.5);
        
        this.showFloatingText(spawnX, spawnY - 50, 'BOSS: ' + type.name, 0xff0000);
    },
    
    spawnHazard: function() {
        var x = Phaser.Math.Between(100, MAP_WIDTH - 100);
        var y = Phaser.Math.Between(100, MAP_HEIGHT - 100);
        
        // Warning indicator
        var warning = this.add.circle(x, y, 100, 0xff0000, 0.3);
        this.tweens.add({
            targets: warning,
            alpha: 0.6,
            yoyo: true,
            repeat: 3,
            duration: 300,
            onComplete: function() {
                warning.destroy();
            }
        });
        
        var self = this;
        this.time.delayedCall(1500, function() {
            self.createExplosion(x, y, 30);
        });
    },
    
    updateEnemies: function(delta) {
        var self = this;
        var playerX = this.player.x;
        var playerY = this.player.y;
        
        this.enemies.getChildren().forEach(function(enemy) {
            if (!enemy.active) return;
            
            var speed = enemy.speed * enemy.slowMultiplier;
            
            // Slow timer
            if (enemy.slowTimer) {
                enemy.slowTimer -= delta;
                speed *= 0.5;
                if (enemy.slowTimer <= 0) {
                    enemy.clearTint();
                    enemy.slowTimer = 0;
                }
            }
            
            // Phasing
            if (enemy.phases) {
                enemy.phaseTimer = (enemy.phaseTimer || 0) + delta;
                if (enemy.phaseTimer > 2000) {
                    enemy.setAlpha(enemy.alpha === 1 ? 0.3 : 1);
                    enemy.phaseTimer = 0;
                }
                if (enemy.alpha < 1) return; // Don't move while phased
            }
            
            // Teleport
            if (enemy.teleports) {
                enemy.teleportTimer = (enemy.teleportTimer || 0) + delta;
                if (enemy.teleportTimer > 3000) {
                    var angle = Math.random() * Math.PI * 2;
                    var dist = 100 + Math.random() * 100;
                    enemy.x = Phaser.Math.Clamp(playerX + Math.cos(angle) * dist, 50, MAP_WIDTH - 50);
                    enemy.y = Phaser.Math.Clamp(playerY + Math.sin(angle) * dist, 50, MAP_HEIGHT - 50);
                    enemy.teleportTimer = 0;
                }
            }
            
            // Charger
            if (enemy.charger) {
                enemy.chargeTimer = (enemy.chargeTimer || 0) + delta;
                if (enemy.chargeTimer > 2000) {
                    speed *= 3;
                    enemy.chargeTimer = 0;
                }
            }
            
            // Summoner
            if (enemy.summons) {
                enemy.summonTimer = (enemy.summonTimer || 0) + delta;
                if (enemy.summonTimer > 5000) {
                    for (var i = 0; i < 3; i++) {
                        self.spawnEnemyAt(
                            enemy.x + (Math.random() - 0.5) * 50,
                            enemy.y + (Math.random() - 0.5) * 50,
                            enemyTypes[3] // Swarmer
                        );
                    }
                    enemy.summonTimer = 0;
                }
            }
            
            // Fire trail
            if (enemy.fireTrail) {
                enemy.trailTimer = (enemy.trailTimer || 0) + delta;
                if (enemy.trailTimer > 500) {
                    var fire = self.add.circle(enemy.x, enemy.y, 15, 0xff4400, 0.5);
                    self.time.delayedCall(2000, function() { fire.destroy(); });
                    enemy.trailTimer = 0;
                }
            }
            
            // Move towards player
            var angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, playerX, playerY);
            enemy.body.velocity.x = Math.cos(angle) * speed;
            enemy.body.velocity.y = Math.sin(angle) * speed;
        });
        
        // Update orbital projectiles
        this.projectiles.getChildren().forEach(function(proj) {
            if (proj.isOrbital) {
                proj.orbitAngle += proj.orbitSpeed * delta / 1000;
                proj.x = self.player.x + Math.cos(proj.orbitAngle) * proj.orbitRadius;
                proj.y = self.player.y + Math.sin(proj.orbitAngle) * proj.orbitRadius;
            }
            
            if (proj.isHoming && proj.target && proj.target.active) {
                var angle = Phaser.Math.Angle.Between(proj.x, proj.y, proj.target.x, proj.target.y);
                var speed = Math.sqrt(proj.body.velocity.x * proj.body.velocity.x + proj.body.velocity.y * proj.body.velocity.y);
                proj.body.velocity.x = Phaser.Math.Linear(proj.body.velocity.x, Math.cos(angle) * speed, 0.1);
                proj.body.velocity.y = Phaser.Math.Linear(proj.body.velocity.y, Math.sin(angle) * speed, 0.1);
            }
        });
    },
    
    updateGuardian: function(delta) {
        this.guardianAngle += 2 * delta / 1000;
        
        if (!this.guardian) {
            this.guardian = this.add.circle(0, 0, 20, 0x00ffff, 0.8);
            this.guardian.setDepth(101);
        }
        
        this.guardian.x = this.player.x + Math.cos(this.guardianAngle) * 60;
        this.guardian.y = this.player.y + Math.sin(this.guardianAngle) * 60;
        
        // Damage nearby enemies
        var self = this;
        this.enemies.getChildren().forEach(function(enemy) {
            if (!enemy.active) return;
            var dist = Phaser.Math.Distance.Between(self.guardian.x, self.guardian.y, enemy.x, enemy.y);
            if (dist < 30) {
                enemy.hp -= playerStats.damage * 0.1;
                if (enemy.hp <= 0) {
                    self.killEnemy(enemy);
                }
            }
        });
    },
    
    triggerApocalypse: function() {
        playSound('explosion');
        
        var self = this;
        var blast = this.add.circle(this.player.x, this.player.y, 50, 0xffff00, 0.8);
        
        this.tweens.add({
            targets: blast,
            scaleX: 10,
            scaleY: 10,
            alpha: 0,
            duration: 500,
            onUpdate: function() {
                var radius = blast.width * blast.scaleX / 2;
                self.enemies.getChildren().forEach(function(enemy) {
                    if (!enemy.active) return;
                    var dist = Phaser.Math.Distance.Between(self.player.x, self.player.y, enemy.x, enemy.y);
                    if (dist < radius && !enemy.apocalypseHit) {
                        enemy.hp -= playerStats.damage * 5;
                        enemy.apocalypseHit = true;
                        if (enemy.hp <= 0) {
                            self.killEnemy(enemy);
                        }
                    }
                });
            },
            onComplete: function() {
                blast.destroy();
                self.enemies.getChildren().forEach(function(enemy) {
                    enemy.apocalypseHit = false;
                });
            }
        });
        
        this.cameras.main.shake(300, 0.03);
    },
    
    updateUI: function() {
        // HP Bar
        var hpPercent = playerStats.currentHP / playerStats.maxHP;
        this.hpBar.width = 296 * hpPercent;
        
        // XP Bar
        var xpPercent = xpState.current / xpState.required;
        this.xpBar.width = 296 * xpPercent;
        
        // Text updates
        this.levelText.setText('Level: ' + xpState.level);
        this.killsText.setText('Kills: ' + gameState.kills);
        this.weaponText.setText('Weapons: ' + this.weapons.length);
    },
    
    showFloatingText: function(x, y, text, color) {
        var floatText = this.add.text(x, y, text, {
            fontSize: '20px',
            fill: '#' + color.toString(16).padStart(6, '0'),
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        floatText.setOrigin(0.5);
        floatText.setDepth(500);
        
        this.tweens.add({
            targets: floatText,
            y: y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: function() { floatText.destroy(); }
        });
        
        this.floatingTexts.push(floatText);
    },
    
    cleanupFloatingTexts: function() {
        this.floatingTexts = this.floatingTexts.filter(function(text) {
            return text.active;
        });
    },
    
    showUpgradeMenu: function() {
        gameState.isPaused = true;
        
        var upgradeMenu = document.getElementById('upgrade-menu');
        var optionsDiv = document.getElementById('upgrade-options');
        optionsDiv.innerHTML = '';
        
        // Generate upgrade options with rarity weighting
        var options = this.generateUpgradeOptions();
        var self = this;
        
        options.forEach(function(upgrade) {
            var card = document.createElement('div');
            card.className = 'upgrade-card ' + upgrade.rarity;
            card.innerHTML = '<h3>' + upgrade.name + '</h3>' +
                '<p>' + (upgrade.description || upgrade.name) + '</p>' +
                '<div class="rarity">' + upgrade.rarity + '</div>';
            
            card.onclick = function() {
                self.applyUpgrade(upgrade);
                upgradeMenu.classList.add('hidden');
                gameState.isPaused = false;
            };
            
            optionsDiv.appendChild(card);
        });
        
        upgradeMenu.classList.remove('hidden');
    },
    
    generateUpgradeOptions: function() {
        var options = [];
        var weaponPool = gameState.mode === 'futuristic' ? futuristicWeapons : magicWeapons;
        
        // Rarity weights: 90% stat, 10% weapon
        // Within stats: 70% common, 20% uncommon, 8% rare, 2% legendary
        
        for (var i = 0; i < 3; i++) {
            var roll = Math.random();
            
            // 10% chance for weapon (significantly rarer)
            if (roll < 0.1 && this.weapons.length < weaponPool.length) {
                // Add new weapon
                var availableWeapons = weaponPool.filter(function(w) {
                    var self = this;
                    return !this.weapons.some(function(pw) { return pw.name === w.name; });
                }, this);
                
                if (availableWeapons.length > 0) {
                    var weapon = Phaser.Math.RND.pick(availableWeapons);
                    options.push({
                        name: 'New Weapon: ' + weapon.name,
                        description: 'Add ' + weapon.name + ' to your arsenal',
                        type: 'weapon',
                        weapon: weapon,
                        rarity: 'rare'
                    });
                    continue;
                }
            }
            
            // Stat upgrade with rarity
            var rarityRoll = Math.random();
            var rarity;
            if (rarityRoll < 0.02) {
                rarity = 'legendary';
            } else if (rarityRoll < 0.10) {
                rarity = 'rare';
            } else if (rarityRoll < 0.30) {
                rarity = 'uncommon';
            } else {
                rarity = 'common';
            }
            
            if (rarity === 'legendary') {
                options.push(Phaser.Math.RND.pick(legendaryUpgrades));
            } else if (rarity === 'rare') {
                var rareOptions = statUpgrades.filter(function(u) { return u.rarity === 'rare'; })
                    .concat(synergyUpgrades);
                options.push(Phaser.Math.RND.pick(rareOptions));
            } else if (rarity === 'uncommon') {
                var uncommonOptions = statUpgrades.filter(function(u) { return u.rarity === 'uncommon'; });
                options.push(Phaser.Math.RND.pick(uncommonOptions));
            } else {
                var commonOptions = statUpgrades.filter(function(u) { return u.rarity === 'common'; });
                options.push(Phaser.Math.RND.pick(commonOptions));
            }
        }
        
        return options;
    },
    
    applyUpgrade: function(upgrade) {
        if (upgrade.type === 'weapon') {
            this.weapons.push(Object.assign({}, upgrade.weapon));
            this.showFloatingText(this.player.x, this.player.y - 50, 'NEW WEAPON!', 0xffff00);
        } else if (upgrade.effect) {
            upgrade.effect();
            this.showFloatingText(this.player.x, this.player.y - 50, upgrade.name, 0x00ff00);
        } else if (upgrade.stat) {
            if (upgrade.percent) {
                playerStats[upgrade.stat] *= (1 + upgrade.value);
            } else {
                playerStats[upgrade.stat] += upgrade.value;
            }
            
            // Heal to new max HP if HP upgrade
            if (upgrade.stat === 'maxHP') {
                playerStats.currentHP += upgrade.value;
            }
            
            this.showFloatingText(this.player.x, this.player.y - 50, '+' + upgrade.name, 0x00ff00);
        }
    },
    
    gameOver: function() {
        gameState.gameOver = true;
        
        var gameOverDiv = document.getElementById('game-over');
        var statsP = document.getElementById('final-stats');
        
        statsP.innerHTML = 
            'Time Survived: ' + Math.floor(gameState.timeElapsed / 60) + ':' + (gameState.timeElapsed % 60).toString().padStart(2, '0') + '<br>' +
            'Wave Reached: ' + gameState.wave + '<br>' +
            'Enemies Killed: ' + gameState.kills + '<br>' +
            'Level: ' + xpState.level + '<br>' +
            'Weapons Collected: ' + this.weapons.length;
        
        gameOverDiv.classList.remove('hidden');
    }
});

// ===========================
// GAME INITIALIZATION
// ===========================

var game = null;

function startGame(mode) {
    gameState.mode = mode;
    
    // Reset all state
    gameState.wave = 1;
    gameState.waveTimer = 30;
    gameState.timeElapsed = 0;
    gameState.isPaused = false;
    gameState.gameOver = false;
    gameState.score = 0;
    gameState.kills = 0;
    
    // Reset player stats
    playerStats.maxHP = 100;
    playerStats.currentHP = 100;
    playerStats.moveSpeed = 200;
    playerStats.attackSpeed = 1;
    playerStats.projectileSpeed = 400;
    playerStats.projectileAmount = 1;
    playerStats.damage = 10;
    playerStats.pickupRange = 100;
    playerStats.critChance = 0.05;
    playerStats.critMultiplier = 2;
    playerStats.armor = 0;
    playerStats.regen = 0;
    playerStats.xpMultiplier = 1;
    playerStats.pierce = 0;
    playerStats.bounce = 0;
    playerStats.chain = 0;
    playerStats.explosionChance = 0;
    playerStats.aoeSize = 1;
    playerStats.guardian = false;
    playerStats.apocalypse = false;
    playerStats.doubleFire = false;
    playerStats.timeWarp = 0;
    playerStats.lifesteal = 0;
    playerStats.stationaryBonus = 0;
    playerStats.movingDamage = 0;
    playerStats.rampageBonus = 0;
    
    // Reset XP
    xpState.current = 0;
    xpState.required = 20;
    xpState.level = 1;
    
    document.getElementById('mode-select').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    
    if (game) {
        game.destroy(true);
    }
    
    var config = {
        type: Phaser.AUTO,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        parent: 'game-container',
        physics: {
            default: 'arcade',
            arcade: {
                debug: false
            }
        },
        scene: [BootScene, GameScene]
    };
    
    game = new Phaser.Game(config);
}

// Event Listeners
document.getElementById('futuristic-btn').addEventListener('click', function() {
    startGame('futuristic');
});

document.getElementById('magic-btn').addEventListener('click', function() {
    startGame('magic');
});

document.getElementById('restart-btn').addEventListener('click', function() {
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('mode-select').classList.remove('hidden');
});
