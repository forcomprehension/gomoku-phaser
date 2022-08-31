import Phaser from 'phaser';

export default {
  type: Phaser.WEBGL,
  parent: 'game',
  backgroundColor: "#c12d56",
  scale: {
    width: 390,
    height: 844,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};
