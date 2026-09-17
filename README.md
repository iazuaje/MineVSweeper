# MineVSweeper

Buscaminas en una pestaña del editor de VS Code / Cursor, para jugar mientras el agente modifica código.

La partida vive en un webview con `retainContextWhenHidden`: al cambiar de archivo no se reinicia el tablero.

## Uso local

```bash
npm install
```

En Cursor/VS Code: **Run and Debug → Run Extension** (F5). En la ventana de extensión:

1. `Ctrl+Shift+P`
2. **MineVSweeper: Open Game**

Instalación local sin F5:

```bash
npm run compile
npm run package
```

Instalá el `.vsix` generado con **Install from VSIX…**.

## Publicar más adelante

El juego en `media/` no depende de VS Code salvo el `acquireVsCodeApi` opcional. El host está en `src/`.

1. Creá un publisher en [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage) o usá Open VSX.
2. Ajustá `publisher` y `repository` en `package.json`.
3. Agregá un icono PNG 128×128 y referencialo con `"icon": "media/icon.png"`.
4. `npx vsce login <publisher>` y `npm run package`, o `npm run publish:ovsx`.

## Controles

- Clic: revelar (el primer clic nunca es mina)
- Clic derecho: bandera
- Clic medio o doble clic sobre un número: acordeón
- Carita: nueva partida
