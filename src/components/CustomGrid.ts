import { Geom, Scene, Types, GameObjects, Input, Tweens } from "phaser";
import { CustomGridNewLinesAnim } from "./CustomGridNewLinesAnim";

type CustomGridOptions = {
    centerX: number,
    centerY: number,
    fieldSize: number,
    defaultCellCount: number,
    incrementStepSize: number
};

type LinesContainer = {
    horizontal: Phaser.Geom.Line[],
    vertical: Phaser.Geom.Line[]
}

export type GrowTweenTargetPosition = {
    x1: number,
    x2: number,
    y1: number,
    y2: number
};

export class CustomGrid extends GameObjects.Graphics {

    /**
     * Add this component to scene
     * 
     * @param scene 
     * @param customGridOptions 
     * @param options 
     * @returns 
     */
    static AddToScene(
        scene: Scene,
        customGridOptions: CustomGridOptions,
        options?: Types.GameObjects.Graphics.Options
    ) {
        const object = new CustomGrid(scene, customGridOptions, options);
        scene.add.existing(object);

        return object;
    } 

    /**
     * Rect for events
     */
    protected eventsRect: GameObjects.Rectangle;

    /**
     * Source for lines spawning
     */
    protected readonly linesSourceRect: Geom.Rectangle;

    /**
     * New lines animation component
     */
    public readonly newLinesAnim: CustomGridNewLinesAnim;

    /**
     * Field size
     */
    protected currentFieldSize: number;

    /**
     * Width and height growing at each level
     */
    protected readonly incrementStepSize: number;

    /**
     * Horizontal line source
     */
    protected topLine: Geom.Line;

    /**
     * Vertical line source
     */
    protected leftLine: Geom.Line;

    /**
     * Current cells and rows count
     */
    protected currentCellCount: number;

    /**
     * Lines container
     */
    protected lines: LinesContainer = {
        horizontal: [],
        vertical: []
    };

    /**
     * Ctor
     *
     * @param scene
     * @param customGridOptions
     * @param styles
     */
    constructor(
        scene: Scene,
        customGridOptions: CustomGridOptions,
        styles?: Types.GameObjects.Graphics.Styles
    ) {
        super(scene, styles);

        const { centerX, centerY, fieldSize, defaultCellCount, incrementStepSize } = customGridOptions;
        const rectX = centerX - fieldSize / 2;
        const rectY = centerY - fieldSize / 2;

        this.currentFieldSize = fieldSize;
        this.currentCellCount = defaultCellCount;
        this.incrementStepSize = incrementStepSize;

        this.newLinesAnim = new CustomGridNewLinesAnim(scene, styles);
        scene.add.existing(this.newLinesAnim);
        this.linesSourceRect = new Geom.Rectangle(rectX, rectY, fieldSize, fieldSize);
        // @TODO:
        this.eventsRect = scene.add.rectangle(rectX, rectY, fieldSize, fieldSize)
            .setOrigin(0);

        this.eventsRect.setStrokeStyle(1); // @TODO: debug
        this.eventsRect.setInteractive();

        // Set line origins
        this.topLine = this.linesSourceRect.getLineA();
        this.leftLine = this.linesSourceRect.getLineD();

        this.eventsRect.on(Input.Events.GAMEOBJECT_POINTER_UP, () => {
            // Update field size
            this.currentFieldSize += this.incrementStepSize * 2;
            const { currentFieldSize } = this;

            // Update shapes
            this.linesSourceRect.setSize(currentFieldSize);
            this.eventsRect.setSize(currentFieldSize, currentFieldSize);
            // @TODO: CopyPosition?
            this.linesSourceRect.setPosition(this.linesSourceRect.x - this.incrementStepSize, this.linesSourceRect.y - this.incrementStepSize);
            this.eventsRect.setPosition(this.eventsRect.x - this.incrementStepSize, this.eventsRect.y - this.incrementStepSize);

            // @TODO: Debug ? Needed?
            // this.strokeRectShape(this.linesSourceRect);

            // Update lines origins
            this.topLine = this.linesSourceRect.getLineA();
            this.leftLine = this.linesSourceRect.getLineD();

            this.emit(CUSTOM_GRID_POINTER_UP);
        });

        const { currentCellCount } = this;

        for (let i = 1; i < this.currentCellCount; i++) {
            const horizontalLine = this.makeHorizontalLine(currentCellCount, i);
            const verticalLine = this.makeVerticalLine(currentCellCount, i);

            this.lines.horizontal.push(horizontalLine);
            this.lines.vertical.push(verticalLine);
        }

        this.render();
    }

    public startGrow() {
        const newCellCount = this.currentCellCount += 2;
        const size = this.currentFieldSize;

        const growTweenConfigsHorizontal = this.lines.horizontal.map<GrowTweenTargetPosition>((line: Geom.Line, index: number) => {
            const { y1, y2 } = this.topLine;
            const offset = size / newCellCount * (index + 2);

            return {
                x1: line.x1 - this.incrementStepSize,
                x2: line.x2 + this.incrementStepSize,
                y1: y1 + offset,
                y2: y2 + offset
            };
        });

        const growTweenConfigsVertical = this.lines.vertical.map<GrowTweenTargetPosition>((line: Geom.Line, index: number) => {
            const { x1, x2 } = this.leftLine;
            const offset = size / newCellCount * (index + 2);

            return {
                x1: x1 + offset,
                x2: x2 + offset,
                y1: line.y1 + this.incrementStepSize,
                y2: line.y2 - this.incrementStepSize
            };
        });

        return {
            targets: this.lines.horizontal.concat(this.lines.vertical),
            growConfigs: growTweenConfigsHorizontal.concat(growTweenConfigsVertical),
        };
    }

    public chargeAnimQueue() {
        const { currentCellCount } = this;

        const horizontalLineFirst = this.makeHorizontalLine(currentCellCount, 1);
        const horizontalLineLast = this.makeHorizontalLine(currentCellCount, currentCellCount - 1);

        const verticalLineFirst = this.makeVerticalLine(currentCellCount, 1);
        const verticalLineLast = this.makeVerticalLine(currentCellCount, currentCellCount - 1);

        this.newLinesAnim.setAnimQueue(
            horizontalLineFirst,
            horizontalLineLast,
            verticalLineFirst,
            verticalLineLast
        );
    }

    public replaceAnimatedLines() {
        const newLines = this.newLinesAnim.ejectFromAnimQueue();
        const [hFirst, hLast, vFirst, vLast] = newLines;

        this.lines.horizontal = [hFirst, ...this.lines.horizontal, hLast];
        this.lines.vertical = [vFirst, ...this.lines.vertical, vLast];

        this.render();
    }

    protected makeVerticalLine(currentCellCount: number, currentIndex: number) {
        const verticalLine = Geom.Line.Clone(this.leftLine);
        const { x1: vX1, x2: vX2, y1: vY1, y2: vY2 } = this.leftLine;

        const offset = (coordinate: number, mul: number = currentIndex) => coordinate + this.currentFieldSize / currentCellCount * mul;

        verticalLine.setTo(offset(vX1), vY1, offset(vX2), vY2);

        return verticalLine;
    }

    protected makeHorizontalLine(currentCellCount: number, currentIndex: number) {
        const horizontalLine = Geom.Line.Clone(this.topLine);
        const { x1: hX1, x2: hX2, y1: hY1, y2: hY2 } = this.topLine;

        const offset = (coordinate: number, mul: number = currentIndex) => coordinate + this.currentFieldSize / currentCellCount * mul;

        horizontalLine.setTo(hX1, offset(hY1), hX2, offset(hY2));

        return horizontalLine;
    }

    public render() {
        this.clear();

        this.lines.horizontal.forEach((line) => {
            this.strokeLineShape(line);
        });

        this.lines.vertical.forEach((line) => {
            this.strokeLineShape(line);
        });
    }
}

export const CUSTOM_GRID_POINTER_UP = CustomGrid.name + ':' + 'pointerup';