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

const setUpCommand = (params: ParamsType) => {
  const uprojectPath = params.inputs.uprojectPath.default;
  if (fs.existsSync(uprojectPath)) {
    const uprojectDir = path.dirname(uprojectPath);
    const cmdOptions = {};
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
        ? `-server -serverplatform=${params.inputs.platform.default} -noclient`
        : "";
    cmdOptions["cook"] = params.inputs.cook.default === "true" ? "-cook" : "";
    cmdOptions["stage"] =
      params.inputs.stage.default === "true" ? "-stage" : "";
    cmdOptions["pak"] = params.inputs.pak.default === "true" ? "-pak" : "";
    cmdOptions["package"] =
      params.inputs.package.default === "true" ? "-package" : "";
    cmdOptions["archive"] =
      params.inputs.clean.default === "archive"
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
    if (params.inputs.platform.default === "Win64") {
      runUAT = path.join(
        params.inputs.enginePath.default,
        "Engine",
        "Build",
        "BatchFiles",
        "RunUAT.bat"
      );
      unrealExe = path.join(
        params.inputs.enginePath.default,
        "Engine",
        "Binaries",
        "Win64",
        "UnrealEditor-Cmd.exe"
      );
    } else if (params.inputs.platform.default === "Mac") {
      runUAT = path.join(
        params.inputs.enginePath.default,
        "Engine",
        "Build",
        "BatchFiles",
        "RunUAT.command"
      );
      unrealExe = path.join(
        params.inputs.enginePath.default,
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
        `Wrong platform (${params.inputs.platform.default}). It must be Win64 or Mac`
      );
    }
    const command:string[] = [`"${runUAT}"`,`-ScriptsForProject="${params.inputs.uprojectPath.default}"`, "Turnkey", "-command=VerifySdk", `-platform=${params.inputs.platform.default}`, cmdOptions["UpdateIfNeeded"], "-EditorIO", "-EditorIOPort=56006", `-project="${params.inputs.uprojectPath.default}"`, "BuildCookRun", "-nop4", "-utf8output",cmdOptions["editor"],cmdOptions["clean"],cmdOptions["encryptinifiles"],cmdOptions["release"],cmdOptions["patch"],cmdOptions["server"], "-skipbuildeditor", cmdOptions["cook"], `-project="${params.inputs.uprojectPath.default}"`, `-unrealexe="${unrealExe}"`, `-platform=${params.inputs.platform.default}`, "-installed",cmdOptions["stage"], cmdOptions["archive"], cmdOptions["package"], "-build",cmdOptions["pak"], "-iostore", cmdOptions["compressed"], "-prereqs", `-clientconfig=${params.inputs.builConfig.default}`, "-nodebuginfo", "-nocompile", "-nocompileuat",cmdOptions["nullrhi"]];
    return command;
  } else {
    actions.setFailed(`Project file ${uprojectPath} does not exists`);
  }
};

const executeCommand = (command:string,commandOptons:string[])=> {
  const sanitizedCommand = command.replace(/\\/g, '\\\\');
  const sanitizedArgs = commandOptons.map(arg => arg.replace(/\\/g, '\\\\'));
  actions.info(`Executing: ${sanitizedCommand} ${sanitizedArgs.join(" ")}`)

  const ueBuild = spawn(sanitizedCommand,sanitizedArgs, { shell: true });

  ueBuild.stdout.on('data', (data) => {
    actions.info(`${data}`);
  });

  ueBuild.stderr.on('data', (data) => {
    actions.setFailed(`stderr: ${data}`);
  });

  ueBuild.on('close', (code) => {
    actions.info(`child process exited with code ${code}`);
  });
}

const main = async () => {
  const params = setParams();
  const command = setUpCommand(params);
  executeCommand(command.shift(),command);
};

main().catch((e: Error) => actions.setFailed(e));
