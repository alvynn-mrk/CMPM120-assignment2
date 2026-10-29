export const W = 800;
export const H = 600;
const MAX_HEALTH = 5;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  
  preload() {
    this.load.image('bg', 'assets/darkPurple.png');
    this.load.image('player', 'assets/playerShip1_blue.png');
    this.load.image('playerLaser', 'assets/laserBlue01.png');
    this.load.image('enemyLaser', 'assets/laserRed01.png');
    this.load.image('grunt', 'assets/enemyBlack1.png');   
    this.load.image('diver', 'assets/enemyRed2.png');     

    this.load.audio('sfxShoot', 'assets/sfx_laser1.ogg');
    this.load.audio('sfxEnemyShoot', 'assets/sfx_laser2.ogg');
    this.load.audio('sfxHit', 'assets/sfx_zap.ogg');
    this.load.audio('sfxLose', 'assets/sfx_lose.ogg');
  }

  
  create() {
    this.ensureTextures();

    this.bg = this.add.tileSprite(0, 0, W, H, 'bg').setOrigin(0);

    
    this.playerBullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.enemies = this.physics.add.group();

    
    this.player = this.physics.add.sprite(W / 2, H - 50, 'player');
    this.player.setCollideWorldBounds(true);

    
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER
    });

    
    const style = { fontFamily: 'Arial', fontSize: '22px', color: '#ffffff' };
    this.scoreText = this.add.text(12, 10, '', style).setDepth(10);
    this.waveText = this.add.text(W / 2, 10, '', style).setOrigin(0.5, 0).setDepth(10);
    this.healthText = this.add.text(W - 12, 10, '', { ...style, color: '#ff6677' })
      .setOrigin(1, 0).setDepth(10);

    
    this.physics.add.overlap(this.playerBullets, this.enemies, this.onBulletHitEnemy, null, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.onEnemyBulletHitPlayer, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.onEnemyRamPlayer, null, this);

    this.init_game();
  }

  
  init_game() {
    this.score = 0;
    this.health = MAX_HEALTH;
    this.wave = 1;
    this.state = 'playing';        
    this.lastShot = 0;
    this.invulnUntil = 0;
    this.nextDive = 0;
    this.banner = null;

    this.playerBullets.clear(true, true);
    this.enemyBullets.clear(true, true);
    this.enemies.clear(true, true);

    this.player.setPosition(W / 2, H - 50);
    this.player.setVelocity(0, 0);
    this.player.setAlpha(1).setVisible(true);

    this.updateHud();
    this.spawnWave();
  }

  
  spawnWave() {
    
    const cols = 6;
    const rows = ['diver', 'grunt', 'grunt'];
    let i = 0;
    rows.forEach((type, row) => {
      for (let col = 0; col < cols; col++) {
        const e = this.enemies.create(-100, -100, type);
        e.type = type;
        e.hp = type === 'diver' ? 2 : 1;
        e.points = type === 'diver' ? 30 : 10;
        e.slot = new Phaser.Math.Vector2(130 + col * 108, 90 + row * 62);
        e.side = i % 2 === 0 ? -1 : 1;
        e.st = 'waiting';
        e.spawnAt = this.time.now + 400 + i * 220;   // staggered entry
        e.nextShot = 0;
        e.setVisible(false);
        e.body.enable = false;
        i++;
      }
    });
    this.nextDive = this.time.now + 6000;
  }

  difficulty() {
    return Math.max(0.4, 1 - 0.12 * (this.wave - 1));
  }

  
  startEntry(e, fromTop) {
    const s = e.slot;
    const pts = fromTop
      ? [new Phaser.Math.Vector2(s.x, -50),
         new Phaser.Math.Vector2(s.x + e.side * 120, s.y * 0.4),
         new Phaser.Math.Vector2(s.x, s.y)]
      : [new Phaser.Math.Vector2(e.side < 0 ? -50 : W + 50, 60),
         new Phaser.Math.Vector2(W / 2 - e.side * 220, 260),
         new Phaser.Math.Vector2(s.x, s.y)];
    e.path = new Phaser.Curves.Spline(pts);
    e.t = 0;
    e.dur = 2200;
    e.st = 'entering';
  }

  startDive(e) {
    const p = this.player;
    const dir = Phaser.Math.Between(0, 1) ? 1 : -1;
    const pts = [
      new Phaser.Math.Vector2(e.x, e.y),
      new Phaser.Math.Vector2(e.x + dir * 150, e.y + 110),
      new Phaser.Math.Vector2(p.x, e.y + 300),
      new Phaser.Math.Vector2(p.x - dir * 120, H + 60)
    ];
    e.path = new Phaser.Curves.Spline(pts);
    e.t = 0;
    e.dur = 3200 * this.difficulty() + 800;
    e.shots = 0;
    e.st = 'diving';
  }

  
  update(time, delta) {
    this.bg.tilePositionY -= 0.5 * delta * 0.1;

    if (this.state === 'gameover') {
      if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
        this.scene.restart();   
      }
      return;
    }

    this.updatePlayer(time);

    
    this.enemies.getChildren().forEach(e => this.updateEnemy(e, time, delta));

    
    if (this.state === 'playing' && time > this.nextDive) {
      const ready = this.enemies.getChildren()
        .filter(e => e.active && e.type === 'diver' && e.st === 'formation');
      if (ready.length > 0) this.startDive(Phaser.Utils.Array.GetRandom(ready));
      this.nextDive = time + Phaser.Math.Between(1800, 3200) * this.difficulty();
    }

    
    this.playerBullets.getChildren().forEach(b => { if (b.y < -30) b.destroy(); });
    this.enemyBullets.getChildren().forEach(b => {
      if (b.y > H + 30 || b.y < -30 || b.x < -30 || b.x > W + 30) b.destroy();
    });

    
    if (this.state === 'playing') {
      const alive = this.enemies.getChildren().filter(e => e.active).length;
      if (alive === 0) this.levelClear();
    }
  }

  updatePlayer(time) {
    const left = this.cursors.left.isDown || this.keys.a.isDown;
    const right = this.cursors.right.isDown || this.keys.d.isDown;
    this.player.setVelocityX(left ? -360 : right ? 360 : 0);

    if (this.keys.space.isDown && this.state === 'playing' && time > this.lastShot + 280) {
      this.lastShot = time;
      const b = this.playerBullets.create(this.player.x, this.player.y - 40, 'playerLaser');
      b.setVelocityY(-620);
      this.playSfx('sfxShoot');
    }
  }

  updateEnemy(e, time, delta) {
    if (!e.active) return;

    switch (e.st) {
      case 'waiting':
        if (time >= e.spawnAt) {
          e.setVisible(true);
          e.body.enable = true;
          this.startEntry(e, false);
        }
        break;

      case 'entering':
      case 'returning': {
        e.t += delta / e.dur;
        const p = e.path.getPoint(Math.min(e.t, 1));
        e.setPosition(p.x, p.y);
        if (e.t >= 1) {
          e.st = 'formation';
          e.nextShot = time + Phaser.Math.Between(1500, 5000) * this.difficulty();
        }
        break;
      }

      case 'formation': {
        
        e.setPosition(e.slot.x, e.slot.y + Math.sin(time / 400 + e.slot.x) * 4);
        if (e.type === 'grunt' && this.state === 'playing' && time > e.nextShot) {
          this.enemyShoot(e, Math.PI / 2);
          e.nextShot = time + Phaser.Math.Between(2500, 6000) * this.difficulty();
        }
        break;
      }

      case 'diving': {
        e.t += delta / e.dur;
        const p = e.path.getPoint(Math.min(e.t, 1));
        
        e.setRotation(Phaser.Math.Angle.Between(e.x, e.y, p.x, p.y) - Math.PI / 2 + Math.PI);
        e.setPosition(p.x, p.y);
        
        if (e.shots === 0 && e.t > 0.3) { this.aimedShot(e); e.shots = 1; }
        if (e.shots === 1 && e.t > 0.6) { this.aimedShot(e); e.shots = 2; }
        if (e.t >= 1) {
          e.setRotation(0);
          this.startEntry(e, true);
          e.st = 'returning';
        }
        break;
      }
    }
  }

  
  enemyShoot(e, angle) {
    if (this.state !== 'playing') return;
    const b = this.enemyBullets.create(e.x, e.y + 30, 'enemyLaser');
    const speed = 260 + this.wave * 15;
    b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    b.setRotation(angle - Math.PI / 2);
    this.playSfx('sfxEnemyShoot');
  }

  aimedShot(e) {
    const angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
    this.enemyShoot(e, angle);
  }

  
  onBulletHitEnemy(bullet, enemy) {
    if (!enemy.active || !bullet.active) return;
    bullet.destroy();
    enemy.hp--;
    this.playSfx('sfxHit');
    if (enemy.hp <= 0) {
      this.killEnemy(enemy, true);
    } else {
      enemy.setTintFill(0xffffff);
      this.time.delayedCall(80, () => { if (enemy.active) enemy.clearTint(); });
    }
  }

  onEnemyBulletHitPlayer(player, bullet) {
    if (!bullet.active) return;
    bullet.destroy();
    this.hurtPlayer();
  }

  onEnemyRamPlayer(player, enemy) {
    if (!enemy.active || this.time.now < this.invulnUntil) return;
    this.killEnemy(enemy, false);
    this.hurtPlayer();
  }

  killEnemy(enemy, award) {
    enemy.setActive(false);
    enemy.body.enable = false;
    if (award) {
      this.score += enemy.points;
      this.updateHud();
    }
    this.tweens.add({
      targets: enemy, alpha: 0, scale: 1.6, duration: 220,
      onComplete: () => enemy.destroy()
    });
  }

  hurtPlayer() {
    if (this.state === 'gameover' || this.time.now < this.invulnUntil) return;
    this.health--;
    this.invulnUntil = this.time.now + 1200;
    this.playSfx('sfxHit');
    this.updateHud();

    if (this.health <= 0) {
      this.gameOver();
      return;
    }
    this.tweens.add({
      targets: this.player, alpha: 0.25, duration: 100, yoyo: true, repeat: 5,
      onComplete: () => this.player.setAlpha(1)
    });
  }

  
  levelClear() {
    this.state = 'clear';
    this.enemyBullets.clear(true, true);
    this.banner = this.add.text(W / 2, H / 2, `WAVE ${this.wave} CLEARED!`, {
      fontFamily: 'Arial', fontSize: '48px', color: '#ffee66', stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5).setDepth(20);

    this.time.delayedCall(2500, () => {
      if (this.state !== 'clear') return;
      this.banner.destroy();
      this.wave++;
      this.updateHud();
      this.state = 'playing';
      this.spawnWave();     
    });
  }

  gameOver() {
    this.state = 'gameover';
    this.playSfx('sfxLose');
    this.player.setVelocity(0, 0);
    this.player.setVisible(false);
    this.enemyBullets.clear(true, true);
    this.playerBullets.clear(true, true);

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.65).setDepth(30);
    const big = { fontFamily: 'Arial', fontSize: '64px', color: '#ff4455', stroke: '#000', strokeThickness: 8 };
    const small = { fontFamily: 'Arial', fontSize: '26px', color: '#ffffff' };
    this.add.text(W / 2, H / 2 - 70, 'GAME OVER', big).setOrigin(0.5).setDepth(31);
    this.add.text(W / 2, H / 2 + 5, `Final score: ${this.score}   (Wave ${this.wave})`, small)
      .setOrigin(0.5).setDepth(31);
    this.add.text(W / 2, H / 2 + 60, 'Press ENTER to play again', small)
      .setOrigin(0.5).setDepth(31);
  }


  updateHud() {
    this.scoreText.setText(`Score: ${this.score}`);
    this.waveText.setText(`Wave ${this.wave}`);
    this.healthText.setText('\u2665'.repeat(Math.max(this.health, 0)));
  }

  playSfx(key) {
    if (this.cache.audio.exists(key)) this.sound.play(key, { volume: 0.4 });
  }

  ensureTextures() {
    const fallbacks = {
      bg: [64, 64, 0x1a1030], player: [60, 40, 0x3399ff],
      playerLaser: [6, 30, 0x66ccff], enemyLaser: [6, 30, 0xff4444],
      grunt: [50, 40, 0x999999], diver: [50, 40, 0xff5555]
    };
    Object.keys(fallbacks).forEach(key => {
      if (this.textures.exists(key)) return;
      const [w, h, color] = fallbacks[key];
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1).fillRect(0, 0, w, h);
      g.generateTexture(key, w, h);
      g.destroy();
    });
  }
}
