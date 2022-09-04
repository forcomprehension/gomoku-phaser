import { Geom, Scene, GameObjects, Input, Types} from "phaser";
import { CustomGridNewLinesAnim } from "./CustomGridNewLinesAnim";

type CustomGridOptions = {
    centerX: number,
    centerY: number,
    fieldSize: number,
    defaultCellCount: number,
    incrementStepSize: number,
    debug?: boolean
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

export type CellsClickInfo = {
    cellsCount: number,
    currentCell: number
    currentRow: number
};

type GraphicsOptions = {
    lineStyle: {
        width: number,
        color: number
    }
};

type SectorsFactory<T> = (centerX: number, centerY: number, rowIndex: number, cellIndex: number, cellSize: number) => T;

export class CustomGrid<Element> extends GameObjects.Graphics {

    /**
     * Add this component to scene
     *
     * @param scene
     * @param customGridOptions
     * @param options
     * @returns
     */
    static AddToScene<Element>(
        scene: Scene,
        customGridOptions: CustomGridOptions,
        options: GraphicsOptions,
        elementsFactory: SectorsFactory<Element>,
    ) {
        const object = new CustomGrid<Element>(scene, customGridOptions, options, elementsFactory);
        scene.add.existing(object);

        return object;
    }

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

    protected debugEnabled: boolean;

    /**
     * Default cell size (for scaling)
     */
    protected readonly baseCellSize: number;

    /**
     * Default cell count
     */
    protected readonly baseCellCount: number;

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
        styles: GraphicsOptions,
        protected readonly elementFactory: Function
    ) {
        super(scene, styles);

        const { centerX, centerY, fieldSize, defaultCellCount, incrementStepSize, debug } = customGridOptions;
        const rectX = centerX - fieldSize / 2;
        const rectY = centerY - fieldSize / 2;

        this.currentFieldSize = fieldSize;
        this.currentCellCount = defaultCellCount;
        this.incrementStepSize = incrementStepSize;
        this.baseCellSize = fieldSize / defaultCellCount;
        this.baseCellCount = defaultCellCount;
        this.debugEnabled = Boolean(debug);

        this.newLinesAnim = new CustomGridNewLinesAnim(scene, styles);
        scene.add.existing(this.newLinesAnim);
        this.linesSourceRect = new Geom.Rectangle(rectX, rectY, fieldSize, fieldSize);

        // Set line origins
        this.topLine = this.linesSourceRect.getLineA();
        this.leftLine = this.linesSourceRect.getLineD();

        const { currentCellCount } = this;

        for (let i = 1; i < this.currentCellCount; i++) {
            const horizontalLine = this.makeHorizontalLine(currentCellCount, i);
            const verticalLine = this.makeVerticalLine(currentCellCount, i);

            this.lines.horizontal.push(horizontalLine);
            this.lines.vertical.push(verticalLine);
        }

        this.getNewCenterPoints().forEach((row, rowIndex) => {
            row.forEach((coords, cellIndex) => {
                this.elementFactory(coords.x, coords.y, rowIndex, cellIndex, this.currentFieldSize / this.currentCellCount);
            });
        });

        this.render();
    }

    public startGrow() {
        // Update field size
        this.currentFieldSize += this.incrementStepSize * 2;
        const cellCountDiff = 2;
        const newCellCount = this.currentCellCount += cellCountDiff;
        const { currentFieldSize } = this;
        const currentCellSize = currentFieldSize / newCellCount;

        // Update shapes
        this.linesSourceRect.setSize(currentFieldSize);
        this.linesSourceRect.setPosition(this.linesSourceRect.x - this.incrementStepSize, this.linesSourceRect.y - this.incrementStepSize);

        // Update lines origins
        this.topLine = this.linesSourceRect.getLineA();
        this.leftLine = this.linesSourceRect.getLineD();

        const growTweenConfigsHorizontal = this.lines.horizontal.map<GrowTweenTargetPosition>((line: Geom.Line, index: number) => {
            const { y1, y2 } = this.topLine;
            const offset = currentCellSize * (index + 2);

            return {
                x1: line.x1 - this.incrementStepSize,
                x2: line.x2 + this.incrementStepSize,
                y1: y1 + offset,
                y2: y2 + offset
            };
        });

        const growTweenConfigsVertical = this.lines.vertical.map<GrowTweenTargetPosition>((line: Geom.Line, index: number) => {
            const { x1, x2 } = this.leftLine;
            const offset = currentCellSize * (index + 2);

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
            scale: this.baseCellCount / this.currentCellCount,
            positions: this.getNewCenterPoints(),
            baseCellSize: this.baseCellSize
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

    /**
     * Fills rows sequentially
     * 
     * @returns 
     */
    protected getNewCenterPoints() {
        const cellSize = this.currentFieldSize / this.currentCellCount;
        const centerStep = cellSize / 2;
        const x = this.topLine.x1;
        const y = this.topLine.y1;

        const matrix: Required<Types.Math.Vector2Like>[][] = [];
        for (let i = 0; i < this.currentCellCount; i++) {
            const row: Required<Types.Math.Vector2Like>[] = [];
            for (let j = 0; j < this.currentCellCount; j++) {
                const newX = x + centerStep + j * cellSize;
                const newY = y + centerStep + i * cellSize;

                if (this.debugEnabled) {
                    this.strokeRect(newX, newY, 1, 1);
                }

                row.push({x: newX, y: newY});
            }

            matrix.push(row);
        }

        return matrix;
    }

    public render() {
        this.clear();

        if (this.debugEnabled) {
            this.strokeRectShape(this.linesSourceRect);
            this.getNewCenterPoints();
        }

        this.lines.horizontal.forEach((line) => {
            this.strokeLineShape(line);
        });

        this.lines.vertical.forEach((line) => {
            this.strokeLineShape(line);
        });
    }

    public setDepth(value: number) {
        super.setDepth(value);

        this.newLinesAnim.setDepth(value - 1);

        this.lineStyle
        return this;
    }
}

export const CUSTOM_GRID_POINTER_UP = CustomGrid.name + ':' + 'pointerup';
// export type CustomGridPointerEventHandler = (localX: number, localY: number, fieldSize: number) => void
