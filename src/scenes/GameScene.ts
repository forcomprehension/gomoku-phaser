import { Game, GameObjects, Geom, Tweens } from "phaser";
import { CustomGrid } from "../components/CustomGrid";
import { GAME_SCENE } from "../constants/scenes";
import { BaseScene } from "./BaseScene";

type GrowTweenConfig = {
    x1: number,
    x2: number,
    y1: number,
    y2: number
};

export default class GameScene extends BaseScene {

    protected static readonly FIELD_SIZE = 300;
    protected static readonly INCREMENT_STEP_SIZE = 10;
    // @TODO: AlphaBlending
    protected static readonly LINES_MAX_ALPHA = 1;

    protected Grid: Phaser.GameObjects.Grid;
    protected currentCellCount = 5;
    protected lines: { horizontal: Phaser.Geom.Line[], vertical: Phaser.Geom.Line[]} = {
        horizontal: [],
        vertical: []
    };

    protected hGroup: GameObjects.Group;
    protected vGroup: GameObjects.Group;

    protected growTween: Tweens.Tween;
    protected growTweenVertical: Tweens.Tween;

    protected topLine: Phaser.Geom.Line;
    protected leftLine: Phaser.Geom.Line;

    protected graphics: Phaser.GameObjects.Graphics;

    protected layer: Phaser.GameObjects.Layer;

    protected currentFieldSize = GameScene.FIELD_SIZE;

    constructor() {
        super(GAME_SCENE);
    }

    preload() {
        super.preload();

        this.events.once(Phaser.Scenes.Events.TRANSITION_COMPLETE, () => {
            this.beginPlay();
        })

        this.beginPlay();
    }

    protected beginPlay(): void {
        super.beginPlay();
        const { screenHeight, screenWidth } = this.getScreenSize();

        const graphics = this.graphics = CustomGrid.AddToScene(this, {
            centerX: screenWidth / 2,
            centerY: screenHeight / 2,
            fieldSize: GameScene.FIELD_SIZE
        }, {
            lineStyle: {
                width: 4,
                color: 0x3e1318,
            }
        });

        graphics.setDepth(10);

        const size = GameScene.FIELD_SIZE;
        const rect2 = new Phaser.Geom.Rectangle(
            screenWidth / 2 - size / 2,
            screenHeight / 3 - size / 2,
            size,
            size
        );
        const g3 = this.add.graphics({
            lineStyle: {
                width: 4,
                color: 0x00ff00,
            }
        }).strokeRectShape(rect2);

        const mGraphics = this.add.graphics();
        mGraphics.fillStyle(0x111111, 0);
        mGraphics.fillRoundedRect(
            screenWidth / 2 - size / 2, screenHeight / 3 - size / 2, size, size
        );

        const mask = mGraphics.createGeometryMask();

        const rect = this.add.rectangle(screenWidth / 2 - size / 2, screenHeight / 3 - size / 2, size, size);
        rect.setStrokeStyle(1).setOrigin(0);
        rect.setInteractive();
        rect.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, function(this: GameScene) {
            console.info(arguments);
            // Increment step size
            this.currentFieldSize += (GameScene.INCREMENT_STEP_SIZE * 2);

            rect2.setSize(this.currentFieldSize, this.currentFieldSize);
            rect2.setPosition(rect2.x - GameScene.INCREMENT_STEP_SIZE, rect2.y - GameScene.INCREMENT_STEP_SIZE);
            rect.setSize(this.currentFieldSize, this.currentFieldSize);

            rect.setX(rect.x - GameScene.INCREMENT_STEP_SIZE);
            rect.setY(rect.y - GameScene.INCREMENT_STEP_SIZE);

            g3.clear();
            g3.strokeRectShape(rect2);
            // Update origin lines
            this.topLine = rect2.getLineA();
            this.leftLine = rect2.getLineD();

            // mGraphics.fillRoundedRect(
            //     screenWidth / 2 - this.currentFieldSize / 2, screenHeight / 3 - this.currentFieldSize / 2, this.currentFieldSize, this.currentFieldSize
            // );

            this.onFieldClick();
        }, this);

        this.topLine = rect2.getLineA();
        this.leftLine = rect2.getLineD();

        const cellCount = this.currentCellCount;


        // graphics.setBlendMode(Phaser.BlendModes.COPY)

// layer.setMask(mask);

        for (let i = 1; i < cellCount; i++) {
            const horizontalLine = this.makeHorizontalLine(cellCount, i);
            const verticalLine = this.makeVerticalLine(cellCount, i);
            graphics.strokeLineShape(horizontalLine);
            graphics.strokeLineShape(verticalLine);

            this.lines.horizontal.push(horizontalLine);
            this.lines.vertical.push(verticalLine);
        }
    }

    public onFieldClick() {
        const newCellCount = this.currentCellCount += 2;
        const size = this.currentFieldSize;

        const growTweenConfigsHorizontal = this.lines.horizontal.map<GrowTweenConfig>((line: Geom.Line, index: number) => {
            const { y1, y2 } = this.topLine;
            const offset = size / newCellCount * (index + 2);

            return {
                x1: line.x1 - GameScene.INCREMENT_STEP_SIZE,
                x2: line.x2 + GameScene.INCREMENT_STEP_SIZE,
                y1: y1 + offset,
                y2: y2 + offset
            };
        });

        const growTweenConfigsVertical = this.lines.vertical.map<GrowTweenConfig>((line: Geom.Line, index: number) => {
            const { x1, x2 } = this.leftLine;
            const offset = size / newCellCount * (index + 2);

            return {
                x1: x1 + offset,
                x2: x2 + offset,
                y1: line.y1 + GameScene.INCREMENT_STEP_SIZE,
                y2: line.y2 - GameScene.INCREMENT_STEP_SIZE
            };
        });

        this.growTween = this.startGrowingTween(
            this.lines.horizontal.concat(this.lines.vertical),
            growTweenConfigsHorizontal.concat(growTweenConfigsVertical),
            this.graphics
        );

        this.renderNewLinesOnFieldGrow();
    }

    protected makeVerticalLine(currentCellCount: number, currentIndex: number) {
        const verticalLine = Phaser.Geom.Line.Clone(this.leftLine);
        const { x1: vX1, x2: vX2, y1: vY1, y2: vY2 } = this.leftLine;

        const offset = (coordinate: number, mul: number = currentIndex) => coordinate + this.currentFieldSize / currentCellCount * mul;

        verticalLine.setTo(offset(vX1), vY1, offset(vX2), vY2);

        return verticalLine;
    }

    protected makeHorizontalLine(currentCellCount: number, currentIndex: number) {
        const horizontalLine = Phaser.Geom.Line.Clone(this.topLine);
        const { x1: hX1, x2: hX2, y1: hY1, y2: hY2 } = this.topLine;

        const offset = (coordinate: number, mul: number = currentIndex) => coordinate + this.currentFieldSize / currentCellCount * mul;

        horizontalLine.setTo(hX1, offset(hY1), hX2, offset(hY2));

        return horizontalLine;
    }

    protected renderNewLinesOnFieldGrow() {
        const g3 = this.add.graphics({
            lineStyle: {
                width: 4,
                color: 0x3e1318,
            }
        }).setAlpha(0).setDepth(5);

        // @TODO:
        const nextCellCount = this.lines.horizontal.length + 1 + 2;

        const horizontalLineFirst = this.makeHorizontalLine(nextCellCount, 1);
        const horizontalLineLast = this.makeHorizontalLine(nextCellCount, nextCellCount - 1);

        const verticalLineFirst = this.makeVerticalLine(nextCellCount, 1);
        const verticalLineLast = this.makeVerticalLine(nextCellCount, nextCellCount - 1);

        this.lines.horizontal = [horizontalLineFirst, ...this.lines.horizontal, horizontalLineLast];
        this.lines.vertical = [verticalLineFirst, ...this.lines.vertical, verticalLineLast];

        g3.strokeLineShape(horizontalLineFirst);
        g3.strokeLineShape(horizontalLineLast);

        g3.strokeLineShape(verticalLineFirst);
        g3.strokeLineShape(verticalLineLast);

        // @TODO: WITH MASK?
        this.tweens.add({
            targets: g3,
            alpha: 1,
            delay: 100,
            duration: 300
        }).once('complete', () => {
            g3.clear();

            this.graphics.strokeLineShape(horizontalLineFirst);
            this.graphics.strokeLineShape(horizontalLineLast);
            this.graphics.strokeLineShape(verticalLineFirst);
            this.graphics.strokeLineShape(verticalLineLast);
        });
    }


    protected startGrowingTween(
        targets: Phaser.Geom.Line[],
        tweenConfig: GrowTweenConfig[],
        graphics: GameObjects.Graphics,
    ): Tweens.Tween {
        const configGetterFactory = (prop: keyof GrowTweenConfig) => {
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
                graphics.strokeLineShape(line);
            },
            paused: true,
            onUpdateScope: this
        }).play();
    }

    update(time: number, delta: number): void {
        if (this.growTween && this.growTween.isPlaying()) {
            this.graphics.clear();
            this.growTween.update(time, delta);
        }
    }
}
