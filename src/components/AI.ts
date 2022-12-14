// @ts-nocheck
import { arrayOf } from "../utils/array";
import { getRandomInt } from "../utils/number";
import { FieldSector, FieldSectorState } from "./FieldSectors";

// @TODO: Refactor this fat boi
export class AI extends Phaser.Events.EventEmitter {
    protected fieldSectorsMatrix: Readonly<Readonly<Readonly<FieldSector>[]>[]>

    constructor(public readonly sign: FieldSectorState) {
        super();
    }

    public onTurnChange(turn: FieldSectorState) {
        if (turn === this.sign) {
            this.emit(AI_MOVE_EVENT, this.AIMove());
        }
    }

    public setFieldSectorsMatrix(matrix: Readonly<Readonly<Readonly<FieldSector>[]>[]>) {
        this.fieldSectorsMatrix = matrix;
    }

    /**
     * Массив шаблонов для Х и 0, генерируется из предыдущих шаблонов
     */
    protected pattern = [
        [],
        [],
        []
    ];

    /**
     * Массив выигрышных шаблонов [1] и [2] и шаблон определения возможности поставить 5 в ряд
     */
    protected patternWin = [
        0,
        /(1){5}/,
        /(2){5}/,
        /[01]*7[01]*/,
        /[02]*7[02]*/
    ];

    public get who() { // @TODO
        return this.sign === FieldSectorState.X;
    }

    /**
     * Шаблоны построения фигрур и их веса. Х в дальнейшем заменяется на крестик (1) или нолик (0), 0 - свободная ячейка
     */
    protected prePattern = [
        {s: 'xxxxx', w: 99999}, // пять в ряд (финальная выигрышная линия)
        {s: '0xxxx0', w: 7000}, // Открытая четверка
        {s: '0xxxx', w: 4000}, // Закрытая четверка
        {s: 'xxxx0', w: 4000},
        {s: '0x0xxx', w: 2000},
        {s: '0xx0xx', w: 2000},
        {s: '0xxx0x', w: 2000},
        {s: 'xxx0x0', w: 2000},
        {s: 'xx0xx0', w: 2000},
        {s: 'x0xxx0', w: 2000},
        {s: '0xxx0', w: 3000},
        {s: '0xxx', w: 1500},
        {s: 'xxx0', w: 1500},
        {s: '0xx0x', w: 800},
        {s: '0x0xx', w: 800},
        {s: 'xx0x0', w: 800},
        {s: 'x0xx0', w: 800},
        {s: '0xx0', w: 200}
    ];


    /**
     * Направления расчета потенциальных ходов
     */
    protected directions = [];

    /**
     * Счетчик ходов игры
     */
    protected step = 0;

    // Матрица игрового поля 15х15. 0 - свободная клетка, 1 - крестик, 2 - нолик
    protected matrix = [];

    protected hashStep = {};

    public init() {
        const centerCellIndex = Math.floor(this.fieldSectorsMatrix.length / 2);
        this.hashStep = {
            [centerCellIndex]: {
                [centerCellIndex]: {sum: 0, attack: 1, defence: 0, attackPattern: 0, defencePattern: 0}
            }
        };

        let array;
        let target = 'x';
        this.prePattern.forEach(({ s, w }) => {
            let pos = -1; // @TODO?
            array = [];
            while ((pos = s.indexOf(target, pos + 1)) !== -1) {
                array.push(s.substr(0, pos) + '7' + s.substr(pos + 1));
            }
            const score = array.join("|");

            const l = this.pattern[0].length;

            this.pattern[0][l] = w;
            this.pattern[1][l] = new RegExp(score.replace(/x/g, '1'));  // Шаблоны для Х, например 01110 - открытая четверка
            this.pattern[2][l] = new RegExp(score.replace(/x/g, '2'));  // Аналогично для 0 - 022220
        });
        for (var n = -2; n <= 2; n++) // Заполнение массива потенциальных ходов (в радиусе 2 клеток)
        {                             // и установка минимальных весов (используются для расчета первых ходов, пока не появятся шаблоны)
            for (var m = -2; m <= 2; m++)
            {
                if (n === 0 && m === 0)
                    continue;
                if (Math.abs(n) <= 1 && Math.abs(m) <= 1)
                    this.directions.push({n: n, m: m, w: 3});
                else if (Math.abs(n) === Math.abs(m) || n * m === 0)
                    this.directions.push({n: n, m: m, w: 2});
                else
                    this.directions.push({n: n, m: m, w: 1});
            }
        }

        for (var n = 0; n < this.size; n++) {
            this.matrix[n] = [];
            for (var m = 0; m < this.size; m++) {
                this.matrix[n][m] = 0;
            }
        }
    }

    public get size() {
        return this.fieldSectorsMatrix.length;
    }

    protected winLine = [];

    public getWinLine() {
        const [cellFrom, rowFrom, cellTo, rowTo, direction] = this.winLine;
        return {
            rowFrom,
            cellFrom,

            rowTo,
            cellTo
        };
    }

    // @TODO: how much add? (for now - 1)
    public growAIScene() {
        this.matrix.forEach((_, i) => {
            this.matrix[i] = [0, ...this.matrix[i], 0];
        });

        this.directions.forEach((struct) => {
            struct.n++;
            struct.m++;
        });

        Object.keys(this.hashStep).reverse().forEach((hashIndex) => {
            this.hashStep[Number(hashIndex) + 1] = Object.keys(this.hashStep[hashIndex]).reverse().reduce((acc, subIndex) => {
                acc[Number(subIndex) + 1] = this.hashStep[hashIndex][subIndex];
                return acc;
            }, {});

            delete this.hashStep[hashIndex];
        });

        this.m++;
        this.n++;

        this.matrix.unshift(arrayOf(this.size, 0));
        this.matrix.push(arrayOf(this.size, 0));
    }

    protected m: number; // Номер ячейки по горизонтали (номер столбца)
    protected n: number; // Номер ячейки по вертикали (номер строки)

    public AIMove() {
        var n, m;
        var max = 0;
        this.calculateHashMovePattern(); // Расчет весов по заданным шаблонам ходов
        // @TODO: check sort
        for (n in this.hashStep)         // Поиск веса лучшего хода
            for (m in this.hashStep[n])
                if (this.hashStep[n][m].sum > max)
                    max = this.hashStep[n][m].sum;
        var goodmoves = [];
        for (n in this.hashStep)         // Поиск лучших ходов (если их несколько)
            for (m in this.hashStep[n])
                if (this.hashStep[n][m].sum === max) {
                    goodmoves[goodmoves.length] = {n: parseInt(n), m: parseInt(m)};
                }

                // @TODO:
        var movenow = goodmoves[getRandomInt(0, goodmoves.length - 1)]; // Выбор хода случайным образом, если несколько ходов на выбор
        this.n = movenow.n;
        this.m = movenow.m;

        return this.move(this.n, this.m, true);
    }

    public move(n, m, aiStep: boolean) {
        if (this.hashStep[n] && this.hashStep[n][m])
            delete this.hashStep[n][m];  // Если поле хода было в массиве потенциальных ходов, то поле удаляется из него

            // @TODO: X/O
        // this.matrix[n][m] = 2 - this.who; // Сохранение хода в матрице полей игры
        this.matrix[n][m] = 2 - Number(aiStep);
        //this.who = !this.who; // Переход хода от Х к О, от О к Х
        var t = this.matrix[this.n][this.m]; // Далее идет проверка на выигрыш в результате этого хода: поиск 5 в ряд по 4 направлениям | — / \
        var s = ['', '', '', ''];
        var nT = Math.min(this.n, 4);
        var nR = Math.min(this.size - this.m - 1, 4);
        var nB = Math.min(this.size - this.n - 1, 4);
        var nL = Math.min(this.m, 4);
        for (var j = this.n - nT; j <= this.n + nB; j++)
            s[0] += this.matrix[j][this.m];
        for (var i = this.m - nL; i <= this.m + nR; i++)
            s[1] += this.matrix[this.n][i];
        for (var i = -Math.min(nT, nL); i <= Math.min(nR, nB); i++)
            s[2] += this.matrix[this.n + i][this.m + i];
        for (var i = -Math.min(nB, nL); i <= Math.min(nR, nT); i++)
            s[3] += this.matrix[this.n - i][this.m + i];
        var k;

        if ((k = s[0].search(this.patternWin[t])) >= 0)
            this.winLine = [this.m, this.n - nT + k, this.m, this.n - nT + k + 4];
        else if ((k = s[1].search(this.patternWin[t])) >= 0)
            this.winLine = [this.m - nL + k, this.n, this.m - nL + k + 4, this.n];
        else if ((k = s[2].search(this.patternWin[t])) >= 0)
            this.winLine = [this.m - Math.min(nT, nL) + k, this.n - Math.min(nT, nL) + k, this.m - Math.min(nT, nL) + k + 4, this.n - Math.min(nT, nL) + k + 4];
        else if ((k = s[3].search(this.patternWin[t])) >= 0)
            this.winLine = [this.m - Math.min(nB, nL) + k, this.n + Math.min(nB, nL) - k, this.m - Math.min(nB, nL) + k + 4, this.n + Math.min(nB, nL) - k - 4, -1];

        if (this.winLine.length) {
            this.emit(WIN_EVENT, aiStep);
        } else {
            this.calculateHashMove(aiStep); // Рассчитываем веса потенциальных ходов (без шаблонов)
        }

        console.log('[' + ++this.step + '] Row: ' + n + ', Cell:' + m + '; AI: ' + aiStep);

        return { row : n, cell: m };
    }

    public calculateHashMove(attack) {
        for (var key in this.directions) {
            var n = this.n + this.directions[key].n;
            var m = this.m + this.directions[key].m;
            if (n < 0 || m < 0 || n >= this.size || m >= this.size)
                continue;
            if (this.matrix[n][m] !== 0)
                continue;
            if (!(n in this.hashStep))
                this.hashStep[n] = {};
            if (!(m in this.hashStep[n]))
                this.hashStep[n][m] = {sum: 0, attack: 0, defence: 0, attackPattern: 0, defencePattern: 0};
            if (attack)
                this.hashStep[n][m].attack += this.directions[key].w;
            else
                this.hashStep[n][m].defence += this.directions[key].w;
        }
    }

    protected calculateHashMovePattern() {
        var s;
        var k = 0;
        var attack = 2 - this.who;
        var defence = 2 - !this.who;
        var res;
        for (let n in this.hashStep)
            for (let m in this.hashStep[n]) // Перебор всех потенциальных ходов (*1)
            {
                this.hashStep[n][m].sum = this.hashStep[n][m].attack + this.hashStep[n][m].defence;
                this.hashStep[n][m].attackPattern = 0; // Обнуляем значение атаки по шаблону
                this.hashStep[n][m].defencePattern = 0; // Обнуляем значение защиты по шаблону
                n = parseInt(n);
                m = parseInt(m);
                for (var q = 1; q <= 2; q++) // Первым проходом расчитываем веса атаки, вторым - веса защиты
                    for (var j = 1; j <= 4; j++)
                    {
                        s = '';
                        for (var i = -4; i <= 4; i++) // Циклы перебора в радиусе 4 клеток от рассматриваемого хода (выбраннного в *1)
                            switch (j) { // Создание строк с текущим состоянием клеток по 4 направлениям, такого вида 000172222
                                case 1:  // где 7 - это рассматриваемый ход, 0 - свободная ячейка, 1 - крестик, 2 - нолик
                                    if (n + i >= 0 && n + i < this.size)
                                        s += (i === 0) ? '7' : this.matrix[n + i][m];
                                    break;
                                case 2:
                                    if (m + i >= 0 && m + i < this.size)
                                        s += (i === 0) ? '7' : this.matrix[n][m + i];
                                    break;
                                case 3:
                                    if (n + i >= 0 && n + i < this.size)
                                        if (m + i >= 0 && m + i < this.size)
                                            s += (i === 0) ? '7' : this.matrix[n + i][m + i];
                                    break;
                                case 4:
                                    if (n - i >= 0 && n - i < this.size)
                                        if (m + i >= 0 && m + i < this.size)
                                            s += (i === 0) ? '7' : this.matrix[n - i][m + i];
                                    break;
                            }
                        res = (q === 1) ? this.patternWin[2 + attack].exec(s) : this.patternWin[2 + defence].exec(s);
                        if (res === null)
                            continue;
                        if (res[0].length < 5) // Если длина возможной линии <5, то построить 5 не удастся в принципе и расчет можно не производить
                            continue;          // например, при восходящей диагонали для ячейки (0, 0) или (0, 1) или если с 2х сторон зажал соперник
                        if (q === 1) // для крестиков, если играем крестиками и наоборот. Формируем вес атаки на этом поле
                            for (var i in this.pattern[attack]) { // перебор по всем шаблонам
                                if (this.pattern[attack][i].test(s)) // если нашли соответствие
                                    this.hashStep[n][m].attackPattern += this.pattern[0][i]; // увеличиваем значимость клетки на вес шаблона
                            }
                        else // для ноликов если играем крестиками
                            for (var i in this.pattern[defence])
                                if (this.pattern[defence][i].test(s))
                                    this.hashStep[n][m].defencePattern += this.pattern[0][i];
                    }
                this.hashStep[n][m].sum += 1.1 * this.hashStep[n][m].attackPattern + this.hashStep[n][m].defencePattern; // Атака на 10% важнее защиты
                k++;
            }
    }
}

export const AI_MOVE_EVENT = AI.name + ':' + 'AIMOVE';
export const WIN_EVENT = AI.name + ':' + 'WIN';
