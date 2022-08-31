import { Geom, Scene, Types, GameObjects } from "phaser";

type CustomGridOptions = {
    centerX: number,
    centerY: number,
    fieldSize: number
};

export class CustomGrid extends GameObjects.Graphics {

    protected readonly linesSourceRect: Geom.Rectangle;

    static AddToScene(
        scene: Scene,
        customGridOptions: CustomGridOptions,
        options?: Types.GameObjects.Graphics.Options
    ) {
        const object = new CustomGrid(scene, customGridOptions, options);
        scene.add.existing(object);

        return object;
    }

    constructor(
        scene: Scene,
        customGridOptions: CustomGridOptions,
        styles?: Types.GameObjects.Graphics.Styles
    ) {
        super(scene, styles);
        const { centerX, centerY, fieldSize } = customGridOptions;
        const rectX = centerX - fieldSize / 2;
        const rectY = centerY - fieldSize / 2;

        this.linesSourceRect = new Geom.Rectangle(rectX, rectY);
    }
}