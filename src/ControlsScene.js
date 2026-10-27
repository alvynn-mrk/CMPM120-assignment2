import { W, TEXT } from '../config.js';

// Controls + credits screen (press C on the title screen)
export default class ControlsScene extends Phaser.Scene {
  constructor() { super('Controls'); }

  create() {
    this.add.text(W / 2, 55, 'CONTROLS', TEXT(48, '#66ff88')).setOrigin(0.5);
    const lines = [
      'LEFT / RIGHT arrows  or  A / D ... move your ship',
      'SPACE ....................... fire',
      'ENTER ....................... start / play again',
      'ESC ......................... back to title (after game over)',
      '',
      'Shoot the aliens. Dodge their fire.',
      'Yellow bolts (dropped by aliens) = double shot for 10 s.',
      'Diving aliens are worth double points.',
      'Clear 3 levels, then beat the 3-phase boss!'
    ];
    this.add.text(W / 2, 110, lines.join('\n'),
      Object.assign(TEXT(22), { lineSpacing: 10, align: 'left' })).setOrigin(0.5, 0);

    this.add.text(W / 2, 460, 'CREDITS', TEXT(34, '#ffdd55')).setOrigin(0.5);
    const credits = [
      'Art: Kenney - Space Shooter Extension (CC0)',
      'Sound: Kenney - Sci-Fi Sounds (CC0)',
      'Made with Phaser 3'
    ];
    this.add.text(W / 2, 500, credits.join('\n'),
      Object.assign(TEXT(22), { align: 'center', lineSpacing: 10 })).setOrigin(0.5, 0);
    this.add.text(W / 2, 680, 'ENTER or ESC - back', TEXT(22, '#aaddff')).setOrigin(0.5);

    this.keys = this.input.keyboard.addKeys({ enter: 'ENTER', esc: 'ESC' });
  }

  update() {
    const J = Phaser.Input.Keyboard.JustDown;
    if (J(this.keys.enter) || J(this.keys.esc)) this.scene.start('Title');
  }
}
