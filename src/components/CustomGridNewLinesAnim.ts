
import { GameObjects, Geom, Scene, Types } from "phaser";

type AnimQueue = [
    Geom.Line,
    Geom.Line,
    Geom.Line,
    Geom.Line
];

export class CustomGridNewLinesAnim extends GameObjects.Graphics {
    protected animQueue: AnimQueue | [];

    constructor(scene: Scene, options?: Types.GameObjects.Graphics.Styles) {
        super(scene, options);
    }

    public setAnimQueue(hFirst: Geom.Line, hLast: Geom.Line, vFirst: Geom.Line, vLast: Geom.Line) {
        this.setAlpha(0);

        this.animQueue = [hFirst, hLast, vFirst, vLast];

        this.animQueue.forEach((line) => {
            this.strokeLineShape(line);
        })
    }

    public ejectFromAnimQueue(): AnimQueue {
        this.clear();

        const slice = this.animQueue.slice() as AnimQueue;

        this.animQueue = [];

        return slice;
    }
}