import * as fs from "fs";
import * as path from "path";

import { versionToNumber, simpleToTradition } from "./helper";
import {
  TorrentType
} from "./index";
type VersionData = {
  filepath: string,
  version: string,
  type: TorrentType,
  versionNumber: number,
}

export const versions_folder = __dirname + "/../torrents";
export async function getLatestInfo() {
  const filename_list = await fs.promises.readdir(versions_folder);
  const version_info_list: Array<VersionData> = [];
  const torrents_path: Array<string> = [];
  await Promise.all(
    filename_list.map(async (filename) => {
      if (!((filename.endsWith(".torrent") || filename.endsWith(".json")) && filename.includes("#"))) {
        return;
      }
      const filepath = path.join(versions_folder, filename);
      const file_lstat = await fs.promises.lstat(filepath);
      if (file_lstat.isFile()) {
        const file_base_info = path.parse(filename).name.split("#");
        const version = file_base_info[0];
        const type = file_base_info[1] as TorrentType;
        version_info_list.push({
          filepath,
          version,
          type,
          versionNumber: versionToNumber(version),
        });

      }
    })
  );

  const map = new Map<string, string>();
  const latestVersionMap = new Map<string, number>();
  version_info_list.forEach((info) => {
    const key = `${info.type}`;
    const oldVersion = latestVersionMap.get(key);
    if (oldVersion === undefined || info.versionNumber > oldVersion) {
      if (key === "exeProgramConfig" || key === "checkPointDataConfig") {
        latestVersionMap.set(key, info.versionNumber);
        let rawdata = fs.readFileSync(info.filepath) as any;
        let data = JSON.parse(rawdata);
        map.set(data.type, data);
      } else if (key === "exe" || key === "chainData") {
        map.set(key, info.filepath);
      }
    }
  });
  console.log(map);
  return Object.assign(map, {
    getAllTorrentConfig() {
      let result = { checkPointData: {} as any, exeProgram: {} as any, }
      const keys = map.keys();
      for (let type of keys) {
        if (type === "checkPointData") {
          result.checkPointData = map.get(type);
        } else if (type === "exeProgram") {
          result.exeProgram = map.get(type);
        }
      }
      return result;
    },
    getAllTorrent() {

    },
    getTorrentByType(type: TorrentType) {
      if (!map.get(type)) {
        return;
      }
      return map.get(type) as string;
    },
    getTorrentConfigByType(type: TorrentType) {
      if (!map.get(type)) {
        return this.getDefault();
      }
      return map.get(type);
    },
    getDefault() {
      return (
        map.values().next().value as string
      );
    }
  });

}
