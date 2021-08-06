import * as fs from "fs";
import * as path from "path";
import * as YAML from "yaml";
import { readConfig } from "./config-reader";
import { versionToNumber, simpleToTradition } from "./helper";
import { VersionInfo, ChannelType } from "./index";

export const versions_folder = __dirname + "/../desktop-versions";
export async function getLatestInfo() {
  const filename_list = await fs.promises.readdir(versions_folder);
  const version_info_list: VersionInfo[] = [];

  await Promise.all(
    filename_list.map(async (filename) => {
      if (
        !(
          filename.startsWith("v") &&
          filename.endsWith(".yaml") &&
          filename.includes("#")
        )
      ) {
        return;
      }
      const filepath = path.join(versions_folder, filename);
      const file_lstat = await fs.promises.lstat(filepath);
      if (file_lstat.isFile()) {
        const file_base_info = path.parse(filename).name.split("#");
        const version = file_base_info[0];
        const lang = file_base_info[1];
        version_info_list.push({
          filepath,
          version,
          lang: lang || "eng",
          versionNumber: versionToNumber(version),
        });
      }
    })
  );

  version_info_list.sort((a, b) => {
    return b.versionNumber - a.versionNumber;
  });
  const map = new Map<string, string>();
  const latest_versionNumber = version_info_list[0].versionNumber;
  for (let i = 0; i < version_info_list.length; i += 1) {
    const item = version_info_list[i];
    if (item.versionNumber === latest_versionNumber) {
      map.set(item.lang, YAML.stringify(readConfig(item.filepath, item)));
    } else {
      break;
    }
  }
  type InfoOptions = {
    lang?: string;
    channel?: ChannelType;
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
        const content = YAML.parse(langRes);
        for (let key in content) {
          if (key.startsWith(channelPrefix)) {
            // console.log(key, key.slice(channelPrefix.length), content[key]);
            content[key.slice(channelPrefix.length)] = content[key];
          }
        }
        // console.log(content);
        /// 保存内容
        res = YAML.stringify(content);
        map.set(key, res);
      }
      return res;
    },
    getDefault() {
      return (
        map.get("eng") ||
        map.get("zh-Hans") ||
        (map.values().next().value as string)
      );
    },
  });
}
