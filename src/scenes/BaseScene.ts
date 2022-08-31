import { Tweens } from "phaser";

export class BaseScene extends Phaser.Scene {

    protected static readonly PENTAGON_FADE_TIME = 500;
    protected static readonly PENTAGON_SPAWN_STEP = 500;
    protected static readonly PENTAGON_MAX_ALPHA = .1;

    constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
        super(config);
    }

    preload() {
        this.load.image('pentagon', 'assets/pentagon.svg');
        this.load.glsl("background", "assets/shaders/background.frag");
    }

    public getScreenSize() {
        const { width: screenWidth, height: screenHeight } = this.game.canvas;
        return { screenHeight, screenWidth };
    }

    protected beginPlay() {
        // Не учитываем здесь ресайз
        const { screenWidth, screenHeight } = this.getScreenSize();

        // Background gradient
        this.make.shader({
            x: 0,
            y: 0,
            key: "background",
            width: screenWidth,
            height: screenHeight,
            add: true,
            depth: -2,
        }).setOrigin(0);

         // Spawn pentagons
         new Array(Math.ceil(screenWidth / 30)).fill(null).forEach((_, i) => {
            this.time.addEvent({
                callback: this.spawnPentagon,
                callbackScope: this,
                delay: i * BaseScene.PENTAGON_SPAWN_STEP
            });
         });
    }

    protected spawnPentagon() {
        // Не учитываем здесь ресайз
        const { screenWidth, screenHeight } = this.getScreenSize();

        const generator = Phaser.Math.RND;
        const scale = generator.between(1.5, 5) / 10;
        const x = generator.between(0, screenWidth);
        const y = generator.between(screenHeight / 3, screenHeight);
        const targetAngle = generator.between(90, 180);
        const speed = generator.between(8000, 13000);

        const image = this.make.image({
            x,
            y,
            scale,
            alpha: 0,
            key: 'pentagon'
        }, true);
        const targetY = 0 - image.height;

        // Fade in on beginPlay
        this.tweens.add({
            targets: image,
            // For constant speed
            duration: speed * screenHeight / y,
            angle: targetAngle,
            y: targetY,
            onUpdate: (tween: Phaser.Tweens.Tween) => {
                if (!image.scene.sys.isTransitioning()) {
                    image.setAlpha(Math.min(tween.elapsed / BaseScene.PENTAGON_FADE_TIME, 1) * BaseScene.PENTAGON_MAX_ALPHA);
                }
            }
        }).once('complete', () => {
            // Set start Y below canvas
            image.setY(screenHeight + image.height);

            // Then do regular looped movement
            this.tweens.add({
                targets: image,
                y: targetY,
                angle: targetAngle,
                duration: speed,
                loop: -1
            }).on('loop', (tween: Tweens.Tween) => {
                tween.updateTo('angle',  generator.angle());
            });
        });

        // Fade out on transition out
        this.events.once(Phaser.Scenes.Events.TRANSITION_OUT, () => {
            this.tweens.add({
                targets: image,
                duration: BaseScene.PENTAGON_FADE_TIME,
                alpha: 0
            });
        });
    }
}
