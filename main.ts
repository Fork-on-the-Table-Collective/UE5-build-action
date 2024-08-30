import * as actions from "@actions/core";
import * as fs from "fs";
import * as path from "path";
import { spawn } from 'child_process';
import * as params from "./src/params.json";

type ParamsType = typeof params;
/**
 * SetParams
 */
const setParams = () => {
  for (const input in params.inputs) {
    params.inputs[input].default = actions.getInput(input, {
      required: params.inputs[input]["required"],
    });
  }
  return params;
};

const writeStingBase64ToFile = (content: string, path: string) => {
  const base64Content = Buffer.from(content).toString("base64");
  try {
    fs.writeFileSync(path, base64Content);
  } catch (err) {
    actions.setFailed(err);
  }
};

const setUpCommands = (params: ParamsType) => {
  if (fs.existsSync(params.inputs.uprojectPath.default)) {
    const uprojectPath = path.normalize(params.inputs.uprojectPath.default);
    const uprojectDir = path.dirname(uprojectPath);
    const cmdOptions = {};
    const platform = params.inputs.platform.default
    if (params.inputs.anticheatEnabled.default === "true") {
      const anticheatDir = path.join(uprojectDir, "Build", "NoRedist");
      try {
        fs.mkdirSync(anticheatDir, { recursive: true });
        actions.info(`Directory created: ${anticheatDir}`);
      } catch (err) {
        actions.setFailed(`Failed to create directory: ${err.message}`);
      }
      const privateKeyPath = path.join(anticheatDir, "base_private.key");
      const publicCertPath = path.join(anticheatDir, "base_public.cer");
      writeStingBase64ToFile(
        params.inputs.anticheatPrivateKey.default,
        privateKeyPath
      );
      writeStingBase64ToFile(
        params.inputs.anticheatPublicCert.default,
        publicCertPath
      );
      actions.info(`Anticheat keys have been written to ${anticheatDir}`);
    }
    
    cmdOptions["compressed"] =
      params.inputs.compressed.default === "true" ? "-compressed" : "";
    cmdOptions["clean"] =
      params.inputs.clean.default === "true" ? "-clean" : "";
    cmdOptions["UpdateIfNeeded"] =
      params.inputs.UpdateIfNeeded.default === "true" ? "-UpdateIfNeeded" : "";
    cmdOptions["server"] =
      params.inputs.server.default === "true"
        ? `-server -serverplatform=${platform} -noclient`
        : "";
    cmdOptions["cook"] = params.inputs.cook.default === "true" ? "-cook" : "";
    cmdOptions["stage"] =
      params.inputs.stage.default === "true" ? "-stage" : "";
    cmdOptions["pak"] = params.inputs.pak.default === "true" ? "-pak" : "";
    cmdOptions["package"] =
      params.inputs.package.default === "true" ? "-package" : "";
    cmdOptions["archive"] =
      params.inputs.archive.default === "true"
        ? `-archive -archivedirectory="${params.inputs.archivePath.default}"`
        : "";
    cmdOptions["nullrhi"] =
      params.inputs.nullrhi.default === "true" ? "-nullrhi" : "";
    cmdOptions["editor"] =
      params.inputs.editor.default === "false" ? "-nocompileeditor" : "";
    cmdOptions["encryptinifiles"] =
      params.inputs.encryptinifiles.default === "true" ? "-encryptinifiles" : "";
    cmdOptions["release"] =
      params.inputs.release.default !== "false"
        ? `-createreleaseversion=${params.inputs.release.default}`
        : "";
    cmdOptions["patch"] =
      params.inputs.patch.default !== "false"
        ? `-generatepatch -basedonreleaseversion=${params.inputs.patch.default}`
        : "";
    cmdOptions["maps"] =
      params.inputs.maps.default !== "false"
        ? `-map=${params.inputs.maps.default}`
        : "";

    let runUAT = "";
    let unrealExe = "";
    let buildcmd = "";
    let enginePath = "";
    if(fs.existsSync(params.inputs.enginePath.default)){
      enginePath = path.normalize(params.inputs.enginePath.default);
    }
    if (platform === "Win64") {
      buildcmd = path.join(
        enginePath,
        "Engine",
        "Build",
        "BatchFiles",
        "Build.bat"
      );
      runUAT = path.join(
        enginePath,
        "Engine",
        "Build",
        "BatchFiles",
        "RunUAT.bat"
      );
      unrealExe = path.join(
        enginePath,
        "Engine",
        "Binaries",
        "Win64",
        "UnrealEditor-Cmd.exe"
      );
    } else if (platform === "Mac") {
      buildcmd = path.join(
        enginePath,
        "Engine",
        "Build",
        "BatchFiles",
        "Mac",
        "Build.sh"
      );
      runUAT = path.join(
        enginePath,
        "Engine",
        "Build",
        "BatchFiles",
        "RunUAT.command"
      );
      unrealExe = path.join(
        enginePath,
        "Engine",
        "Binaries",
        "Mac",
        "UnrealEditor.app",
        "Contents",
        "MacOS",
        "UnrealEditor"
      );
    } else {
      actions.setFailed(
        `Wrong platform (${platform}). It must be Win64 or Mac`
      );
    }
    const RebuildProjectCommand:string[] = [`"${buildcmd}"`,"Development",platform,`-project="${uprojectPath}"`,"-TargetType=Editor", "-Progress", "-NoEngineChanges", "-NoHotReloadFromIDE"] 
    const BuildAndPackageCommand:string[] = [`"${runUAT}"`,`-ScriptsForProject="${uprojectPath}"`, "Turnkey", "-command=VerifySdk", `-platform=${platform}`, cmdOptions["UpdateIfNeeded"], "-EditorIO", "-EditorIOPort=56006", `-project="${uprojectPath}"`, "BuildCookRun", "-nop4", "-utf8output",cmdOptions["editor"],cmdOptions["clean"],cmdOptions["encryptinifiles"],cmdOptions["release"],cmdOptions["patch"],cmdOptions["server"], "-skipbuildeditor", cmdOptions["cook"], `-project="${uprojectPath}"`, `-unrealexe="${unrealExe}"`, `-platform=${platform}`, "-installed",cmdOptions["stage"], cmdOptions["archive"], cmdOptions["package"], "-build",cmdOptions["pak"], "-iostore", cmdOptions["compressed"], "-prereqs", `-clientconfig=${params.inputs.builConfig.default}`, "-nodebuginfo", "-nocompile", "-nocompileuat",cmdOptions["nullrhi"]];
    return [RebuildProjectCommand,BuildAndPackageCommand];
  } else {
    actions.setFailed(`Project file ${params.inputs.uprojectPath.default} does not exists`);
  }
};

const executeCommand = (command: string, commandOptions: string[]) => {
  actions.info(`Executing: ${command} ${commandOptions.join(" ")}`);

  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, commandOptions, {shell: true});

    child.stdout.on('data', (data) => {
      actions.info(data.toString());
    });

    child.stderr.on('data', (data) => {
      actions.setFailed(`Error executing command: ${data}`);
      reject(data.toString());
    });

    child.on('close', (code) => {
      actions.info(`child process exited with code ${code}`);
      if (code !== 0) {
        reject(`Process exited with code ${code}`);
      } else {
        resolve();
      }
    });
  });
};

const main = async () => {
  const params = setParams();
  const commands = setUpCommands(params);
  try {
    actions.info(`Rebuild UE Project`);
    await executeCommand(commands[0].shift(),commands[0]);
  } catch (error) {
    actions.setFailed(error);
  }


  try {
    actions.info(`Build, Cook, Stage & Package UE Project`);
    await executeCommand(commands[1].shift(),commands[1]);
  } catch (error) {
    actions.setFailed(error);
  }
  
};

main().catch((e: Error) => actions.setFailed(e));
