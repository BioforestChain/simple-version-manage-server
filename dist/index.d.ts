export declare type ChannelType = "alpha" | "beta" | "rc" | "stable";
export declare type PlatformType = "mac" | "win" | "linux";
export declare type ArchType = "x64" | "arm64";
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
