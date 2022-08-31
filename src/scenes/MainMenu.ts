import Phaser from 'phaser';

import { ActionButton } from '../components/ActionButton';
import { HINT_SCENE, HINT_SCENE_TRANSITION_TIME, MAIN_MENU_SCENE } from '../constants/scenes';
import { addCenteredText } from '../utils/scene';
import { BaseScene } from './BaseScene';

export default class MainMenu extends BaseScene {
    protected GameLogo: Phaser.GameObjects.Text;
    protected ActionButton: ActionButton;

    constructor() {
        super(MAIN_MENU_SCENE);
    }

    create() {
        this.beginPlay();
        const { screenWidth, screenHeight } = this.getScreenSize();

        this.GameLogo = addCenteredText(this, 33, "X O").setStyle({
            fontSize: "128px",
            fontStyle: "bold"
        });

        this.ActionButton = new ActionButton(this, "Одиночная", screenWidth / 2, screenHeight / 3 * 2);
        this.ActionButton.onClick(this.handleTransitionToHint.bind(this));
        this.add.existing(this.ActionButton);
    }

    handleTransitionToHint() {
        const TRANSITION_DURATIONS = HINT_SCENE_TRANSITION_TIME;
        const isStarted = this.scene.transition({
            duration: TRANSITION_DURATIONS,
            target: HINT_SCENE
        });

        if (isStarted) {
            this.tweens.add({
                ease: Phaser.Math.Easing.Quadratic.InOut,
                duration: TRANSITION_DURATIONS,
                targets: this.ActionButton,
                y: this.game.canvas.height + this.ActionButton.height
            });
            this.tweens.add({
                targets: this.GameLogo,
                duration:TRANSITION_DURATIONS,
                alpha: 0
            });
        }
    }
}
