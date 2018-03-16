import * as http from "http";
import * as fs from "fs";
import * as querystring from "querystring";
import * as url from "url";
import * as path from "path";
import * as util from "util";
import { versionToNumber, simpleToTradition } from "./helper";

const versions_folder = __dirname + "/../versions";
async function getLatestInfo() {
	const filename_list = await util.promisify(fs.readdir)(versions_folder);
	const version_info_list = (await Promise.all(
		filename_list.map(async filename => {
			if (!(filename.startsWith("v") && filename.indexOf("#") !== -1)) {
				return;
			}
			const filepath = path.join(versions_folder, filename);
			const file_lstat = await util.promisify(fs.lstat)(filepath);
			if (file_lstat.isFile()) {
				const file_base_info = path.parse(filename).name.split("#");
				const version = file_base_info[0];
				const lang = file_base_info[1];
				return {
					filepath,
					version,
					lang,
					versionNumber: versionToNumber(version)
				};
			}
		})
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
		}
	});
}
var latest_version_info = getLatestInfo();

fs.watch(versions_folder, () => {
	latest_version_info = getLatestInfo();
});
/*MOKE DATA*/
const package_json = require("../package.json");

/*API SERVER*/
http
	.createServer((req, res) => {
		const url_info = url.parse(req.url);
		const query = querystring.parse(url_info.query);

		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Methods", "GET");

		if (url_info.pathname === "/api/app/version/latest") {
			const lang = query.lang as string;

			res.setHeader("Content-Type", "application/json");
			latest_version_info.then(l => {
				res.end(l.getByLang(lang));
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
	})
	.listen(8180);
