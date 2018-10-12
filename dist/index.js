"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const fs = require("fs");
const url = require("url");
const path = require("path");
const Bluebird = require("bluebird");
const vm = require("vm");
const helper_1 = require("./helper");
const versions_folder = __dirname + "/../versions";
function getLatestInfo() {
    return __awaiter(this, void 0, void 0, function* () {
        const filename_list = yield Bluebird.promisify(fs.readdir)(versions_folder);
        const version_info_list = (yield Promise.all(filename_list.map((filename) => __awaiter(this, void 0, void 0, function* () {
            if (!(filename.startsWith("v") && filename.indexOf("#") !== -1 && filename.endsWith(".json"))) {
                return;
            }
            const filepath = path.join(versions_folder, filename);
            const file_lstat = yield Bluebird.promisify(fs.lstat)(filepath);
            if (file_lstat.isFile()) {
                const file_base_info = path.parse(filename).name.split("#");
                const version = file_base_info[0];
                const lang = file_base_info[1];
                return {
                    filepath,
                    version,
                    lang,
                    versionNumber: helper_1.versionToNumber(version),
                };
            }
        })))).filter(v => v);
        version_info_list.sort((a, b) => {
            return b.versionNumber - a.versionNumber;
        });
        const map = new Map();
        const latest_versionNumber = version_info_list[0].versionNumber;
        for (let i = 0; i < version_info_list.length; i += 1) {
            const item = version_info_list[i];
            if (item.versionNumber === latest_versionNumber) {
                map.set(item.lang, JSON.stringify(readConfig(item.filepath, item), null, 2));
            }
            else {
                break;
            }
        }
        return Object.assign(map, {
            getByLang(lang) {
                var res = map.get(lang);
                if (!res) {
                    if (lang == "zh-cmn-Hant") {
                        res = map.get("zh-cmn-Hans");
                        if (res) {
                            res = helper_1.simpleToTradition(res);
                            map.set(lang, res);
                        }
                    }
                }
                if (!res) {
                    res = this.getDefault();
                    map.set(lang, res);
                }
                return res;
            },
            getDefault() {
                return map.get("en") || map.get("zh-cmn-Hans") || map.values().next().value;
            },
        });
    });
}
function readConfig(filepath, version_info) {
    try {
        const config_json = fs.readFileSync(filepath, "utf-8");
        let config = JSON.parse(config_json);
        let exts = config["@extends"];
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
            const smart_mix = config => {
                for (let key in config) {
                    const sub_config = config[key];
                    if (typeof sub_config === "object" && sub_config) {
                        smart_mix(sub_config);
                    }
                    if (key.startsWith(helper.IF)) {
                        delete config[key];
                        if (!vm.runInContext(key.substr(helper.IF.length), helper.vm_context)) {
                        }
                        else {
                            config = Object.assign(config, sub_config);
                        }
                    }
                }
            };
            smart_mix(config);
        }
        if (exts instanceof Array) {
            const dirname = path.dirname(filepath);
            config = Object.assign(config, ...exts.map(ext => readConfig(path.resolve(dirname, ext), version_info)));
        }
        return config;
    }
    catch (e) {
        console.log(e);
        return {};
    }
}
var latest_version_info = getLatestInfo();
fs.watch(versions_folder, () => {
    latest_version_info = getLatestInfo();
});
/*MOKE DATA*/
const package_json = require("../package.json");
const target_mime_map = new Map([["ios-plist", "application/octet-stream"], ["ios-plist-rc", "application/octet-stream"]]);
/*API SERVER*/
const server = http.createServer((req, res) => {
    const url_info = url.parse(req.url, true);
    const { query } = url_info;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    if (url_info.pathname === "/api/app/version/latest") {
        const lang = query.lang;
        res.setHeader("Content-Type", "application/json");
        latest_version_info.then(l => {
            const config_json = l.getByLang(lang);
            if (query.target) {
                const target = query.target;
                const target_tmp_file_path = path.join(__dirname, "../assets/target-template/", `${target}.tmp`);
                fs.readFile(target_tmp_file_path, { encoding: "UTF-8" }, (err, tmp_content) => {
                    if (err) {
                        res.statusCode = 404;
                        res.end();
                    }
                    else {
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
            }
            else {
                res.end(config_json);
            }
        });
        return;
    }
    else if (url_info.pathname === "/api/app/version/update") {
        req.setEncoding("utf8");
        let data = "";
        req.on("data", chunk => (data += chunk));
        req.on("end", () => {
            console.log(data);
        });
    }
    res.statusCode = 404;
    res.end();
});
server.listen(8180, () => {
    console.log(server.address());
});
//# sourceMappingURL=index.js.map