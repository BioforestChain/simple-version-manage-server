export declare const versions_folder: string;
export declare function getLatestInfo(): Promise<Map<string, string> & {
    parseOptions(json: string, opts: {
        lang?: string | undefined;
        channel?: "alpha" | "beta" | "rc" | "stable" | undefined;
        platform?: string | undefined;
        arch?: string | undefined;
        type?: string | undefined;
    }): void;
    getAllVersionInfo(): {
        mac: any;
        win: any;
        linux: any;
    };
    getByOptions(opts: {
        lang?: string | undefined;
        channel?: "alpha" | "beta" | "rc" | "stable" | undefined;
        platform?: string | undefined;
        arch?: string | undefined;
        type?: string | undefined;
    }): string | {
        version: any;
        desktop_version: any;
        exe_size: any;
        download_link_desktop: any;
        channel: any;
        arch: any;
        releaseDate: any;
        description: any;
        adaptation: any;
    };
    getDefault(): string;
}>;
