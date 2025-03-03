export type MediaType = 'movie' | 'series';

export interface MediaInfo {
    title: string;
    year?: number;
    tmdbId?: number;
    type: MediaType;
}

export interface MediaTitles {
    title: string;
    alternativeTitles: string[];
}

export interface WatchlistChanges<T extends MediaInfo> {
    newItems: T[];
    removedItems: T[];
}

export interface TorrentResult {
    name: string;
    link: string;
    category?: string;
}

export interface TorrentOptions {
    category: string;
    startPaused: boolean;
    savepath: string;
    rename: string;
}

export interface QualityCategory {
    name: string;
    priority: number;
    requiredTags?: string[];
}

export interface BaseApiResponse {
    title: string;
    year?: number;
    tmdbId?: number;
    alternateTitles: { title: string }[];
}