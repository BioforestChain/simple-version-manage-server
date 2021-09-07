import { ChainDataType } from "./index";
export declare const versions_folder: string;
export declare function getLatestInfo(): Promise<Map<string, string> & {
    getAllChainDataTorrent(): {
        checkPointData: any;
        exeProgram: any;
    };
    getTorrentByType(type: ChainDataType): string | undefined;
    getDefault(): string;
}>;
