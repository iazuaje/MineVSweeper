import * as vscode from "vscode";
import { GamePanel } from "./gamePanel";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("minevsweeper.open", () => {
      GamePanel.createOrShow(context);
    })
  );
}

export function deactivate(): void {
  GamePanel.dispose();
}
