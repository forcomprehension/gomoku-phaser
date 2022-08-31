declare module "phaser-ui-tools" {
    import { Scene } from "phaser"

    class TextGroup {
        setText(label: string, style?: Partial<CSSStyleDeclaration>): TextGroup;
    }

    class TextButton extends TextGroup {
        constructor(game: Scene, x: number, y: number, key: string, callback: (value: any) => void, callbackCtx: any)
    }
}