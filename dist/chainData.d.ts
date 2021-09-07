import { ChainDataType } from "./index";
export declare const versions_folder: string;
export declare function getLatestInfo(): Promise<Map<string, string> & {
    getAllChainData(): {
        checkPointData: any;
        exeProgram: any;
        exeProgramWithCheckPointData: any;
    };
    getChainDataByType(type: ChainDataType): string | undefined;
    getDefault(): string;
}>;
