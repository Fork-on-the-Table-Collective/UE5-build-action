const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { inputs } = require("../src/params.json");

const isWindows = process.platform === "win32";
const action = path.resolve(__dirname, "../dist/index.js");

function runAction(t, overrides = {}, engine = {}) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ue build action "));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const batchFiles = path.join(temp, "Engine", "Build", "BatchFiles");
  const project = path.join(temp, "Example Game.uproject");
  const archive = path.join(temp, "Build Archive");
  const probe = path.join(temp, "probe.cjs");
  const log = path.join(temp, "commands.jsonl");
  fs.mkdirSync(path.join(batchFiles, "Mac"), { recursive: true });
  fs.writeFileSync(project, "{}");
  fs.writeFileSync(probe, `
    const fs = require("node:fs");
    const [phase, ...args] = process.argv.slice(2);
    fs.appendFileSync(process.env.PROBE_LOG, JSON.stringify({ phase, args }) + "\\n");
    if (phase === "editor") {
      if (process.env.EDITOR_WARNING === "true") console.error("Editor warning");
      process.exitCode = Number(process.env.EDITOR_EXIT);
    } else {
      process.exitCode = Number(process.env.PACKAGE_EXIT);
    }
  `);

  function writeCommand(file, phase) {
    const script = isWindows
      ? `@node "%PROBE_PATH%" ${phase} %*\r\n@exit /b %errorlevel%\r\n`
      : `#!/bin/sh\nexec node "$PROBE_PATH" ${phase} "$@"\n`;
    fs.writeFileSync(path.join(batchFiles, file), script, { mode: 0o755 });
  }

  if (!engine.missingEditor) {
    writeCommand(isWindows ? "Build.bat" : "Mac/Build.sh", "editor");
  }
  writeCommand(isWindows ? "RunUAT.bat" : "RunUAT.command", "package");

  const actionInputs = Object.fromEntries(
    Object.entries(inputs).map(([name, spec]) => [name, spec.default])
  );
  Object.assign(actionInputs, {
    enginePath: temp,
    uprojectPath: project,
    platform: isWindows ? "Win64" : "Mac",
    ...overrides,
  });
  if (actionInputs.archive === "true") {
    actionInputs.archivePath = archive;
  }
  const env = {
    ...process.env,
    PROBE_PATH: probe,
    PROBE_LOG: log,
    EDITOR_WARNING: String(engine.editorWarning ?? false),
    EDITOR_EXIT: String(engine.editorExit ?? 0),
    PACKAGE_EXIT: String(engine.packageExit ?? 0),
  };
  for (const [key, value] of Object.entries(actionInputs)) {
    env[`INPUT_${key.toUpperCase()}`] = value;
  }

  const result = spawnSync(process.execPath, [action], { env, encoding: "utf8", timeout: 15000 });
  assert.ifError(result.error);
  const output = result.stdout + result.stderr;
  const commands = fs.existsSync(log)
    ? fs.readFileSync(log, "utf8").trim().split("\n").map(JSON.parse)
    : [];
  return { status: result.status, output, commands, project, archive };
}

test("the default runs Editor and package in order even if the Editor writes a warning", (t) => {
  const { status, output, commands, project } = runAction(t, {}, { editorWarning: true });
  assert.equal(status, 0, output);
  assert.match(output, /Editor warning/);
  assert.deepEqual(commands.map(({ phase }) => phase), ["editor", "package"]);
  assert.ok(commands[0].args.includes("-TargetType=Editor"));
  assert.ok(commands[0].args.includes(`-project=${project}`));
  assert.ok(commands[1].args.includes("-EditorIO"));
});

test("a nonzero Editor exit stops packaging", (t) => {
  const { status, output, commands } = runAction(t, {}, { editorExit: 6 });
  assert.equal(status, 1, output);
  assert.match(output, /exit code 6/);
  assert.deepEqual(commands.map(({ phase }) => phase), ["editor"]);
});

test("a missing Editor executable stops packaging", (t) => {
  const { status, output, commands } = runAction(t, {}, { missingEditor: true });
  assert.equal(status, 1, output);
  assert.match(output, /Unable to locate executable file/);
  assert.deepEqual(commands, []);
});

test("editor-only builds the named target", (t) => {
  const { status, output, commands } = runAction(t, {
    buildMode: "editor-only",
    editorTarget: "ExampleEditor",
  });
  assert.equal(status, 0, output);
  assert.deepEqual(commands.map(({ phase }) => phase), ["editor"]);
  const [{ args }] = commands;
  assert.equal(args[0], "ExampleEditor");
  assert.equal(args.includes("-TargetType=Editor"), false);
  assert.equal(args.includes("-WaitMutex"), isWindows);
});

test("package-only skips Editor and passes the archive path and configuration", (t) => {
  const { status, output, commands, archive } = runAction(t, {
    buildMode: "package-only",
    builConfig: "DebugGame",
    archive: "true",
    editor: "false",
  });
  assert.equal(status, 0, output);
  assert.deepEqual(commands.map(({ phase }) => phase), ["package"]);
  const [{ args }] = commands;
  assert.ok(args.includes(`-archivedirectory=${archive}`));
  assert.ok(args.includes("-clientconfig=DebugGame"));
  assert.ok(args.includes("-nocompileeditor"));
  assert.equal(args.includes("-EditorIO"), false);
});

test("a package failure fails the action", (t) => {
  const { status, output, commands } = runAction(t, { buildMode: "package-only" }, { packageExit: 7 });
  assert.equal(status, 1, output);
  assert.match(output, /exit code 7/);
  assert.deepEqual(commands.map(({ phase }) => phase), ["package"]);
});