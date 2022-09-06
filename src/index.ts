import Phaser from 'phaser';
import config from './config';
import HintScene from './scenes/HintScene';
import MainMenu from './scenes/MainMenu';

new Phaser.Game(
  Object.assign(config, {
    scene: [MainMenu, HintScene]
  })
);
