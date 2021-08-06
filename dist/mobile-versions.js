"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportLatestInfo = exports.versions_folder = void 0;
const fs = require("fs");
const path = require("path");
const config_reader_1 = require("./config-reader");
const helper_1 = require("./helper");
exports.versions_folder = __dirname + "/../versions";
async function getLatestInfo() {
    const filename_list = await fs.promises.readdir(exports.versions_folder);
    const version_info_list = [];
    await Promise.all(filename_list.map(async (filename) => {
        if (!(filename.startsWith("v") &&
            filename.indexOf("#") !== -1 &&
            filename.endsWith(".json"))) {
            return;
        }
        const filepath = path.join(exports.versions_folder, filename);
        const file_lstat = await fs.promises.lstat(filepath);
        if (file_lstat.isFile()) {
            const file_base_info = path.parse(filename).name.split("#");
            const version = file_base_info[0];
            const lang = file_base_info[1];
            version_info_list.push({
                filepath,
                version,
                lang,
                versionNumber: helper_1.versionToNumber(version),
            });
        }
    }));
    version_info_list.sort((a, b) => {
        return b.versionNumber - a.versionNumber;
    });
    const map = new Map();
    const latest_versionNumber = version_info_list[0].versionNumber;
    for (let i = 0; i < version_info_list.length; i += 1) {
        const item = version_info_list[i];
        if (item.versionNumber === latest_versionNumber) {
            map.set(item.lang, JSON.stringify(config_reader_1.readConfig(item.filepath, item), null, 2));
        }
        else {
            break;
        }
    }
    return Object.assign(map, {
        parseOptions(json, opts) {
            const content = JSON.parse(json);
            for (let key in content) {
            }
        },
        getByOptions(opts) {
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
                            langRes = helper_1.simpleToTradition(langRes);
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
                // console.log(content);
                /// 保存内容
                res = JSON.stringify(content, null, 2);
                map.set(key, res);
            }
            return res;
        },
        getDefault() {
            return (map.get("eng") ||
                map.get("zh-Hans") ||
                map.values().next().value);
        },
    });
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
    return [latest_version_info, latest_android_json];
}
exports.exportLatestInfo = exportLatestInfo;
//# sourceMappingURL=mobile-versions.js.map