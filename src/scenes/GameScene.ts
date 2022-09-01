import { Tweens } from "phaser";
import { CustomGrid, CUSTOM_GRID_POINTER_UP, GrowTweenTargetPosition } from "../components/CustomGrid";
import { GAME_SCENE } from "../constants/scenes";
import { BaseScene } from "./BaseScene";

export default class GameScene extends BaseScene {

    protected static readonly FIELD_SIZE = 300;
    protected static readonly INCREMENT_STEP_SIZE = 10;
    protected static readonly DEFAULT_CELLS_COUNT = 5;

    protected customGrid: CustomGrid;

    constructor() {
        super(GAME_SCENE);
    }

    preload() {
        super.preload();

        this.events.once(Phaser.Scenes.Events.TRANSITION_COMPLETE, () => {
            this.beginPlay();
        })

        // @TODO: remove after test
        this.beginPlay();
    }

    protected beginPlay(): void {
        super.beginPlay();

        const { screenHeight, screenWidth } = this.getScreenSize();

        const graphics = this.customGrid = CustomGrid.AddToScene(this, {
            centerX: screenWidth / 2,
            centerY: screenHeight / 3,
            defaultCellCount: GameScene.DEFAULT_CELLS_COUNT,
            fieldSize: GameScene.FIELD_SIZE,
            incrementStepSize: GameScene.INCREMENT_STEP_SIZE,
        }, {
            lineStyle: {
                width: 4,
                color: 0x3e1318,
            }
        });

        graphics.setDepth(10);
        graphics.on(CUSTOM_GRID_POINTER_UP, this.onFieldClick, this);
    }

    public onFieldClick() {
        const { targets, growConfigs } = this.customGrid.startGrow();

        this.startGrowingTween(targets, growConfigs);

        this.renderNewLinesOnFieldGrow();
    }

    protected renderNewLinesOnFieldGrow() {
        this.customGrid.chargeAnimQueue();

        // @TODO: WITH MASK?
        this.tweens.add({
            targets: this.customGrid.newLinesAnim,
            alpha: 1,
            delay: 100,
            duration: 300
        }).once('complete', () => {
            this.customGrid.replaceAnimatedLines();
        });
    }


    protected startGrowingTween(
        targets: Phaser.Geom.Line[],
        tweenConfig: GrowTweenTargetPosition[],
    ): Tweens.Tween {
        const configGetterFactory = (prop: keyof GrowTweenTargetPosition) => {
            // Gets value from tween config by targetIndex
            return function() {
                return tweenConfig[arguments[3]][prop];
            }
        };

        return this.tweens.add({
            targets: targets.slice(),
            duration: 500,
            x1: configGetterFactory('x1'),
            x2: configGetterFactory('x2'),
            y1: configGetterFactory('y1'),
            y2: configGetterFactory('y2'),
            onUpdate(this: GameScene, _: Tweens.Tween, line: Phaser.Geom.Line) {
                this.customGrid.render();
            },
            onUpdateScope: this
        });
    }
}
