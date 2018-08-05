import * as http from "http";
import * as fs from "fs";
import * as querystring from "querystring";
import * as url from "url";
import * as path from "path";
import * as Bluebird from "bluebird";
import { versionToNumber, simpleToTradition } from "./helper";

const versions_folder = __dirname + "/../versions";
async function getLatestInfo() {
	const filename_list = await Bluebird.promisify(fs.readdir)(versions_folder);
	const version_info_list = (await Promise.all(
		filename_list.map(async filename => {
			if (
				!(
					filename.startsWith("v") &&
					filename.indexOf("#") !== -1 &&
					filename.endsWith(".json")
				)
			) {
				return;
			}
			const filepath = path.join(versions_folder, filename);
			const file_lstat = await Bluebird.promisify(fs.lstat)(filepath);
			if (file_lstat.isFile()) {
				const file_base_info = path.parse(filename).name.split("#");
				const version = file_base_info[0];
				const lang = file_base_info[1];
				return {
					filepath,
					version,
					lang,
					versionNumber: versionToNumber(version),
				};
			}
		}),
	)).filter(v => v);

	version_info_list.sort((a, b) => {
		return b.versionNumber - a.versionNumber;
	});
	const map = new Map<string, string>();
	const latest_versionNumber = version_info_list[0].versionNumber;
	for (let i = 0; i < version_info_list.length; i += 1) {
		const item = version_info_list[i];
		if (item.versionNumber === latest_versionNumber) {
			map.set(item.lang, fs.readFileSync(item.filepath, "utf-8"));
		} else {
			break;
		}
	}
	return Object.assign(map, {
		getByLang(lang: string) {
			var res = map.get(lang);
			if (!res) {
				if (lang == "zh-cmn-Hant") {
					res = map.get("zh-cmn-Hans");
					if (res) {
						res = simpleToTradition(res);
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
			return (
				map.get("en") ||
				map.get("zh-cmn-Hans") ||
				map.values().next().value
			);
		},
	});
}
var latest_version_info = getLatestInfo();

fs.watch(versions_folder, () => {
	latest_version_info = getLatestInfo();
});
/*MOKE DATA*/
const package_json = require("../package.json");

const target_mime_map = new Map<string, string>([
	["ios-plist", "application/octet-stream"],
]);

/*API SERVER*/
const server = http.createServer((req, res) => {
	const url_info = url.parse(req.url, true);
	const { query } = url_info;

	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET");

	if (url_info.pathname === "/api/app/version/latest") {
		const lang = query.lang as string;

		res.setHeader("Content-Type", "application/json");
		latest_version_info.then(l => {
			const config_json = l.getByLang(lang);
			if (query.target) {
				const target = query.target as string;
				const target_tmp_file_path = path.join(
					__dirname,
					"../assets/target-template/",
					`${target}.tmp`,
				);
				fs.readFile(
					target_tmp_file_path,
					{ encoding: "UTF-8" },
					(err, tmp_content) => {
						if (err) {
							res.statusCode = 404;
							res.end();
						} else {
							const config_obj = JSON.parse(config_json);
							const parsed_content = tmp_content.replace(
								/\$\{([\w\W]+?)\}/g,
								(_, key) => {
									return config_obj[key];
								},
							);
							const content_type = target_mime_map.get(target);
							if (content_type) {
								res.setHeader("Content-Type", content_type);
							}
							res.end(parsed_content);
						}
					},
				);
			} else {
				res.end(config_json);
			}
		});
		return;
	} else if (url_info.pathname === "/api/app/version/update") {
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
