import { W, H, TEXT, loadHi } from '../config.js';

// Title / attract screen: drawn on top of a running AI-controlled demo of the
// game (the Game scene launched with { demo: true }).
export default class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    // the Game scene is listed before this one, so it renders underneath
    this.scene.launch('Game', { demo: true });

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.5);
    this.add.text(W / 2, 190, 'SPACE DEFENDERS', TEXT(80, '#66ff88')).setOrigin(0.5);
    this.add.text(W / 2, 265, 'a gallery shooter', TEXT(26, '#aaddff')).setOrigin(0.5);
    this.add.text(W / 2, 350, 'HIGH SCORE  ' + loadHi(), TEXT(30, '#ffdd55')).setOrigin(0.5);

    const start = this.add.text(W / 2, 450, 'PRESS ENTER TO START', TEXT(36)).setOrigin(0.5);
    this.tweens.add({ targets: start, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
    this.add.text(W / 2, 520, 'C - controls & credits', TEXT(22, '#aaaaaa')).setOrigin(0.5);

    this.keys = this.input.keyboard.addKeys({ enter: 'ENTER', space: 'SPACE', c: 'C' });
  }

  update() {
    const J = Phaser.Input.Keyboard.JustDown;
    if (J(this.keys.enter) || J(this.keys.space)) {
      this.scene.stop('Game');
      this.scene.start('Game', { demo: false });
    } else if (J(this.keys.c)) {
      this.scene.stop('Game');
      this.scene.start('Controls');
    }
  }
}
