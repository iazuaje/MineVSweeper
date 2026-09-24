# MineVSweeper (Recontra vibecodeado.)

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

Instalá el `.vsix` generado (`minevsweeper-<versión>.vsix`) con **Install from VSIX…**.

### Versionado y empaquetado

La versión vive en `package.json`; el `.vsix` usa ese número en el nombre del archivo.

```bash
# Solo empaquetar (sin cambiar versión)
npm run package

# Fijar versión y empaquetar (npm exige -- antes del argumento)
npm run package -- 0.1.1

# O incremento semver
npm run package -- patch
npm run package -- minor
npm run package -- major
```

Cada comando compila TypeScript y genera el VSIX. Conviene commitear el cambio de `package.json` y, si usás tags, `git tag v0.1.1`.

Alternativa estándar de npm (opcional): `npm version patch --no-git-tag-version` y después `npm run package` sin argumentos.

## Controles

- Clic: revelar (el primer clic nunca es mina)
- Clic derecho: bandera
- Clic izquierdo sobre un número revelado: acordeón
- Carita: nueva partida
