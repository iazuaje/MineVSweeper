import * as vscode from "vscode";

type Difficulty = "beginner" | "intermediate" | "expert";

export class GamePanel {
  public static current: GamePanel | undefined;
  private static readonly viewType = "minevsweeper.game";

  private readonly panel: vscode.WebviewPanel;
  private readonly context: vscode.ExtensionContext;
  private disposables: vscode.Disposable[] = [];

  public static createOrShow(context: vscode.ExtensionContext): void {
    if (GamePanel.current) {
      GamePanel.current.panel.reveal(vscode.ViewColumn.Beside, true);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      GamePanel.viewType,
      "MineVSweeper",
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "media")],
      }
    );

    GamePanel.current = new GamePanel(panel, context);
  }

  public static dispose(): void {
    GamePanel.current?.disposePanel();
  }

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this.panel = panel;
    this.context = context;
    this.panel.iconPath = vscode.Uri.joinPath(context.extensionUri, "media", "icon.svg");
    this.panel.webview.html = this.getHtml();

    this.panel.webview.onDidReceiveMessage(
      (message: { type?: string; difficulty?: Difficulty }) => {
        if (message.type === "ready") {
          void this.panel.webview.postMessage({
            type: "init",
            difficulty: this.readDifficulty(),
          });
          return;
        }
        if (message.type === "setDifficulty" && message.difficulty) {
          void vscode.workspace
            .getConfiguration("minevsweeper")
            .update("difficulty", message.difficulty, vscode.ConfigurationTarget.Global);
        }
      },
      undefined,
      this.disposables
    );

    this.panel.onDidDispose(() => this.disposePanel(), null, this.disposables);
  }

  private disposePanel(): void {
    GamePanel.current = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }

  private readDifficulty(): Difficulty {
    const value = vscode.workspace.getConfiguration("minevsweeper").get<string>("difficulty");
    if (value === "intermediate" || value === "expert") {
      return value;
    }
    return "beginner";
  }

  private getHtml(): string {
    const webview = this.panel.webview;
    const nonce = getNonce();
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "media", "game.css"));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "media", "game.js"));

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:;" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>MineVSweeper</title>
</head>
<body>
  <div class="app">
    <header class="hud">
      <div class="counter" id="mines" aria-label="Minas restantes">000</div>
      <button type="button" class="face" id="reset" title="Nueva partida" aria-label="Nueva partida">🙂</button>
      <div class="counter" id="timer" aria-label="Tiempo">000</div>
    </header>
    <div class="toolbar">
      <label for="difficulty">Dificultad</label>
      <select id="difficulty">
        <option value="beginner">Principiante 9×9 · 10</option>
        <option value="intermediate">Intermedio 16×16 · 40</option>
        <option value="expert">Experto 16×30 · 99</option>
      </select>
    </div>
    <div class="board-wrap">
      <div class="board" id="board" role="grid"></div>
    </div>
    <p class="hint">Clic: revelar · Clic derecho: bandera · Clic en número: acordeón</p>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i += 1) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
