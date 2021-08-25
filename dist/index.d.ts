export declare type ChannelType = "alpha" | "beta" | "rc" | "stable";
export declare type PlatformType = "MacOS" | "Windows" | "Linux";
export declare type ArchType = "arm64" | "x64";
export declare type ChainDataType = "exeProgram" | "checkPointData";
export declare type VersionInfo = {
    filepath: string;
    version: string;
    lang: string;
    versionNumber: number;
};
export declare type VersionInfoForDeskTop = {
    filepath: string;
    version: string;
    lang: string;
    channel: ChannelType;
    versionNumber: number;
    platform: PlatformType;
    arch: ArchType;
};
