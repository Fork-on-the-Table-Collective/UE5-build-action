const YAML = require("yaml");
const params = require("./src/params.json");
const fs = require("fs");

for (const key in params.outputs) {
  delete params.outputs[key].value;
}

const actionyml = new YAML.Document();
actionyml.contents = params;

fs.writeFileSync("action.yml", YAML.stringify(actionyml, { lineWidth: 0 }));
console.log("action.yml updated");
