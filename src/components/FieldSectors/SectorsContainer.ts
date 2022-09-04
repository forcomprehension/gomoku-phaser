import { FieldSector, FieldSectorState } from "./FieldSector";

export class SectorsContainer {
    public static readonly CONTAINER_NEARLY_FILLED_THRESHOLD = .7;

    // AI Relies on reference
    protected readonly fieldSectors: FieldSector[][] = [];
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
    }

    public inflate(newRowCount: number) {
        const wrapRowsCount = (newRowCount - this.fieldSectors.length) / 2;

        if (wrapRowsCount > 0) {
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

