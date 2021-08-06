import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";
import * as YAML from "yaml";

export function readConfig(filepath: string, ctx: object): object {
  try {
    const config_str = fs.readFileSync(filepath, "utf-8");
    let config;
    if (filepath.endsWith(".json")) {
      config = JSON.parse(config_str);
    } else if (filepath.endsWith(".yaml")) {
      config = YAML.parse(config_str);
    } else {
      throw new TypeError(`read config ${path.extname(filepath)}`);
    }

    let exts: string[] = config["@extends"];
    delete config["@extends"];
    if (typeof exts === "string") {
      exts = [exts];
    }

    {
      const helper = {
        /**条件语句*/
        IF: "@IF:",
        _vm_context: undefined as vm.Context | undefined,
        get vm_context() {
          return this._vm_context || (this._vm_context = vm.createContext(ctx));
        },
      };
      const smart_mix = (config: Record<string, string>) => {
        for (let key in config) {
          const sub_config = config[key];
          if (typeof sub_config === "object" && sub_config) {
            smart_mix(sub_config);
          }
          if (key.startsWith(helper.IF)) {
            delete config[key];
            if (
              !vm.runInContext(key.substr(helper.IF.length), helper.vm_context)
            ) {
            } else {
              config = Object.assign(config, sub_config);
            }
          }
        }
      };
      smart_mix(config);
    }
    if (exts instanceof Array) {
      const dirname = path.dirname(filepath);
      const extendsMix = Object.assign(
        {},
        ...exts.map((ext) => readConfig(path.resolve(dirname, ext), ctx))
      );
      config = Object.assign(extendsMix, config);
    }
    return config;
  } catch (e) {
    console.log(e);
    return {};
  }
}
