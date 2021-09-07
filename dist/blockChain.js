"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestInfo = exports.versions_folder = void 0;
const fs = require("fs");
const path = require("path");
const helper_1 = require("./helper");
exports.versions_folder = __dirname + "/../blockChain";
async function getLatestInfo() {
    const filename_list = await fs.promises.readdir(exports.versions_folder);
    const version_info_list = [];
    await Promise.all(filename_list.map(async (filename) => {
        if (!(filename.endsWith(".json"))) {
            return;
        }
        console.log("fileName ---------", filename);
        const filepath = path.join(exports.versions_folder, filename);
        const file_lstat = await fs.promises.lstat(filepath);
        if (file_lstat.isFile()) {
            const file_base_info = path.parse(filename).name.split("#");
            const version = file_base_info[0];
            const platform = file_base_info[1];
            const channel = file_base_info[2];
            const arch = file_base_info[3];
            const lang = file_base_info[4];
            version_info_list.push({
                filepath,
                version,
                lang: lang || "eng",
                platform,
                channel,
                arch,
                versionNumber: helper_1.versionToNumber(version),
            });
        }
    }));
}
exports.getLatestInfo = getLatestInfo;
//# sourceMappingURL=blockChain.js.map