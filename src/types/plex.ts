export interface MovieInfo {
    title: string;
    year?: number;
    tmdbId?: number;
    ratingKey?: string;
}

export interface WatchlistChanges {
    newMovies: MovieInfo[];
    removedMovies: MovieInfo[];
}

export interface PlexVideo {
    type: 'movie' | 'show';
    title: string;
    year?: number;
    // Add other video properties as needed
}

export interface MovieCategory {
    name: string;
    requiredTags?: string[];
}