"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestInfo = exports.versions_folder = void 0;
const fs = require("fs");
const path = require("path");
const helper_1 = require("./helper");
exports.versions_folder = __dirname + "/../torrent";
async function getLatestInfo() {
    const filename_list = await fs.promises.readdir(exports.versions_folder);
    const version_info_list = [];
    await Promise.all(filename_list.map(async (filename) => {
        if (!(filename.endsWith(".json") && filename.includes("#"))) {
            return;
        }
        const filepath = path.join(exports.versions_folder, filename);
        const file_lstat = await fs.promises.lstat(filepath);
        if (file_lstat.isFile()) {
            const file_base_info = path.parse(filename).name.split("#");
            const version = file_base_info[0];
            const type = file_base_info[1];
            version_info_list.push({
                filepath,
                version,
                type,
                versionNumber: helper_1.versionToNumber(version),
            });
        }
    }));
    const map = new Map();
    const latestVersionMap = new Map();
    version_info_list.forEach((info) => {
        const key = `${info.type}`;
        const oldVersion = latestVersionMap.get(key);
        if (oldVersion === undefined || info.versionNumber > oldVersion) {
            latestVersionMap.set(key, info.versionNumber);
            let rawdata = fs.readFileSync(info.filepath);
            let data = JSON.parse(rawdata);
            map.set(data.type, data);
        }
    });
    return Object.assign(map, {
        getAllChainDataTorrent() {
            let result = { checkPointData: {}, exeProgram: {}, };
            const keys = map.keys();
            for (let type of keys) {
                if (type === "checkPointData") {
                    result.checkPointData = map.get(type);
                }
                else if (type === "exeProgram") {
                    result.exeProgram = map.get(type);
                }
            }
            return result;
        },
        getTorrentByType(type) {
            if (!map.get(type)) {
                return this.getDefault();
            }
            return map.get(type);
        },
        getDefault() {
            return map.values().next().value;
        }
    });
}
exports.getLatestInfo = getLatestInfo;
//# sourceMappingURL=chainDataTorrent.js.map