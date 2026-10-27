import {
  W, H, FORM, LEVELS, ENEMY_STATS, styleSprite, loadHi, saveHi, TEXT
} from '../config.js';

const PLAYER_Y = H - 60;     // the ship only ever moves along this horizontal line
const BOSS_Y = 180;          // the boss patrols this line (clear of the health bar)

// ---------------------------------------------------------------------------
// GameScene: the actual gallery shooter. Also runs as the attract-mode demo
// behind the title screen (scene data { demo: true }), flown by a simple AI.
// ---------------------------------------------------------------------------
export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.demo = !!(data && data.demo);
  }

  create() {
    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D',
      fire: 'SPACE', enter: 'ENTER', esc: 'ESC'
    });

    // scrolling starfield
    this.stars = this.add.group();
    for (let i = 0; i < 90; i++) {
      const s = this.add.rectangle(Math.random() * W, Math.random() * H, 2, 2, 0xffffff, 0.3 + Math.random() * 0.6);
      s.speed = 20 + Math.random() * 70;
      this.stars.add(s);
    }

    // every gameplay object lives in one of these groups
    this.enemies = this.physics.add.group();
    this.playerBullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.powerups = this.physics.add.group();

    this.player = this.physics.add.sprite(W / 2, PLAYER_Y, 'player');
    styleSprite(this.player, 'player');
    this.player.body.setSize(this.player.width * 0.7, this.player.height * 0.7, true);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(5);

    // collisions: Phaser loops over the groups for us (no per-object checks)
    this.physics.add.overlap(this.playerBullets, this.enemies, this.onBulletHitEnemy, null, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.onEnemyBulletHitPlayer, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.onEnemyRamPlayer, null, this);
    this.physics.add.overlap(this.player, this.powerups, this.onPowerupPickup, null, this);

    this.setupHud();
    this.initGame();
  }

  // ------------------------------------------------------------------ setup
  // Resets every game variable; called from create() and again on every
  // restart, so the game can be replayed without reloading the page.
  initGame() {
    this.time.removeAllEvents();
    [this.enemies, this.playerBullets, this.enemyBullets, this.powerups].forEach(g => g.clear(true, true));

    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.state = 'intro';       // intro | playing | cleared | bossdown | gameover | victory
    this.invuln = 0;
    this.powerTime = 0;
    this.fireCd = 0;
    this.nextEnemyFire = 1500;
    this.nextDive = 3000;
    this.pending = 0;           // swoopers scheduled but not yet spawned
    this.levelTime = 0;
    this.fx = 0; this.fy = 0; this.entry = 0;
    this.boss = null;
    this.bossPhase = 1;
    this.hiScore = loadHi();

    this.player.setPosition(W / 2, PLAYER_Y).setAlpha(1).setVisible(true);
    this.player.setVelocity(0, 0);
    this.overlay.forEach(o => o.setVisible(false));
    this.banner.setText('').setVisible(false);
    this.powerText.setText('');
    this.refreshHud();
    this.startLevel(1);
  }

  setupHud() {
    this.scoreText = this.add.text(20, 12, '', TEXT(26)).setDepth(30);
    this.hiText = this.add.text(W / 2, 12, '', TEXT(26, '#ffdd55')).setOrigin(0.5, 0).setDepth(30);
    this.levelText = this.add.text(W - 20, 12, '', TEXT(26)).setOrigin(1, 0).setDepth(30);
    this.powerText = this.add.text(W - 20, H - 36, '', TEXT(20, '#ffdd33')).setOrigin(1, 0).setDepth(30);
    this.lifeIcons = [];
    for (let i = 0; i < 5; i++) {
      const icon = this.add.image(40 + i * 46, H - 26, 'life').setDepth(30);
      styleSprite(icon, 'life');
      this.lifeIcons.push(icon);
    }
    this.hud = [this.scoreText, this.hiText, this.levelText, this.powerText, ...this.lifeIcons];
    this.bossBar = this.add.graphics().setDepth(30);

    this.banner = this.add.text(W / 2, H / 2, '', Object.assign(TEXT(56), { align: 'center' }))
      .setOrigin(0.5).setDepth(40).setVisible(false);

    // game-over / victory overlay
    const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.65).setDepth(50);
    this.endTitle = this.add.text(W / 2, 230, '', TEXT(88, '#ff5555')).setOrigin(0.5).setDepth(51);
    this.endScore = this.add.text(W / 2, 340, '', TEXT(36)).setOrigin(0.5).setDepth(51);
    this.endHi = this.add.text(W / 2, 395, '', TEXT(30, '#ffdd55')).setOrigin(0.5).setDepth(51);
    this.endHint = this.add.text(W / 2, 490, 'ENTER - play again     ESC - title screen', TEXT(26, '#aaddff'))
      .setOrigin(0.5).setDepth(51);
    this.overlay = [bg, this.endTitle, this.endScore, this.endHi, this.endHint];

    this.hud.forEach(h => h.setVisible(!this.demo));
  }

  refreshHud() {
    if (this.score > this.hiScore) this.hiScore = this.score;
    this.scoreText.setText('SCORE ' + String(this.score).padStart(6, '0'));
    this.hiText.setText('HI ' + String(this.hiScore).padStart(6, '0'));
    this.levelText.setText(LEVELS[this.level - 1].boss ? 'BOSS' : 'LEVEL ' + this.level);
    this.lifeIcons.forEach((icon, i) => icon.setVisible(!this.demo && i < this.lives));
  }

  // ----------------------------------------------------------------- levels
  startLevel(n) {
    this.level = n;
    this.cfg = LEVELS[n - 1];
    this.state = 'intro';
    this.levelTime = 0;
    this.fx = 0; this.fy = 0; this.entry = -360;
    this.pending = 0;
    this.boss = null;
    this.enemyBullets.clear(true, true);
    this.playerBullets.clear(true, true);
    this.powerups.clear(true, true);
    this.refreshHud();
    const text = this.demo ? '' : this.cfg.title;
    this.showBanner(text, this.demo ? 200 : 1800, () => {
      this.buildLevel();
      this.state = 'playing';
    });
  }

  showBanner(text, ms, done) {
    this.banner.setText(text).setVisible(text !== '');
    this.time.delayedCall(ms, () => {
      this.banner.setVisible(false);
      if (done) done();
    });
  }

  buildLevel() {
    const cfg = this.cfg;
    this.nextEnemyFire = 1200;
    this.nextDive = cfg.diveEvery || 1e9;
    if (cfg.boss) { this.spawnBoss(); return; }

    // main formation (rows of the LEVELS table)
    cfg.rows.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        if (ch === '.') return;
        const e = this.spawnEnemy(ch === 'T' ? 'tank' : 'grunt', 0, 0);
        e.col = c; e.row = r; e.mode = 'formation';
        e.setPosition(this.slotX(e), this.slotY(e));
      });
    });

    // waves of swoopers ("pulses") that fly in along curved paths
    for (let p = 0; p < cfg.pulses; p++) {
      for (let k = 0; k < cfg.pulseSize; k++) {
        this.pending++;
        this.time.delayedCall(cfg.pulseStart + p * cfg.pulseGap + k * 380, () => {
          this.pending--;
          if (this.state === 'playing') this.spawnSwooper(p % 2 === 0 ? 1 : -1);
        });
      }
    }
  }

  slotX(e) { return FORM.baseX + e.col * FORM.sx + this.fx; }
  slotY(e) { return FORM.baseY + e.row * FORM.sy + this.fy + this.entry; }

  // ---------------------------------------------------------------- enemies
  makeSprite(group, key, x, y) {
    return styleSprite(group.create(x, y, key), key);
  }

  spawnEnemy(type, x, y) {
    const e = this.makeSprite(this.enemies, type, x, y);
    const st = ENEMY_STATS[type];
    e.type = type;
    e.hp = st.hp; e.maxHp = st.hp;
    e.points = st.points;
    e.dropChance = st.drop;
    e.mode = 'formation';
    e.setDepth(3);
    return e;
  }

  // Swooper: follows a long curved (spline) path across the screen
  spawnSwooper(dir) {
    const e = this.spawnEnemy('swooper', -50, -50);
    const x0 = dir > 0 ? 110 : W - 110;
    const pts = [[x0, -30], [W - x0, 170], [x0, 330], [W - x0, 500], [W / 2, H + 70]]
      .map(p => new Phaser.Math.Vector2(p[0], p[1]));
    e.mode = 'path';
    e.curve = new Phaser.Curves.Spline(pts);
    e.t = 0;
    e.dur = (this.cfg.swoopTime || 5);
    e.shots = [0.3, 0.62];
    return e;
  }

  // Grunt dive: leaves the formation, swoops down along a bezier curve
  // toward the player's position, then re-enters from the top.
  startDive(e) {
    const dir = e.x < W / 2 ? 1 : -1;
    const px = this.player.x;
    e.mode = 'dive';
    e.curve = new Phaser.Curves.CubicBezier(
      new Phaser.Math.Vector2(e.x, e.y),
      new Phaser.Math.Vector2(e.x + dir * 260, e.y + 170),
      new Phaser.Math.Vector2(px - dir * 240, H * 0.72),
      new Phaser.Math.Vector2(px, H + 60));
    e.t = 0;
    e.dur = 2.6;
    e.fired = false;
  }

  updateEnemies(dt, delta) {
    const cfg = this.cfg;
    this.levelTime += dt;
    if (!cfg.boss) {
      this.fx = Math.sin(this.levelTime * cfg.sway) * 90;
      this.fy = Math.min(this.fy + cfg.descend * dt, 150);
      this.entry = Math.min(0, this.entry + 360 * dt);
    }

    for (const e of this.enemies.getChildren().slice()) {
      if (!e.active) continue;
      switch (e.mode) {
        case 'formation':
          e.setPosition(this.slotX(e), this.slotY(e));
          break;
        case 'dive': {
          e.t += dt / e.dur;
          const p = e.curve.getPoint(Math.min(e.t, 1));
          e.setPosition(p.x, p.y);
          if (!e.fired && e.t > 0.45) { e.fired = true; this.fireAimed(e.x, e.y, 320); }
          if (e.t >= 1) { e.mode = 'return'; e.setPosition(this.slotX(e), -40); }
          break;
        }
        case 'return': {
          const tx = this.slotX(e), ty = this.slotY(e);
          const dx = tx - e.x, dy = ty - e.y;
          const dist = Math.hypot(dx, dy), step = 320 * dt;
          if (dist <= step) { e.mode = 'formation'; e.setPosition(tx, ty); }
          else e.setPosition(e.x + dx / dist * step, e.y + dy / dist * step);
          break;
        }
        case 'path': {
          e.t += dt / e.dur;
          if (e.t >= 1) { e.destroy(); break; }
          const p = e.curve.getPoint(e.t);
          e.setPosition(p.x, p.y);
          if (e.shots.length && e.t >= e.shots[0]) { e.shots.shift(); this.fireAimed(e.x, e.y, 300); }
          break;
        }
        case 'boss':
          this.updateBoss(e, dt, delta);
          break;
      }
    }

    if (cfg.boss) return;

    if (this.levelTime > 1.8) {
      // a random formation enemy fires
      this.nextEnemyFire -= delta;
      if (this.nextEnemyFire <= 0) {
        const shooters = this.enemies.getChildren().filter(e => e.active && e.mode === 'formation');
        if (shooters.length) this.enemyShoot(Phaser.Utils.Array.GetRandom(shooters));
        this.nextEnemyFire = cfg.fireEvery * (0.6 + Math.random() * 0.8);
      }
      // a random grunt leaves the formation and dives
      this.nextDive -= delta;
      if (this.nextDive <= 0) {
        const grunts = this.enemies.getChildren().filter(e => e.active && e.mode === 'formation' && e.type === 'grunt');
        if (grunts.length) this.startDive(Phaser.Utils.Array.GetRandom(grunts));
        this.nextDive = cfg.diveEvery * (0.7 + Math.random() * 0.6);
      }
    }
  }

  enemyShoot(e) {
    if (e.type === 'tank') {
      [-0.28, 0, 0.28].forEach(a => this.fireAngle(e.x, e.y + 24, Math.PI / 2 + a, 270));
    } else {
      this.fireAngle(e.x, e.y + 20, Math.PI / 2, 290);
    }
    this.sfx('enemyShoot');
  }

  fireAimed(x, y, speed) {
    this.fireAngle(x, y, Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y), speed);
  }

  fireAngle(x, y, angle, speed) {
    const b = this.makeSprite(this.enemyBullets, 'eBullet', x, y);
    b.setRotation(angle - Math.PI / 2);
    this.physics.velocityFromRotation(angle, speed, b.body.velocity);
    return b;
  }

  // ------------------------------------------------------------------- boss
  spawnBoss() {
    const b = this.spawnEnemy('boss', W / 2, -110);
    b.mode = 'boss';
    b.entering = true;
    b.bt = 0;
    b.fireCd = 1500; b.aimCd = 600; b.summonCd = 3500; b.spin = 0;
    this.boss = b;
    this.bossPhase = 1;
  }

  updateBoss(e, dt, delta) {
    if (e.entering) {
      e.y += 100 * dt;
      if (e.y >= BOSS_Y) { e.y = BOSS_Y; e.entering = false; }
      return;
    }
    e.bt += dt;
    const ratio = e.hp / e.maxHp;
    const phase = ratio > 0.66 ? 1 : (ratio > 0.33 ? 2 : 3);
    if (phase !== this.bossPhase) {
      this.bossPhase = phase;
      this.sfx('phase');
      this.cameras.main.flash(300, 255, 80, 80);
      this.showBanner('PHASE ' + phase + '!', 900);
    }
    const speed = [0, 0.8, 1.3, 1.8][phase];
    const amp = [0, 400, 440, 470][phase];
    e.x = W / 2 + Math.sin(e.bt * speed) * amp;
    e.y = BOSS_Y + (phase === 3 ? Math.sin(e.bt * 2.3) * 36 : 0);

    e.fireCd -= delta;
    if (phase === 1) {
      if (e.fireCd <= 0) {          // aimed 3-shot fan
        const a = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
        [-0.2, 0, 0.2].forEach(o => this.fireAngle(e.x, e.y + 60, a + o, 300));
        this.sfx('enemyShoot');
        e.fireCd = 1100;
      }
    } else if (phase === 2) {
      if (e.fireCd <= 0) {          // wide 5-shot fan
        const a = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
        [-0.5, -0.25, 0, 0.25, 0.5].forEach(o => this.fireAngle(e.x, e.y + 60, a + o, 290));
        this.sfx('enemyShoot');
        e.fireCd = 1000;
      }
      e.summonCd -= delta;           // calls in swoopers along their paths
      if (e.summonCd <= 0) {
        this.spawnSwooper(1); this.spawnSwooper(-1);
        e.summonCd = 4500;
      }
    } else {
      if (e.fireCd <= 0) {          // rotating radial burst
        e.spin += 0.25;
        for (let i = 0; i < 14; i++) this.fireAngle(e.x, e.y + 36, e.spin + i * (Math.PI * 2 / 14), 220);
        this.sfx('enemyShoot');
        e.fireCd = 1300;
      }
      e.aimCd -= delta;
      if (e.aimCd <= 0) { this.fireAimed(e.x, e.y + 60, 380); e.aimCd = 650; }
    }
  }

  drawBossBar() {
    this.bossBar.clear();
    const b = this.boss;
    if (!b || !b.active || this.demo) return;
    const w = 500, x = (W - w) / 2, y = 52;
    this.bossBar.fillStyle(0x333333, 1).fillRect(x, y, w, 14);
    this.bossBar.fillStyle(0xff4444, 1).fillRect(x, y, w * Math.max(0, b.hp / b.maxHp), 14);
    this.bossBar.lineStyle(2, 0xffffff, 1).strokeRect(x, y, w, 14);
  }

  // ------------------------------------------------------------ collisions
  onBulletHitEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active) return;
    bullet.destroy();
    this.damageEnemy(enemy, 1);
  }

  damageEnemy(e, dmg) {
    e.hp -= dmg;
    if (e.hp > 0) {
      e.setTintFill(0xffffff);
      this.time.delayedCall(70, () => { if (e.active) e.clearTint(); });
      this.sfx('hit');
      return;
    }
    this.killEnemy(e);
  }

  killEnemy(e) {
    const pts = e.mode === 'dive' ? e.points * 2 : e.points;   // bonus for diving enemies
    this.score += pts;
    this.sfx('explode');
    this.popText(e.x, e.y, '+' + pts);
    if (Math.random() < e.dropChance) this.dropPowerup(e.x, e.y);
    const isBoss = e.type === 'boss';
    this.explode(e.x, e.y, isBoss ? 4 : 1);
    e.destroy();
    this.refreshHud();
    if (isBoss) this.onBossDefeated();
  }

  onBossDefeated() {
    this.state = 'bossdown';
    this.player.setVelocity(0, 0);
    this.enemyBullets.clear(true, true);
    // blow up everything that is left
    this.enemies.getChildren().slice().forEach(e => { this.explode(e.x, e.y, 1); e.destroy(); });
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 220, () => this.explode(W / 2 + Phaser.Math.Between(-110, 110), BOSS_Y + Phaser.Math.Between(-60, 60), 3));
    }
    this.score += 500;   // clear bonus
    this.refreshHud();
    this.time.delayedCall(1800, () => this.endGame(true));
  }

  onEnemyBulletHitPlayer(player, bullet) {
    if (!bullet.active) return;
    bullet.destroy();
    this.hurtPlayer();
  }

  onEnemyRamPlayer(player, enemy) {
    if (!enemy.active || this.state !== 'playing' || this.invuln > 0) return;
    if (enemy.type !== 'boss') { this.explode(enemy.x, enemy.y, 1); enemy.destroy(); }
    this.hurtPlayer();
  }

  onPowerupPickup(player, powerup) {
    if (!powerup.active) return;
    powerup.destroy();
    this.powerTime = 10000;
    this.score += 50;
    this.sfx('powerup');
    this.refreshHud();
  }

  hurtPlayer() {
    if (this.demo || this.invuln > 0 || this.state !== 'playing') return;
    this.lives--;
    this.invuln = 1800;
    this.sfx('hurt');
    this.cameras.main.shake(200, 0.01);
    this.explode(this.player.x, this.player.y, 1);
    this.refreshHud();
    if (this.lives <= 0) {
      this.explode(this.player.x, this.player.y, 3);
      this.player.setVisible(false);
      this.endGame(false);
    }
  }

  dropPowerup(x, y) {
    const p = this.makeSprite(this.powerups, 'powerup', x, y);
    p.setVelocityY(130);
  }

  // ------------------------------------------------------------------ player
  updatePlayer(delta) {
    let vx = 0;
    const frozen = this.state === 'cleared';      // the game "pauses" between levels
    if (this.demo) {
      // attract-mode autopilot: chase the nearest enemy and fire
      let target = null, best = 1e9;
      this.enemies.getChildren().forEach(e => {
        const d = Math.abs(e.x - this.player.x);
        if (e.active && d < best) { best = d; target = e; }
      });
      if (target) {
        if (best > 12) vx = target.x > this.player.x ? 380 : -380;
        if (best < 36) this.tryFire();
      }
    } else if (!frozen) {
      if (this.keys.left.isDown || this.keys.a.isDown) vx = -430;
      else if (this.keys.right.isDown || this.keys.d.isDown) vx = 430;
      if (this.keys.fire.isDown) this.tryFire();
    }
    this.player.setVelocityX(vx);     // one axis of movement only
    this.player.y = PLAYER_Y;
    if (this.invuln > 0) this.player.setAlpha(Math.floor(this.invuln / 100) % 2 ? 0.3 : 1);
    else this.player.setAlpha(1);
  }

  tryFire() {
    if (this.fireCd > 0 || this.state === 'gameover') return;
    const double = this.powerTime > 0;
    this.fireCd = double ? 200 : 300;
    (double ? [-14, 14] : [0]).forEach(dx => {
      const b = this.makeSprite(this.playerBullets, 'pBullet', this.player.x + dx, this.player.y - 30);
      b.setVelocityY(-720);
    });
    this.sfx('shoot');
  }

  // --------------------------------------------------------------- game flow
  endGame(win) {
    this.state = win ? 'victory' : 'gameover';
    const isNew = this.score > loadHi();
    if (isNew) saveHi(this.score);
    this.hiScore = Math.max(this.hiScore, this.score);
    this.refreshHud();
    this.endTitle.setText(win ? 'YOU WIN!' : 'GAME OVER').setColor(win ? '#66ff88' : '#ff5555');
    this.endScore.setText('FINAL SCORE  ' + this.score);
    this.endHi.setText(isNew ? 'NEW HIGH SCORE!' : 'HIGH SCORE  ' + this.hiScore);
    this.overlay.forEach(o => o.setVisible(true));
  }

  checkLevelCleared() {
    if (this.state !== 'playing') return;
    if (this.enemies.countActive() > 0 || this.pending > 0) return;
    this.state = 'cleared';
    this.player.setVelocityX(0);
    const bonus = this.demo ? 0 : this.lives * 100;
    this.score += bonus;
    this.refreshHud();
    this.enemyBullets.clear(true, true);
    const next = this.demo ? (this.level % 3) + 1 : this.level + 1;
    const text = this.demo ? '' : 'LEVEL CLEARED!\nBonus +' + bonus;
    this.showBanner(text, this.demo ? 300 : 2400, () => this.startLevel(next));
  }

  // ---------------------------------------------------------------- effects
  explode(x, y, size) {
    for (let i = 0; i < 8 * Math.ceil(size / 2 + 0.5); i++) {
      const c = this.add.circle(x, y, 2 + Math.random() * 3 * size, Phaser.Math.RND.pick([0xffee55, 0xff8833, 0xffffff]));
      c.setDepth(8);
      const a = Math.random() * Math.PI * 2, d = (15 + Math.random() * 35) * size;
      this.tweens.add({
        targets: c, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
        alpha: 0, scale: 0.2, duration: 350 + Math.random() * 250,
        onComplete: () => c.destroy()
      });
    }
  }

  popText(x, y, str) {
    if (this.demo) return;
    const t = this.add.text(x, y, str, TEXT(20, '#ffff88')).setOrigin(0.5).setDepth(9);
    this.tweens.add({ targets: t, y: y - 36, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  sfx(name) {
    if (this.demo) return;
    this.sound.play(name, { volume: 0.4 });
  }

  // ------------------------------------------------------------------ update
  update(time, delta) {
    const dt = delta / 1000;

    this.stars.getChildren().forEach(s => {
      s.y += s.speed * dt;
      if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
    });

    if (this.state === 'gameover' || this.state === 'victory') {
      if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) this.initGame();
      else if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) this.scene.start('Title');
      return;
    }
    if (this.state === 'bossdown') { this.player.setVelocityX(0); this.drawBossBar(); return; }

    this.fireCd = Math.max(0, this.fireCd - delta);
    this.invuln = Math.max(0, this.invuln - delta);
    this.powerTime = Math.max(0, this.powerTime - delta);
    this.powerText.setText(this.powerTime > 0 && !this.demo ? 'DOUBLE SHOT ' + Math.ceil(this.powerTime / 1000) + 's' : '');

    this.updatePlayer(delta);

    // remove anything that left the screen
    [this.playerBullets, this.enemyBullets, this.powerups].forEach(g => {
      g.getChildren().slice().forEach(o => {
        if (o.y < -50 || o.y > H + 50 || o.x < -50 || o.x > W + 50) o.destroy();
      });
    });

    if (this.state === 'playing') {
      this.updateEnemies(dt, delta);
      this.checkLevelCleared();
    }
    this.drawBossBar();
  }
}
