import { Game, Input, Tweens } from "phaser";
import { ActionButton } from "../components/ActionButton";
import { AI } from "../components/AI";
import { CustomGrid, GrowTweenTargetPosition } from "../components/CustomGrid";
import { FieldSector, FieldSectorState, SectorsContainer } from "../components/FieldSectors";
import { ON_NEXT_TURN, TurnManager } from "../components/TurnManager";
import { GAME_SCENE, HINT_SCENE, HINT_SCENE_TRANSITION_TIME } from "../constants/scenes";
import { addCenteredText } from "../utils/scene";
import { BaseScene } from "./BaseScene";

export default class GameScene extends BaseScene {

    protected static readonly FIELD_SIZE = 300;
    protected static readonly INCREMENT_STEP_SIZE = 10;
    protected static readonly DEFAULT_CELLS_COUNT = 5;
    protected static readonly GRAPHICS_COLOR = 0x3e1318;
    protected static readonly RECTANGLE_ELEMENTS_PADDING = 8;

    protected readonly turnManager: TurnManager = new TurnManager();
    protected readonly sectorsContainer: SectorsContainer = new SectorsContainer();

    protected readonly AI: AI = new AI(FieldSectorState.O);
    protected playerSign: FieldSectorState = FieldSectorState.X;

    protected gomokuField: CustomGrid<FieldSector>;
    protected debugEnabled: boolean = false;

    constructor() {
        super(GAME_SCENE);
    }

    preload() {
        super.preload();

        const cb = () => {
            this.beginPlay();
            this.turnManager.on(ON_NEXT_TURN, (turn: FieldSectorState) => {
                this.AI.onTurnChange(turn);
            });
        };

        this.events.once(Phaser.Scenes.Events.TRANSITION_COMPLETE, cb)

        // @TODO: remove after test
        cb();
    }

    protected beginPlay() {
        super.beginPlay();

        const { screenHeight, screenWidth } = this.getScreenSize();

        this.gomokuField = CustomGrid.AddToScene<FieldSector>(this, {
            centerX: screenWidth / 2,
            centerY: screenHeight / 3,
            defaultCellCount: GameScene.DEFAULT_CELLS_COUNT,
            fieldSize: GameScene.FIELD_SIZE,
            incrementStepSize: GameScene.INCREMENT_STEP_SIZE,
            debug: this.debugEnabled
        }, {
            lineStyle: {
                width: 4,
                color: GameScene.GRAPHICS_COLOR,
            }
        }, this.fieldSectorFactory.bind(this)).setDepth(10);

        this.AI.setFieldSectorsMatrix(this.sectorsContainer.getFieldSectorsMatrix());
        this.turnManager.startGame(this.playerSign);
    }

    public fieldSectorFactory(centerX: number, centerY: number, rowIndex: number, cellIndex: number, baseCellSize: number, scale: number = 1) {
        const obj = FieldSector.AddToScene(
            this,
            centerX,
            centerY,
            baseCellSize - Math.floor(GameScene.RECTANGLE_ELEMENTS_PADDING * scale),
            scale
        );

        if (this.debugEnabled) {
            obj.setFillStyle(0xDFDFDF);
        }

        this.sectorsContainer.setByRowAndCell(rowIndex, cellIndex, obj);

        obj.setInteractive({
            useHandCursor: true,
        }).on(Input.Events.GAMEOBJECT_POINTER_UP, () => {
            this.handleMarkField.call(obj, this.playerSign);
        });

        return obj;
    }

    public win(winner: FieldSectorState) {
        this.gomokuField.disableInteractive();
        const sectors = this.sectorsContainer.getFieldSectorsMatrix().flat();
        const { screenWidth, screenHeight } = this.getScreenSize();

        const texts = sectors.map((sector) => {
            sector.disableInteractive();
            return sector.sceneText;
        });

        const playAgainBtn = new ActionButton(this, "Играть еще", screenWidth / 2, screenHeight + 100);
        this.add.existing(playAgainBtn);
        playAgainBtn.setInteractive();
        this.enableInput(true);

        // Move to play again
        playAgainBtn.onClick(() => {
            const isStarted = this.scene.transition({
                target: HINT_SCENE,
                duration: HINT_SCENE_TRANSITION_TIME
            });

            if (isStarted) {
                this.tweens.add({
                    targets: [winSign, playAgainBtn],
                    alpha: 0,
                    duration: HINT_SCENE_TRANSITION_TIME / 2
                });
            }
        });

        const winSign = addCenteredText(this, 50, FieldSectorState[winner])
            .setAlpha(1)
            .setFontSize(64)
            .setColor('#' + GameScene.GRAPHICS_COLOR.toString(16));

        const tween = this.tweens.createTimeline();
        tween.add({
            targets: [this.gomokuField, ...texts],
            duration: 500,
            alpha: 0
        });
        tween.add({
            targets: winSign,
            delay: 300,
            duration: 500,
            alpha: 1
        });
        tween.add({
            targets: playAgainBtn,
            duration: 500,
            y: screenHeight / 10 * 9
        });

        tween.play();
    }


    protected handleMarkField(this: FieldSector, sign: FieldSectorState) {
        const scene = this.scene as GameScene;
        if (scene.turnManager.canMove(sign) && scene.sectorsContainer.tryToFillSector(this, sign)) {
            scene.enableInput(false);

            scene.tweens.add({
                targets: this.sceneText,
                alpha: 1,
                duration: 250
            }).on("complete", () => {
                scene.win(FieldSectorState.X);
                return;
                if (scene.sectorsContainer.doesContainerNearlyFilled()) {
                    scene.emitFieldGrow().once('complete', () => {
                        scene.enableInput(true);
                        scene.turnManager.nextTurn();
                    });
                } else {
                    scene.enableInput(true);
                    scene.turnManager.nextTurn();
                }
            });
        }
    }

    public enableInput(flag: boolean) {
        this.input.enabled = flag;
    }

    protected processNewCells(positions: Required<Phaser.Types.Math.Vector2Like>[][], baseCellSize: number, scale: number) {
        // Create new sectors and animate old
        const sectorsTargetsForAnim: FieldSector[] = [];
        positions.forEach((rows, rIndex) => {
            rows.forEach((targetPosition, cIndex) => {
                const sector = this.sectorsContainer.getElement(rIndex, cIndex);
                if (typeof sector === 'undefined') {
                    const element = this.fieldSectorFactory(targetPosition.x, targetPosition.y, rIndex, cIndex, baseCellSize, scale);
                    this.sectorsContainer.setByRowAndCell(rIndex, cIndex, element);
                } else {
                    sector.setNextPosition(targetPosition);
                    sectorsTargetsForAnim.push(sector);
                }
            });
        });

        return sectorsTargetsForAnim;
    }

    public emitFieldGrow() {
        const { targets, growConfigs, scale, positions, baseCellSize } = this.gomokuField.startGrow();
        this.gomokuField.chargeAnimQueue();
        this.sectorsContainer.inflate(positions.length);

        // @TODO: TIMELINE
        this.startGrowingTween(targets, growConfigs);

        this.tweens.add({
            targets: this.processNewCells(positions, baseCellSize, scale),
            nestedScale: scale,
            nestedPosition: {
                getStart(target: FieldSector) {
                    return target.nestedPosition;
                },
                getEnd(target: FieldSector) {
                    return target.getNextPosition();
                }
            },
            duration: 500,
        });

        return this.tweens.add({
            targets: this.gomokuField.newLinesAnim,
            alpha: 1,
            delay: 100,
            duration: 400
        }).once('complete', () => {
            this.gomokuField.replaceAnimatedLines();
        });
    }

    /**
     * @TODO: Make custom grid as a target
     *
     * @param targets
     * @param tweenConfig
     */
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
            onUpdate(this: GameScene) {
                this.gomokuField.render();
            },
            onUpdateScope: this
        });
    }
}
