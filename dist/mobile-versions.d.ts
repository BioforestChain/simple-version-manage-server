export declare const versions_folder: string;
export declare function exportLatestInfo(): readonly [Promise<Map<string, string> & {
    parseOptions(json: string, opts: {
        lang?: string | undefined;
        channel?: "alpha" | "beta" | "rc" | "stable" | undefined;
    }): void;
    getByOptions(opts: {
        lang?: string | undefined;
        channel?: "alpha" | "beta" | "rc" | "stable" | undefined;
    }): string;
    getDefault(): string;
}>, Promise<{
    version: any;
    beta_version: any;
    alpha_version: any;
    android_link: any;
    beta_android_link: any;
    alpha_android_link: any;
}>];
