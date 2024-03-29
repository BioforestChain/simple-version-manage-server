export declare type ChannelType = "alpha" | "beta" | "rc" | "stable";
export declare type PlatformType = "macOS" | "Windows" | "Linux";
export declare type ArchType = "arm64" | "x64";
export declare type TorrentType = "exeProgramConfig" | "checkPointDataConfig" | "exe" | "chainData";
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
