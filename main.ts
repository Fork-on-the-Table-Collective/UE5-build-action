import * as actions from "@actions/core";
import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";
import * as params from "./src/params.json";

type ParamsType = typeof params
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

const writeStingBase64ToFile = (content:string,path:string) => {
  try {
    fs.writeFileSync(path, Buffer.from(content).toString('base64'));
  } catch (err) {
    actions.setFailed(err)
  }
}

const setUpCommand = (params: ParamsType) => {
  const uprojectPath = params.inputs.uprojectPath.default;
  if (fs.existsSync(uprojectPath)) {
    const uprojectDir = path.basename(path.dirname(uprojectPath));
    const cmdOptions = [];
    if (params.inputs.anticheatEnabled.default) {
      const anticheatDir = path.join(uprojectDir, "Build", "NoRedist");
      if (!fs.existsSync(anticheatDir)) {
        fs.mkdirSync(anticheatDir, { recursive: true });
      }
      const privateKeyPath = path.join(anticheatDir,"base_private.key")
      const publicCertPath = path.join(anticheatDir,"base_public.cer")
      writeStingBase64ToFile(params.inputs.anticheatPrivateKey.default,privateKeyPath)
      writeStingBase64ToFile(params.inputs.anticheatPublicCert.default,publicCertPath)
      actions.info(`Anticheat keys have been written to ${anticheatDir}`)
    }
  
    if (params.inputs.clean.default) {cmdOptions.push("-clean")}
    if (params.inputs.server.default) {cmdOptions.push(`-server -serverplatform=${params.inputs.platform.default} -noclient`)}
    if (params.inputs.cook.default) {cmdOptions.push("-cook")}
    if (params.inputs.stage.default) {cmdOptions.push("-stage")}
    if (params.inputs.pak.default) {cmdOptions.push("-pak")}
    if (params.inputs.package.default) {cmdOptions.push("-package")}
    if (params.inputs.archive.default) {cmdOptions.push(`-archive -archivedirectory="${params.inputs.archivePath.default}"`)}
    if (params.inputs.nullrhi.default) {cmdOptions.push("-nullrhi")}
    if (params.inputs.editor.default) {cmdOptions.push("-nocompileeditor")}
    if (params.inputs.ecriptIniFiles.default) {cmdOptions.push("-encryptinifiles")}
    if (params.inputs.release.default) {cmdOptions.push(`-createreleaseversion=${params.inputs.release.default}`)}
    if (params.inputs.patch.default) {cmdOptions.push(`-generatepatch -basedonreleaseversion=${params.inputs.patch.default}`)}
    if (params.inputs.maps.default) {cmdOptions.push(`-map=${params.inputs.maps.default}`)}
  
    const command=`${params.inputs.runUATPath.default} BuildCookRun -project=${params.inputs.uprojectPath.default} -clientconfig=${params.inputs.builConfig.default} -platform=${params.inputs.platform.default}  ${cmdOptions.join(" ")} -noP4 -build -unattended -utf8output -prereqs`
    return command
  }
  else{
    actions.setFailed(`Project file ${uprojectPath} does not exists`);
  }
};

const main = async () => {
  const params = setParams();
  const command = setUpCommand(params);
  console.log(command)
};

main().catch((e: Error) => actions.setFailed(e));
