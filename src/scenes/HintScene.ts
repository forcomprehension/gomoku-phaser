import Phaser from 'phaser';
import { GAME_SCENE, GAME_SCENE_TRANSITION_TIME, HINT_SCENE } from '../constants/scenes';
import { addCenteredText } from '../utils/scene';
import { BaseScene } from './BaseScene';
import GameScene from './GameScene';

export default class HintScene extends BaseScene {

  protected static SHOW_HINT_TIMEOUT = 1000;
  protected static HINT_TEXT_PERCENTAGE_POS = 25;

  protected hintText: Phaser.GameObjects.Text;
  protected continueText: Phaser.GameObjects.Text;

  constructor() {
    super(HINT_SCENE);
  }

  preload() {
    super.preload();

    this.events.once(Phaser.Scenes.Events.TRANSITION_COMPLETE, () => {
      this.beginPlay();
    })
  }

  beginPlay(): void {
    super.beginPlay();

    const { screenHeight } = this.getScreenSize();

    this.hintText = addCenteredText(this, HintScene.HINT_TEXT_PERCENTAGE_POS, "Для победы постарайтесь выстроить в ряд 5 крестиков по диагонали, горизонтали или вертикали")
      .setStyle({
        wordWrap: {
          width: 300
        },
        align: 'center',
        fontSize: '18px'
      }).setAlpha(0);


    this.continueText = addCenteredText(this, 90, "Нажмите, чтобы продолжить")
      .setAlpha(0);

    this.tweens.add({
      targets: this.hintText,
      alpha: 1,
      y: screenHeight / 2,
      duration: HintScene.SHOW_HINT_TIMEOUT * .5
    }).once('complete', () => {
      const tween = this.tweens.add({
        targets: this.continueText,
        duration: HintScene.SHOW_HINT_TIMEOUT * 1.5,
        yoyo: true,
        alpha: 1,
        loop: -1
      });

      // Synchronize blinking
      this.events.once(Phaser.Scenes.Events.TRANSITION_OUT, () => {
        tween.stop();

        if (tween.progress > 0.05) {
          this.tweens.add({
            targets: this.continueText,
            duration: GAME_SCENE_TRANSITION_TIME * tween.progress,
            alpha: 0
          });
        }
      });

      this.continueText.setInteractive()
        .once('pointerdown', this.handleGameStart.bind(this));
    })
  }

  protected handleGameStart() {
    this.scene.add(GAME_SCENE, GameScene);

    const isStarted = this.scene.transition({
      target: GAME_SCENE,
      duration: GAME_SCENE_TRANSITION_TIME
    });

    const { screenHeight } = this.getScreenSize();

    if (isStarted) {
      this.tweens.add({
        targets: this.hintText,
        alpha: 0,
        y: screenHeight / 100 * HintScene.HINT_TEXT_PERCENTAGE_POS
      });
    }
  }
}
