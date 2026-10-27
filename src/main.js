import { W, H } from './config.js';
import BootScene from './scenes/BootScene.js';
import GameScene from './scenes/GameScene.js';
import TitleScene from './scenes/TitleScene.js';
import ControlsScene from './scenes/ControlsScene.js';

// Scene order matters: Game is listed before Title so the title screen is
// drawn on top of the attract-mode demo that runs inside the Game scene.
const config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game-container',
  backgroundColor: '#05050f',
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, GameScene, TitleScene, ControlsScene]
};

const game = new Phaser.Game(config);
window.game = game;   // handy for debugging in the browser console
