export declare const versions_folder: string;
export declare function getLatestInfo(): Promise<Map<string, string> & {
    parseOptions(json: string, opts: {
        lang?: string | undefined;
        channel?: "alpha" | "beta" | "rc" | "stable" | undefined;
    }): void;
    getByOptions(opts: {
        lang?: string | undefined;
        channel?: "alpha" | "beta" | "rc" | "stable" | undefined;
    }): string;
    getDefault(): string;
}>;
