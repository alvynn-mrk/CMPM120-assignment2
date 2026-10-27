import { W, H, ASSET_DIR, SPRITES, SOUNDS, TEXT } from '../config.js';

// Loads the Kenney art and sounds, then shows the title screen.
export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    this.add.text(W / 2, H / 2, 'LOADING...', TEXT(28)).setOrigin(0.5);
    this.load.setPath(ASSET_DIR);
    Object.keys(SPRITES).forEach(k => this.load.image(k, SPRITES[k].file));
    Object.keys(SOUNDS).forEach(k => this.load.audio(k, SOUNDS[k]));
  }

  create() {
    this.scene.start('Title');
  }
}
