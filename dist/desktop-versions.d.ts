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
        macOS: any;
        Windows: any;
        Linux: any;
    };
    getVersionInfoByLang(lang: string): {
        macOS: any;
        Windows: any;
        Linux: any;
    };
    getByOptions(opts: {
        lang?: string | undefined;
        channel?: "alpha" | "beta" | "rc" | "stable" | undefined;
        platform?: string | undefined;
        arch?: string | undefined;
        type?: string | undefined;
    }): string;
    getDefault(): string;
}>;
