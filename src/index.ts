import Phaser from 'phaser';
import config from './config';
import HintScene from './scenes/HintScene';
import GameScene from './scenes/GameScene';
import MainMenu from './scenes/MainMenu';

new Phaser.Game(
  Object.assign(config, {
    scene: [GameScene, MainMenu, HintScene]
  })
);
