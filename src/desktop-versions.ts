import * as fs from "fs";
import * as path from "path";
import * as YAML from "yaml";
import { readConfig } from "./config-reader";
import { versionToNumber, simpleToTradition } from "./helper";
import {
  VersionInfoForDeskTop,
  ChannelType,
  PlatformType,
  ArchType,
} from "./index";
type File = {
  fileName: string,
  filePath: string
};
export const versions_folder = __dirname + "/../desktop-versions";
export async function getLatestInfo() {
  const version_info_list: VersionInfoForDeskTop[] = [];

  const handleFile = (file: File) => {
    const filename = file.fileName;
    const filepath = file.filePath;
    if (
      !(
        filename.startsWith("v") &&
        (filename.endsWith(".yaml") || filename.endsWith(".yml")) &&
        filename.includes("#")
      )
    ) {
      return;
    }
    const file_base_info = path.parse(filename).name.split("#");
    const version = file_base_info[0];
    const platform = file_base_info[1] as PlatformType;
    const channel = file_base_info[2] as ChannelType;
    const arch = file_base_info[3] as ArchType;
    const lang = file_base_info[4];
    version_info_list.push({
      filepath,
      version,
      lang: lang || "eng",
      platform,
      channel,
      arch,
      versionNumber: versionToNumber(version),
    });
  }
  const handleFolder = async (folderName: string) => {
    const filename_list = await fs.promises.readdir(folderName);
    await Promise.all(filename_list.map(async (fileName) => {
      const filePath = path.join(folderName, fileName);
      const file_lstat = await fs.promises.lstat(filePath);
      if (file_lstat.isDirectory()) {
        await handleFolder(filePath);
      } else if (file_lstat.isFile()) {
        handleFile({ fileName, filePath });
      }
    }));
  }

  await handleFolder(versions_folder);

  const map = new Map<string, string>();
  const latestVersionMap = new Map<string, number>();
  version_info_list.forEach((info) => {
    const key = `${info.lang}/${info.channel}/${info.arch}/${info.platform}`;
    const oldVersion = latestVersionMap.get(key);
    if (oldVersion === undefined || info.versionNumber > oldVersion) {
      latestVersionMap.set(key, info.versionNumber);
      map.set(key, YAML.stringify(readConfig(info.filepath, info)));
    }
  });

  type InfoOptions = {
    lang?: string;
    channel?: ChannelType;
    platform?: string;
    arch?: string;
    type?: string;
  };

  const formatVersionInfo = (str: string | undefined) => {
    if (!str) {
      return "";
    }
    const info = YAML.parse(str);
    const result = {
      version: info.version,
      desktop_version: info.version,
      exe_size: info.files[0].size,
      download_link_desktop: info.files[0].url,
      channel: info.channel,
      arch: info.arch,
      release_date: info.release_date,
      description: info.description,
      adaptation: info.adaptation,
    }
    return result;
  }
  return Object.assign(map, {
    parseOptions(json: string, opts: InfoOptions) {
      const content = JSON.parse(json);
      for (let key in content) {
      }
    },
    getAllVersionInfo() {
      let result = { MacOS: [] as any, Windows: [] as any, Linux: [] as any };
      for (const [key, info] of map) {
        const platform = key.split("/")[3];
        if (platform === "MacOS" || platform === "Windows" || platform === "Linux") {
          result[platform].push(formatVersionInfo(info));
        }
      }
      return result;
    },
    getByOptions(opts: InfoOptions) {
      const { lang = "eng", channel = "alpha", platform, arch, type } = opts;
      let fixPlatform = platform;
      if (platform == "darwin") {
        fixPlatform = "MacOS";
      }
      const key = `${lang}/${channel}/${arch}/${fixPlatform}`;
      console.log(key);
      let res = map.get(key);
      if (!res) {
        return this.getDefault();
        // /// 先获取出对应语言版本的信息
        // let langRes = map.get(lang);
        // if (!langRes) {
        //   if (lang == "zh-Hant") {
        //     langRes = map.get("zh-Hans");
        //     if (langRes) {
        //       langRes = simpleToTradition(langRes);
        //       map.set(lang, langRes);
        //     }
        //   }
        // }
        // if (!langRes) {
        //   langRes = this.getDefault();
        //   map.set(lang, langRes);
        // }
        // /// 解析出对用channel版本的信息
        // const channelPrefix = channel + "_";
        // const content = YAML.parse(langRes);
        // for (let key in content) {
        //   if (key.startsWith(channelPrefix)) {
        //     // console.log(key, key.slice(channelPrefix.length), content[key]);
        //     content[key.slice(channelPrefix.length)] = content[key];
        //   }
        // }
        // // console.log(content);
        // /// 保存内容
        // res = YAML.stringify(content);
        // map.set(key, res);
      }
      return res;
    },
    getDefault() {
      return (
        // map.get("eng") ||
        // map.get("zh-Hans") ||
        map.values().next().value as string
      );
    },
  });
}
