// ---------------------------------------------------------------------------
// Shared constants: screen size, asset table, level table, enemy stats and
// small helpers.  Everything tunable about the game lives here.
//
// ART:   Kenney "Space Shooter Extension" (CC0) - https://kenney.nl/assets/space-shooter-extension
// AUDIO: Kenney "Sci-Fi Sounds" (CC0)           - https://kenney.nl/assets/sci-fi-sounds
// ---------------------------------------------------------------------------
export const W = 1280;
export const H = 720;
export const ASSET_DIR = 'assets/';

// key -> file inside assets/, and the size (px) it is drawn at in the game.
// flipY: the Kenney ships face down, so the player ship is flipped to face up.
// tint:  colours the plain white laser/orb sprites.
export const SPRITES = {
  player:  { file: 'spaceShips_009.png', w: 78,  h: 56,  flipY: true },
  grunt:   { file: 'spaceShips_008.png', w: 58,  h: 48  },
  swooper: { file: 'spaceShips_002.png', w: 60,  h: 44  },
  tank:    { file: 'spaceShips_004.png', w: 72,  h: 62  },
  boss:    { file: 'spaceShips_007.png', w: 190, h: 168 },
  pBullet: { file: 'spaceParts_060.png', w: 12,  h: 34,  tint: 0x66ffff },
  eBullet: { file: 'spaceParts_060.png', w: 12,  h: 30,  tint: 0xff5533 },
  powerup: { file: 'spaceParts_080.png', w: 34,  h: 34,  tint: 0xffdd33 },
  life:    { file: 'spaceShips_009.png', w: 36,  h: 26,  flipY: true }
};

export const SOUNDS = {
  shoot:      'laserSmall_000.ogg',
  enemyShoot: 'laserRetro_000.ogg',
  explode:    'explosionCrunch_000.ogg',
  hit:        'impactMetal_004.ogg',
  hurt:       'lowFrequency_explosion_001.ogg',
  powerup:    'forceField_000.ogg',
  phase:      'lowFrequency_explosion_000.ogg'
};

// Size a sprite and apply flip / tint from the SPRITES table.
export function styleSprite(s, key) {
  const d = SPRITES[key];
  s.setDisplaySize(d.w, d.h);
  if (d.flipY) s.setFlipY(true);
  if (d.tint) s.setTint(d.tint);
  return s;
}

// Formation grid used by the levels (10 columns)
export const FORM = { cols: 10, sx: 92, sy: 58, baseX: (W - 9 * 92) / 2, baseY: 110 };

// G = grunt, T = tank, . = empty
export const LEVELS = [
  { title: 'LEVEL 1', rows: ['.GGGGGGGG.', '.GGGGGGGG.', '.GGGGGGGG.'],
    sway: 0.8, descend: 3, diveEvery: 4500, fireEvery: 1500,
    pulses: 1, pulseSize: 3, pulseStart: 4000, pulseGap: 6000, swoopTime: 5.4 },
  { title: 'LEVEL 2', rows: ['GGGGGGGGGG', 'GGGGGGGGGG', 'GGGGGGGGGG'],
    sway: 1.0, descend: 4, diveEvery: 3500, fireEvery: 1200,
    pulses: 3, pulseSize: 4, pulseStart: 3500, pulseGap: 6000, swoopTime: 5.2 },
  { title: 'LEVEL 3', rows: ['..TTTTTT..', 'GGGGGGGGGG', 'GGGGGGGGGG', 'GGGGGGGGGG'],
    sway: 1.2, descend: 4, diveEvery: 2800, fireEvery: 950,
    pulses: 4, pulseSize: 5, pulseStart: 3500, pulseGap: 5500, swoopTime: 4.8 },
  { title: 'BOSS BATTLE', boss: true }
];

export const ENEMY_STATS = {
  grunt:   { hp: 1,  points: 10,   drop: 0.04 },
  swooper: { hp: 1,  points: 30,   drop: 0.12 },
  tank:    { hp: 2,  points: 50,   drop: 0.60 },
  boss:    { hp: 70, points: 1000, drop: 0    }
};

// ---- high score (saved to the browser's localStorage) ----
export function loadHi() {
  try { return parseInt(localStorage.getItem('spaceDefendersHi') || '0', 10) || 0; }
  catch (e) { return 0; }
}
export function saveHi(v) {
  try { localStorage.setItem('spaceDefendersHi', String(v)); } catch (e) { /* ignore */ }
}

export const TEXT = (size, color) => ({
  fontFamily: 'monospace', fontSize: size + 'px', color: color || '#ffffff'
});
