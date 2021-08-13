"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const fs = require("fs");
const path = require("path");
const child_process_1 = require("child_process");
const mobile_versions_1 = require("./mobile-versions");
const desktop_versions_1 = require("./desktop-versions");
let [latest_mobile_version_info, latest_android_json] = mobile_versions_1.exportLatestInfo();
fs.watch(mobile_versions_1.versions_folder, (e, filename) => {
    console.log("changed", filename);
    [latest_mobile_version_info, latest_android_json] = mobile_versions_1.exportLatestInfo();
});
let latest_desktop_version_info = desktop_versions_1.getLatestInfo();
fs.watch(desktop_versions_1.versions_folder, (e, filename) => {
    console.log("changed", filename);
    latest_desktop_version_info = desktop_versions_1.getLatestInfo();
});
/*MOKE DATA*/
const target_mime_map = new Map([
    ["ios-plist", "application/octet-stream"],
    ["ios-plist-rc", "application/octet-stream"],
]);
/*API SERVER*/
const server = http.createServer((req, res) => {
    const url_info = new URL(req.url || "", "http://localhost");
    const { searchParams } = url_info;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    if (url_info.pathname === "/api/app/version/latest" ||
        url_info.pathname === "/api/mobile/version/latest") {
        const lang = searchParams.get("lang");
        const channel = searchParams.get("channel");
        // const version = query.version as string | undefined;
        res.setHeader("Content-Type", "application/json");
        latest_mobile_version_info.then((l) => {
            const config_json = l.getByOptions({ lang, channel });
            const target = searchParams.get("target");
            if (target) {
                const target_tmp_file_path = path.join(__dirname, "../assets/target-template/", `${target}.tmp`);
                fs.readFile(target_tmp_file_path, "utf-8", (err, tmp_content) => {
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
    else if (url_info.pathname === "/api/app/version/update" ||
        url_info.pathname === "/api/update") {
        // req.setEncoding("utf8");
        // let data = "";
        // req.on("data", chunk => (data += chunk));
        // req.on("end", () => {
        // 	console.log(data);
        // });
        const updater = child_process_1.spawn("git", ["pull"], {
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
    }
    else if (url_info.pathname === "/api/app/download/apk" ||
        url_info.pathname === "/api/mobile/download/apk") {
        latest_android_json.then((json) => {
            res.statusCode = 301;
            const channel = searchParams.get("channel");
            let android_link = json.android_link;
            let version = json.version;
            if (channel === "beta") {
                android_link = json.beta_android_link;
                version = json.beta_version;
            }
            else if (channel === "alpha") {
                android_link = json.alpha_android_link;
                version = json.alpha_version;
            }
            res.setHeader("location", android_link);
            res.end(`Download BFChain v${version}`);
        });
        return;
    }
    else if (url_info.pathname.startsWith("/api/desktop/version/latest")
    // &&  url_info.pathname.endsWith(".yml")
    ) {
        const sign = searchParams.get("web") || undefined;
        if (sign) {
            res.setHeader("Content-Type", "application/json");
            latest_desktop_version_info.then(l => {
                const result = l.getAllVersionInfo();
                res.end(JSON.stringify(result));
            });
            return;
        }
        let lastIndex = url_info.pathname.lastIndexOf("/");
        let firstIndex = url_info.pathname.indexOf("latest");
        let url = url_info.pathname.substr(0, lastIndex).substr(firstIndex + 6);
        const paramList = url.split("/");
        const paramMap = new Map();
        paramList.forEach((param) => {
            const p = param.split("_");
            paramMap.set(p[0], p[1]);
        });
        const lang = paramMap.get("lang");
        const channel = paramMap.get("channel");
        const platform = paramMap.get("platform");
        const arch = (paramMap.get("arch") || searchParams.get("arch"));
        const type = paramMap.get("type");
        // const version = query.version as string | undefined;
        res.setHeader("Content-Type", "application/json");
        latest_desktop_version_info.then((l) => {
            const config_yaml = l.getByOptions({ lang, channel, platform, arch });
            res.end(config_yaml);
        });
        return;
    }
    res.statusCode = 404;
    res.end();
});
server.listen(8181, () => {
    console.log(server.address());
});
//# sourceMappingURL=index.js.map