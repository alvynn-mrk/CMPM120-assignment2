import { GameScene, W, H } from './scenes/GameScene.js';
 
const config = {
    type: Phaser.AUTO,
    title: 'Star Defender',
    description: '',
    parent: 'game-container',
    width: W,
    height: H,
    backgroundColor: '#000000',
    pixelArt: false,
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: [
        GameScene
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
}
 
new Phaser.Game(config);
 
