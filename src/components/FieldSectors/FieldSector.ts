import { GameObjects, Scene, Types } from "phaser";

export enum FieldSectorState {
    EMPTY,
    X,
    O
};

export class FieldSector extends GameObjects.Rectangle {
    static AddToScene(scene: Scene, x: number, y: number, size: number, targetScale: number) {
        const text = scene.add.text(x, y, "", {
            fontSize: "48px",
            color: "black"
        }).setOrigin(.5)
            .setAlpha(0)
            .setScale(targetScale);

        text.setDepth(text.depth + 2);

        const object = new this(scene, x, y, size, text);
        scene.add.existing(object);
        object.setScale(targetScale);

        return object;
    }

    protected currentState: FieldSectorState = FieldSectorState.EMPTY;
    protected isLocked: boolean = false;
    protected nextPosition: Required<Types.Math.Vector2Like> = { x: 0 , y: 0 };

    constructor(
        scene: Scene,
        x: number,
        y: number,
        baseSize: number,
        public readonly sceneText: GameObjects.Text
    ) {
        super(scene, x, y, baseSize, baseSize);
    }


    public set nestedScale(value) {
        this.setScale(value);
        this.sceneText.setScale(value);
    }

    public get nestedScale() {
        return this.scale;
    }

    public set nestedPosition({ x, y }: Required<Types.Math.Vector2Like>) {
        this.setPosition(x, y);
        this.sceneText.setPosition(x, y);
    }

    public get nestedPosition() {
        return { x: this.x, y: this.y };
    }

    public setNextPosition(value: Required<Types.Math.Vector2Like>) {
        this.nextPosition = value;
    }

    public getNextPosition() {
        return this.nextPosition;
    }

    public lockAndFillSector(newState: FieldSectorState) {
        if (this.currentState !== FieldSectorState.EMPTY || this.isLocked) {
            return false;
        }

        this.currentState = newState;
        this.sceneText.setText(FieldSectorState[newState]);
        this.setLocked(true);

        return true;
    }

    public setLocked(flag: boolean) {
        this.isLocked = flag;
    }

    public getCenterCoords() {
        return {
            x: this.x,
            y: this.y
        };
    }
}
