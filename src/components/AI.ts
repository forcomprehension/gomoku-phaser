import { FieldSector, FieldSectorState } from "./FieldSectors";

export class AI {
    protected myTurn: boolean = false;
    protected fieldSectorsMatrix: Readonly<Readonly<Readonly<FieldSector>[]>[]>
    constructor(protected readonly sign: FieldSectorState) {}

    public onTurnChange(turn: FieldSectorState) {
        this.myTurn = turn === this.sign;
    }

    public setFieldSectorsMatrix(matrix: Readonly<Readonly<Readonly<FieldSector>[]>[]>) {
        this.fieldSectorsMatrix = matrix;
    }
}
