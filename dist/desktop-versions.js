"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestInfo = exports.versions_folder = void 0;
const fs = require("fs");
const path = require("path");
const YAML = require("yaml");
const config_reader_1 = require("./config-reader");
const helper_1 = require("./helper");
exports.versions_folder = __dirname + "/../desktop-versions";
async function getLatestInfo() {
    const filename_list = await fs.promises.readdir(exports.versions_folder);
    const version_info_list = [];
    await Promise.all(filename_list.map(async (filename) => {
        if (!(filename.startsWith("v") &&
            filename.endsWith(".yaml") &&
            filename.includes("#"))) {
            return;
        }
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
    const map = new Map();
    const lastVersionMap = new Map();
    version_info_list.forEach((info) => {
        const key = `${info.lang}/${info.channel}/${info.arch}/${info.platform}`;
        const oldVersion = lastVersionMap.get(key);
        if (oldVersion === undefined || oldVersion < info.versionNumber) {
            lastVersionMap.set(key, info.versionNumber);
            map.set(key, YAML.stringify(config_reader_1.readConfig(info.filepath, info)));
        }
    });
    const formatVersionInfo = (str) => {
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
        };
        return result;
    };
    return Object.assign(map, {
        parseOptions(json, opts) {
            const content = JSON.parse(json);
            for (let key in content) {
            }
        },
        getAllVersionInfo() {
            let result = { mac: [], linux: [], win: [] };
            const versionInfo = map.keys();
            for (let info of versionInfo) {
                const platform = info.split("/")[3];
                if (platform === "mac") {
                    result.mac.push(formatVersionInfo(map.get(info)));
                }
                else if (platform === "win") {
                    result.win.push(formatVersionInfo(map.get(info)));
                }
                else if (platform === "linux") {
                    result.linux.push(formatVersionInfo(map.get(info)));
                }
            }
            return result;
        },
        getByOptions(opts) {
            const { lang = "eng", channel = "alpha", platform, arch, type } = opts;
            let fixPlatform = platform;
            if (platform == "darwin") {
                fixPlatform = "mac";
            }
            const key = `${lang}/${channel}/${arch}/${fixPlatform}`;
            console.log(key);
            let res = map.get(key);
            if (!res) {
                return this.getDefault();
                /// 先获取出对应语言版本的信息
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
            return formatVersionInfo(res);
        },
        getDefault() {
            return (
            // map.get("eng") ||
            // map.get("zh-Hans") ||
            map.values().next().value);
        },
    });
}
exports.getLatestInfo = getLatestInfo;
//# sourceMappingURL=desktop-versions.js.map