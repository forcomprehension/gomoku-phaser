import { Resolver } from "matter";
import { Game, Input, Tweens } from "phaser";
import { ActionButton } from "../components/ActionButton";
import { AI, AI_MOVE_EVENT, WIN_EVENT } from "../components/AI";
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

    protected readonly AI: AI = new AI(FieldSectorState.X);
    protected playerSign: FieldSectorState = FieldSectorState.O;

    protected gomokuField: CustomGrid<FieldSector>;
    protected debugEnabled: boolean = false;
    protected gameHasEnded: boolean = false;

    constructor() {
        super(GAME_SCENE);
    }

    preload() {
        super.preload();

        const cb = () => {
            this.AI.on(AI_MOVE_EVENT, ({ row, cell }: any) => {
                const element = this.sectorsContainer.getElement(row, cell);
                this.processMove.call(element, this.AI.sign, true);
            });

            this.turnManager.on(ON_NEXT_TURN, (turn: FieldSectorState) => {
                this.AI.onTurnChange(turn);
            });

            this.beginPlay();

            this.AI.on(WIN_EVENT, (isAI: boolean) => {
                this.gameHasEnded = true;
                const winSign = isAI ? this.AI.sign : this.playerSign;
                this.win(winSign)
            });
        };

        this.events.once(Phaser.Scenes.Events.TRANSITION_COMPLETE, cb);
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
        this.AI.init();
        this.turnManager.startGame(this.AI.sign);
    }

    /**
     * Make field sector object
     * 
     * @param centerX 
     * @param centerY 
     * @param rowIndex 
     * @param cellIndex 
     * @param baseCellSize 
     * @param scale 
     * @returns 
     */
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
            this.processMove.call(obj, this.playerSign, false);
        });

        return obj;
    }

    /**
     * Process win sequence
     *
     * @param winner
     */
    protected win(winner: FieldSectorState) {
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
                duration: HINT_SCENE_TRANSITION_TIME,
                remove: true
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
            .setAlpha(0)
            .setFontSize(64)
            .setColor('#ffffff');

        const { rowFrom, cellFrom, rowTo, cellTo } = this.AI.getWinLine();
        const centerFrom = this.sectorsContainer.getElement(rowFrom, cellFrom).getCenterCoords();
        const centerTo = this.sectorsContainer.getElement(rowTo, cellTo).getCenterCoords();

        const winLineGraph = this.add.graphics({
            lineStyle: {
                width: 4,
                color: GameScene.GRAPHICS_COLOR,
            }
        }).setDepth(12);

        const tween = this.tweens.createTimeline();
        tween.add({
            duration: 500,
            targets: winLineGraph,
            x2: centerTo.x,
            y2: centerTo.y,
            onUpdate(tween: Tweens.Tween) {
                winLineGraph.clear();
                winLineGraph.moveTo(centerFrom.x, centerFrom.y);
                winLineGraph.lineTo(
                    centerFrom.x - (centerFrom.x - centerTo.x) * tween.progress,
                    centerFrom.y - (centerFrom.y - centerTo.y) * tween.progress
                );
                winLineGraph.stroke();
            }
        });
        tween.add({
            targets: [this.gomokuField, ...texts, winLineGraph],
            duration: 500,
            delay: 500,
            alpha: 0
        });
        tween.add({
            targets: winSign,
            delay: 500,
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

    protected processMove(this: FieldSector, sign: FieldSectorState, isAIMove: boolean) {
        const scene = this.scene as GameScene;
        if (scene.turnManager.canMove(sign) && scene.sectorsContainer.tryToFillSector(this, sign)) {
            scene.enableInput(false);

            scene.tweens.add({
                targets: this.sceneText,
                alpha: 1,
                duration: 250
            }).on("complete", async () => {
                if (scene.gameHasEnded) {
                    scene.enableInput(true);
                    return;
                }

                if (scene.sectorsContainer.doesContainerNearlyFilled()) {
                    await new Promise<void>((resolve) => {
                        scene.emitFieldGrow().once('complete', () => {
                            scene.AI.growAIScene(); // Sync scene with AI

                            resolve();
                        })
                    });
                }

                const sector = scene.sectorsContainer.getIndexesBySector(this);
                if (sector) {
                    const { y: row, x: cell } = sector;
                    if (!isAIMove) { // AI Scene sync move
                        scene.AI.move(row, cell, false);
                    }

                    scene.turnManager.nextTurn();
                    scene.enableInput(true);
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
        // Prepare
        const { targets, growConfigs, scale, positions, baseCellSize } = this.gomokuField.startGrow();
        this.gomokuField.chargeAnimQueue();
        this.sectorsContainer.inflate(positions.length);

        // Common duration
        const duration = 500;

        const configGetterFactory = (prop: keyof GrowTweenTargetPosition) => {
            // Gets value from tween config by targetIndex
            return function() {
                return growConfigs[arguments[3]][prop];
            }
        };
        this.tweens.add({
            targets: targets.slice(),
            duration,
            x1: configGetterFactory('x1'),
            x2: configGetterFactory('x2'),
            y1: configGetterFactory('y1'),
            y2: configGetterFactory('y2'),
            onUpdate(this: GameScene) {
                this.gomokuField.render();
            },
            onUpdateScope: this
        });

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
            duration,
        });

        return this.tweens.add({
            targets: this.gomokuField.newLinesAnim,
            alpha: 1,
            delay: 100,
            duration: duration - 100
        }).once('complete', () => {
            this.gomokuField.replaceAnimatedLines();
        });
    }
}
