import { Types } from "phaser";
import { FieldSector, FieldSectorState } from "./FieldSector";

export class SectorsContainer {
    public static readonly CONTAINER_NEARLY_FILLED_THRESHOLD = .7;

    // AI Relies on reference
    protected readonly fieldSectors: FieldSector[][] = [];
    protected readonly fieldSectorsIndexes: Map<FieldSector, Required<Types.Math.Vector2Like>> = new Map();
    protected sectorsCount = 0;
    protected filledSectorsCount = 0;

    public setByRowAndCell(rowIndex: number, cellIndex: number, sector: FieldSector) {
        if (typeof this.fieldSectors[rowIndex] === 'undefined') {
            this.fieldSectors[rowIndex] = [];
        }

        // Just in case check that we never assign it before
        if (typeof this.fieldSectors[rowIndex][cellIndex] === "undefined") {
            this.sectorsCount++;
        }

        this.fieldSectors[rowIndex][cellIndex] = sector;
        this.fieldSectorsIndexes.set(sector, { x: cellIndex, y: rowIndex });
    }

    public inflate(newRowCount: number) {
        const wrapRowsCount = (newRowCount - this.fieldSectors.length) / 2;

        if (wrapRowsCount > 0) {
            this.updateSectorsIndexes(wrapRowsCount);

            // Add to top
            this.fieldSectors.unshift.apply(this.fieldSectors, new Array(wrapRowsCount).fill([]));
            // To bottom
            this.fieldSectors.push.apply(this.fieldSectors, new Array(wrapRowsCount).fill([]));
            // To sides
            for (let i = wrapRowsCount; i < this.fieldSectors.length - wrapRowsCount; i++) {
                const array = this.fieldSectors[i];
                array.unshift.apply(array, new Array(wrapRowsCount).fill(undefined));
                array.push.apply(array, new Array(wrapRowsCount).fill(undefined));
            }
        }
    }

    protected updateSectorsIndexes(shiftCount: number) {
        this.fieldSectorsIndexes.forEach((indexes) => {
            indexes.x += shiftCount;
            indexes.y += shiftCount;
        });
    }

    public getIndexesBySector(sector: FieldSector) {
        return this.fieldSectorsIndexes.get(sector);
    }

    public tryToFillSector(sector: FieldSector, withState: FieldSectorState) {
        const result = sector.lockAndFillSector(withState);
        if (result) {
            ++this.filledSectorsCount;
        }

        return result;
    }

    public doesContainerNearlyFilled() {
        return this.filledSectorsCount / this.sectorsCount >= SectorsContainer.CONTAINER_NEARLY_FILLED_THRESHOLD;
    };

    public getElement(rowIndex: number, cellIndex:number): FieldSector {
        return this.fieldSectors[rowIndex]?.[cellIndex];
    }

    public getFieldSectorsMatrix(): Readonly<Readonly<Readonly<FieldSector>[]>[]> {
        return this.fieldSectors;
    }
}

