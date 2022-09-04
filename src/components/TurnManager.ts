import { FieldSectorState } from "./FieldSectors";

export class TurnManager extends Phaser.Events.EventEmitter {
    protected isRunning: boolean = false;
    protected currentTurn: FieldSectorState;

    public startGame(currentTurn: FieldSectorState) {
        if (!this.isRunning) {
            this.currentTurn = currentTurn;
            this.emit(ON_NEXT_TURN, this.currentTurn);
        } else {
            console.warn("AI is already running!");
        }
    }

    public canMove(player: FieldSectorState) {
        return player === this.currentTurn;
    }

    public nextTurn() {
        this.currentTurn = this.currentTurn === FieldSectorState.O ? FieldSectorState.X : FieldSectorState.O;
        this.emit(ON_NEXT_TURN, this.currentTurn);
    }
}

export const ON_NEXT_TURN = TurnManager.name + ':nextTurn';
