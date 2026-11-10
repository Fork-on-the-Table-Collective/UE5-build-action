import * as actions from "@actions/core";
import { exec } from "@actions/exec";
import * as fs from "fs";
import * as path from "path";
import * as params from "./src/params.json";

type Input = keyof typeof params.inputs;

const getInputs = () => {
  const inputs = {} as Record<Input, string>;
  for (const input of Object.keys(params.inputs) as Input[]) {
    inputs[input] = actions.getInput(input, { required: params.inputs[input].required });
  }
  return inputs;
};

const main = async () => {
  const inputs = getInputs();
  const buildMode = inputs.buildMode || "full";
  if (buildMode !== "full" && buildMode !== "editor-only" && buildMode !== "package-only") {
    throw new Error(`Invalid buildMode "${buildMode}". Use full, editor-only, or package-only.`);
  }

  const platform = inputs.platform;
  if (platform !== "Win64" && platform !== "Mac") {
    throw new Error(`Wrong platform (${platform}). It must be Win64 or Mac.`);
  }

  const uprojectPath = path.resolve(inputs.uprojectPath);
  if (!fs.existsSync(uprojectPath)) {
    throw new Error(`Project file does not exist: ${uprojectPath}`);
  }

  const enginePath = path.resolve(inputs.enginePath);
  const batchFiles = path.join(enginePath, "Engine", "Build", "BatchFiles");
  const isWin64 = platform === "Win64";

  if (buildMode !== "editor-only" && inputs.anticheatEnabled === "true") {
    const anticheatDir = path.join(path.dirname(uprojectPath), "Build", "NoRedist");
    fs.mkdirSync(anticheatDir, { recursive: true });
    fs.writeFileSync(
      path.join(anticheatDir, "base_private.key"),
      Buffer.from(inputs.anticheatPrivateKey).toString("base64")
    );
    fs.writeFileSync(
      path.join(anticheatDir, "base_public.cer"),
      Buffer.from(inputs.anticheatPublicCert).toString("base64")
    );
    actions.info(`Anticheat keys have been written to ${anticheatDir}`);
  }

  if (buildMode !== "package-only") {
    const build = isWin64
      ? path.join(batchFiles, "Build.bat")
      : path.join(batchFiles, "Mac", "Build.sh");
    const editorTarget = inputs.editorTarget;
    actions.info("Build UE Editor target");
    await exec(`"${build}"`, [
      ...(editorTarget ? [editorTarget, platform, "Development"] : ["Development", platform]),
      `-project=${uprojectPath}`,
      ...(editorTarget ? [] : ["-TargetType=Editor"]),
      "-Progress",
      "-NoEngineChanges",
      "-NoHotReloadFromIDE",
      ...(isWin64 ? ["-WaitMutex"] : []),
    ]);
  }

  if (buildMode === "editor-only") {
    return;
  }

  const runUAT = path.join(batchFiles, isWin64 ? "RunUAT.bat" : "RunUAT.command");
  const binaries = path.join(enginePath, "Engine", "Binaries", platform);
  const unrealExe = isWin64
    ? path.join(binaries, "UnrealEditor-Cmd.exe")
    : path.join(binaries, "UnrealEditor.app", "Contents", "MacOS", "UnrealEditor");

  actions.info("Build, Cook, Stage & Package UE Project");
  await exec(`"${runUAT}"`, [
    `-ScriptsForProject=${uprojectPath}`,
    "Turnkey",
    "-command=VerifySdk",
    `-platform=${platform}`,
    ...(inputs.UpdateIfNeeded === "true" ? ["-UpdateIfNeeded"] : []),
    ...(buildMode === "full" ? ["-EditorIO", "-EditorIOPort=56006"] : []),
    `-project=${uprojectPath}`,
    "BuildCookRun",
    "-nop4",
    "-utf8output",
    ...(inputs.editor === "false" ? ["-nocompileeditor"] : []),
    ...(inputs.clean === "true" ? ["-clean"] : []),
    ...(inputs.encryptinifiles === "true" ? ["-encryptinifiles"] : []),
    ...(inputs.release !== "false" ? [`-createreleaseversion=${inputs.release}`] : []),
    ...(inputs.patch !== "false" ? ["-generatepatch", `-basedonreleaseversion=${inputs.patch}`] : []),
    ...(inputs.server === "true" ? ["-server", `-serverplatform=${platform}`, "-noclient"] : []),
    "-skipbuildeditor",
    ...(inputs.cook === "true" ? ["-cook"] : []),
    `-project=${uprojectPath}`,
    `-unrealexe=${unrealExe}`,
    `-platform=${platform}`,
    "-installed",
    ...(inputs.stage === "true" ? ["-stage"] : []),
    ...(inputs.archive === "true" ? ["-archive", `-archivedirectory=${inputs.archivePath}`] : []),
    ...(inputs.package === "true" ? ["-package"] : []),
    "-build",
    ...(inputs.pak === "true" ? ["-pak"] : []),
    "-iostore",
    ...(inputs.compressed === "true" ? ["-compressed"] : []),
    "-prereqs",
    `-clientconfig=${inputs.builConfig}`,
    "-nodebuginfo",
    "-nocompile",
    "-nocompileuat",
    ...(inputs.nullrhi === "true" ? ["-nullrhi"] : []),
  ]);
};

main().catch((error: Error) => actions.setFailed(error));