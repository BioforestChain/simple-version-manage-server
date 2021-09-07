import { TorrentType } from "./index";
export declare const versions_folder: string;
export declare function getLatestInfo(): Promise<Map<string, string> & {
    getAllTorrentConfig(): {
        checkPointData: any;
        exeProgram: any;
    };
    getAllTorrent(): void;
    getTorrentByType(type: TorrentType): string | undefined;
    getTorrentConfigByType(type: TorrentType): string | undefined;
    getDefault(): string;
}>;
