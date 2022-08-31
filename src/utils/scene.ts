import { BaseScene } from "../scenes/BaseScene";

export function addCenteredText(scene: BaseScene, xPosPercent: number, label: string): Phaser.GameObjects.Text {
    const { screenWidth, screenHeight } = scene.getScreenSize();
    return scene.add.text(screenWidth / 2, screenHeight * xPosPercent / 100, label).setOrigin(0.5, 0.5);
}

