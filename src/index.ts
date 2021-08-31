import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { spawn, exec } from "child_process";
import {
  exportLatestInfo as exportLatestMobileInfo,
  versions_folder as mobile_versions_folder,
} from "./mobile-versions";
import {
  getLatestInfo as exportLatestDesktopInfo,
  versions_folder as desktop_versions_folder,
} from "./desktop-versions";
import { getLatestInfo as exportLatestTorrents, versions_folder as chainData_version_folder } from "./torrent-versions"
import { url } from "inspector";
export type ChannelType = "alpha" | "beta" | "rc" | "stable";
export type PlatformType = "MacOS" | "Windows" | "Linux";
export type ArchType = "arm64" | "x64";
export type TorrentType = "exeProgramConfig" | "checkPointDataConfig" | "exe" | "chainData";

export type VersionInfo = {
  filepath: string;
  version: string;
  lang: string;
  versionNumber: number;
};

export type VersionInfoForDeskTop = {
  filepath: string;
  version: string;
  lang: string;
  channel: ChannelType;
  versionNumber: number;
  platform: PlatformType;
  arch: ArchType;
};
let [latest_mobile_version_info, latest_android_json] =
  exportLatestMobileInfo();

fs.watch(mobile_versions_folder, { recursive: true }, (e, filename) => {
  console.log("changed", filename);
  [latest_mobile_version_info, latest_android_json] = exportLatestMobileInfo();
});

let latest_desktop_version_info = exportLatestDesktopInfo();

fs.watch(desktop_versions_folder, { recursive: true }, (e, filename) => {
  console.log("changed", filename);
  latest_desktop_version_info = exportLatestDesktopInfo();
});


let latest_torrents_version_info = exportLatestTorrents();
fs.watch(chainData_version_folder, { recursive: true }, (e, filename) => {
  console.log("changed", filename);
  latest_torrents_version_info = exportLatestTorrents();
});
/*MOKE DATA*/

const target_mime_map = new Map<string, string>([
  ["ios-plist", "application/octet-stream"],
  ["ios-plist-rc", "application/octet-stream"],
]);

/*API SERVER*/
const server = http.createServer((req, res) => {
  const url_info = new URL(req.url || "", "http://localhost");
  const { searchParams } = url_info;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  if (
    url_info.pathname === "/api/app/version/latest" ||
    url_info.pathname === "/api/mobile/version/latest"
  ) {
    const lang = searchParams.get("lang") as string | undefined;
    const channel = searchParams.get("channel") as ChannelType | undefined;
    // const version = query.version as string | undefined;

    res.setHeader("Content-Type", "application/json");
    latest_mobile_version_info.then((l) => {
      const config_json = l.getByOptions({ lang, channel });
      const target = searchParams.get("target");
      if (target) {
        const target_tmp_file_path = path.join(
          __dirname,
          "../assets/target-template/",
          `${target}.tmp`
        );
        fs.readFile(target_tmp_file_path, "utf-8", (err, tmp_content) => {
          if (err) {
            res.statusCode = 404;
            res.end();
          } else {
            const config_obj = JSON.parse(config_json);
            const parsed_content = tmp_content.replace(
              /\$\{([\w\W]+?)\}/g,
              (_, key) => {
                return config_obj[key];
              }
            );
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
  } else if (
    url_info.pathname === "/api/app/version/update" ||
    url_info.pathname === "/api/update"
  ) {
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
  } else if (
    url_info.pathname === "/api/app/download/apk" ||
    url_info.pathname === "/api/mobile/download/apk"
  ) {
    latest_android_json.then((json) => {
      res.statusCode = 301;
      const channel = searchParams.get("channel");
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
  } else if (
    url_info.pathname.startsWith("/api/desktop/version/latest")
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
    const paramMap = new Map<string, string>();
    paramList.forEach((param) => {
      const p = param.split("_");
      paramMap.set(p[0], p[1]);
    })
    const lang = paramMap.get("lang") as string | undefined;
    const channel = paramMap.get("channel") as ChannelType | undefined;
    const platform = paramMap.get("platform") as PlatformType | undefined;
    const arch = paramMap.get("arch") || searchParams.get("arch") || undefined;
    const type = paramMap.get("type");
    // const version = query.version as string | undefined;
    res.setHeader("Content-Type", "application/json");
    if (!platform) {
      res.end();
      return;
    }
    latest_desktop_version_info.then((l) => {
      const config_yaml = l.getByOptions({ lang, channel, platform, arch });
      res.end(config_yaml);
    });
    return;
  } else if (url_info.pathname === "/api/app/download/getTorrent") {
    const link = searchParams.get("link") || undefined;
    if (link) {
      latest_torrents_version_info.then((l) => {
        const path = l.getTorrentByType(link as TorrentType);
        if (!path) {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ message: "未知资源文件" }));
          return;
        }
        try {
          let stats = fs.statSync(path);
          res.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": "attachment;filename=" + link + ".torrent",
            "Content-Length": stats.size
          });
          fs.createReadStream(path).pipe(res);
        } catch (error) {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ message: "下载资源文件异常" }));
        }
      });
      return;
    }

    const type = searchParams.get("type") || undefined;
    res.setHeader("Content-Type", "application/json");
    if (!type) {
      latest_torrents_version_info.then((l) => {
        const result = l.getAllTorrentConfig();
        res.end(JSON.stringify(result));
      });
    } else {
      latest_torrents_version_info.then((l) => {
        const result = l.getTorrentConfigByType(type as TorrentType);
        res.end(JSON.stringify(result));
      });
    }
    return;
  }
  res.statusCode = 404;
  res.end();
});
server.listen(8181, () => {
  console.log(server.address());
});
