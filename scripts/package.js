const { readFileSync, writeFileSync } = require("fs");
const { execSync } = require("child_process");
const { join } = require("path");

const root = join(__dirname, "..");
const pkgPath = join(root, "package.json");

const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][\da-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][\da-zA-Z-]*))*))?(?:\+[\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*)?$/;

function readPkg() {
  return JSON.parse(readFileSync(pkgPath, "utf8"));
}

function writePkg(pkg) {
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

function setVersion(version) {
  if (!SEMVER.test(version)) {
    console.error(`Versión inválida: "${version}" (usa semver, ej. 0.1.1)`);
    process.exit(1);
  }
  const pkg = readPkg();
  const previous = pkg.version;
  pkg.version = version;
  writePkg(pkg);
  console.log(`Versión: ${previous} → ${version}`);
  return version;
}

function bump(kind) {
  const pkg = readPkg();
  const base = pkg.version.split("+")[0].split("-")[0];
  const parts = base.split(".").map((n) => Number(n));
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    console.error(`No se pudo interpretar la versión actual: ${pkg.version}`);
    process.exit(1);
  }
  let [major, minor, patch] = parts;
  if (kind === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (kind === "minor") {
    minor += 1;
    patch = 0;
  } else if (kind === "patch") {
    patch += 1;
  } else {
    console.error(`Incremento desconocido: ${kind}`);
    process.exit(1);
  }
  return setVersion(`${major}.${minor}.${patch}`);
}

function run(command) {
  execSync(command, { cwd: root, stdio: "inherit", shell: true });
}

const arg = process.argv[2];

if (arg) {
  if (arg === "patch" || arg === "minor" || arg === "major") {
    bump(arg);
  } else {
    setVersion(arg);
  }
}

run("npm run compile");
run("npx vsce package --no-dependencies");

const pkg = readPkg();
console.log(`\nListo: minevsweeper-${pkg.version}.vsix`);
