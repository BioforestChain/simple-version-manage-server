import * as http from "http";
import * as fs from "fs";
import * as querystring from "querystring";
import * as url from "url";
import * as path from "path";
import * as Bluebird from "bluebird";
import * as vm from "vm";
import { spawn, exec } from "child_process";
import { versionToNumber, simpleToTradition } from "./helper";
type ChannelType = "alpha" | "beta" | "rc" | "stable";

const versions_folder = __dirname + "/../versions";
async function getLatestInfo() {
  const filename_list = (await Bluebird.promisify(fs.readdir)(versions_folder)) as any[];
  const version_info_list = (
    await Promise.all(
      filename_list.map(async (filename) => {
        if (!(filename.startsWith("v") && filename.indexOf("#") !== -1 && filename.endsWith(".json"))) {
          return;
        }
        const filepath = path.join(versions_folder, filename);
        const file_lstat = await Bluebird.promisify(fs.lstat)(filepath);
        if (file_lstat.isFile()) {
          const file_base_info = path.parse(filename).name.split("#");
          const version = file_base_info[0];
          const lang = file_base_info[1];
          return {
            filepath,
            version,
            lang,
            versionNumber: versionToNumber(version),
          };
        }
      })
    )
  ).filter((v) => v);

  version_info_list.sort((a, b) => {
    return b.versionNumber - a.versionNumber;
  });
  const map = new Map<string, string>();
  const latest_versionNumber = version_info_list[0].versionNumber;
  for (let i = 0; i < version_info_list.length; i += 1) {
    const item = version_info_list[i];
    if (item.versionNumber === latest_versionNumber) {
      map.set(item.lang, JSON.stringify(readConfig(item.filepath, item), null, 2));
    } else {
      break;
    }
  }
  type InfoOptions = {
    lang?: string;
    channel?: ChannelType;
    // version?: string;
  };
  return Object.assign(map, {
    parseOptions(json: string, opts: InfoOptions) {
      const content = JSON.parse(json);
      for (let key in content) {
      }
    },
    getByOptions(opts: InfoOptions) {
      const { lang = "eng", channel = "stable" } = opts;
      const key = `${lang}/${channel}`;
      console.log(key);
      let res = map.get(key);
      if (!res) {
        /// 先获取出对应语言版本的信息
        let langRes = map.get(lang);
        if (!langRes) {
          if (lang == "zh-Hant") {
            langRes = map.get("zh-Hans");
            if (langRes) {
              langRes = simpleToTradition(langRes);
              map.set(lang, langRes);
            }
          }
        }
        if (!langRes) {
          langRes = this.getDefault();
          map.set(lang, langRes);
        }
        /// 解析出对用channel版本的信息
        const channelPrefix = channel + "_";
        const content = JSON.parse(langRes);
        for (let key in content) {
          if (key.startsWith(channelPrefix)) {
            // console.log(key, key.slice(channelPrefix.length), content[key]);
            content[key.slice(channelPrefix.length)] = content[key];
          }
        }
        console.log(content);
        /// 保存内容
        res = JSON.stringify(content, null, 2);
        map.set(key, res);
      }
      return res;
    },
    getDefault() {
      return map.get("eng") || map.get("zh-Hans") || map.values().next().value;
    },
  });
}
function readConfig(filepath, version_info) {
  try {
    const config_json = fs.readFileSync(filepath, "utf-8");
    let config = JSON.parse(config_json);
    let exts: string[] = config["@extends"];
    delete config["@extends"];
    if (typeof exts === "string") {
      exts = [exts];
    }

    {
      const helper = {
        /**条件语句*/
        IF: "@IF:",
        get vm_context() {
          return this._vm_context || (this._vm_context = vm.createContext(version_info));
        },
      };
      const smart_mix = (config) => {
        for (let key in config) {
          const sub_config = config[key];
          if (typeof sub_config === "object" && sub_config) {
            smart_mix(sub_config);
          }
          if (key.startsWith(helper.IF)) {
            delete config[key];
            if (!vm.runInContext(key.substr(helper.IF.length), helper.vm_context)) {
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
      config = Object.assign(config, ...exts.map((ext) => readConfig(path.resolve(dirname, ext), version_info)));
    }
    return config;
  } catch (e) {
    console.log(e);
    return {};
  }
}
function exportLatestInfo() {
  const latest_version_info = getLatestInfo();
  const latest_android_json = latest_version_info.then((l) => {
    const config = JSON.parse(l.getDefault());
    return {
      version: config.version,
      beta_version: config.beta_version,
      alpha_version: config.alpha_version,
      android_link: config.download_link_android,
      beta_android_link: config.beta_download_link_android,
      alpha_android_link: config.alpha_download_link_android,
    };
  });
  return [latest_version_info, latest_android_json] as const;
}

let [latest_version_info, latest_android_json] = exportLatestInfo();

fs.watch(versions_folder, () => {
  let [latest_version_info, latest_android_json] = exportLatestInfo();
});
/*MOKE DATA*/
const package_json = require("../package.json");

const target_mime_map = new Map<string, string>([
  ["ios-plist", "application/octet-stream"],
  ["ios-plist-rc", "application/octet-stream"],
]);

/*API SERVER*/
const server = http.createServer((req, res) => {
  const url_info = url.parse(req.url, true);
  const { query } = url_info;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  if (url_info.pathname === "/api/app/version/latest") {
    const lang = query.lang as string | undefined;
    const channel = query.channel as ChannelType | undefined;
    // const version = query.version as string | undefined;

    res.setHeader("Content-Type", "application/json");
    latest_version_info.then((l) => {
      const config_json = l.getByOptions({ lang, channel });
      if (query.target) {
        const target = query.target as string;
        const target_tmp_file_path = path.join(__dirname, "../assets/target-template/", `${target}.tmp`);
        fs.readFile(target_tmp_file_path, { encoding: "UTF-8" }, (err, tmp_content) => {
          if (err) {
            res.statusCode = 404;
            res.end();
          } else {
            const config_obj = JSON.parse(config_json);
            const parsed_content = tmp_content.replace(/\$\{([\w\W]+?)\}/g, (_, key) => {
              return config_obj[key];
            });
            const content_type = target_mime_map.get(target);
            if (content_type) {
              res.setHeader("Content-Type", content_type);
            }
            res.end(parsed_content);
          }
        });
      } else {
        res.end(config_json);
      }
    });
    return;
  } else if (url_info.pathname === "/api/app/version/update") {
    // req.setEncoding("utf8");
    // let data = "";
    // req.on("data", chunk => (data += chunk));
    // req.on("end", () => {
    // 	console.log(data);
    // });
    const updater = spawn("git", ["pull"], {
      cwd: path.resolve(__dirname, "../"),
    });
    updater.stdout.on("data", (msg) => {
      res.write(msg);
    });

    updater.stderr.on("data", (data) => {
      res.write(data);
    });
    updater.on("close", () => {
      res.end();
    });
    return;
  } else if (url_info.pathname === "/api/app/download/apk") {
    latest_android_json.then((json) => {
      res.statusCode = 301;
      const channel = url_info.query.channel;
      let android_link = json.android_link;
      let version = json.version;
      if (channel === "beta") {
        android_link = json.beta_android_link;
        version = json.beta_version;
      } else if (channel === "alpha") {
        android_link = json.alpha_android_link;
        version = json.alpha_version;
      }
      res.setHeader("location", android_link);
      res.end(`Download BFChain v${version}`);
    });
    return;
  }
  res.statusCode = 404;
  res.end();
});
server.listen(8181, () => {
  console.log(server.address());
});
