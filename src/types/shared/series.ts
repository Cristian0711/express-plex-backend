export interface Image {
	coverType: 'banner' | 'poster' | 'fanart' | 'clearlogo';
	url: string;
	remoteUrl: string;
}

export interface Language {
	id: number;
	name: string;
}

export interface Season {
	seasonNumber: number;
	monitored: boolean;
}

export interface Rating {
	votes: number;
	value: number;
}

export interface Statistics {
	seasonCount: number;
	episodeFileCount: number;
	episodeCount: number;
	totalEpisodeCount: number;
	sizeOnDisk: number;
	percentOfEpisodes: number;
}

export interface Series {
	title: string;
	sortTitle: string;
	status: 'continuing' | 'ended';
	ended: boolean;
	overview: string | null;
	network: string | null;
	airTime: string | null;
	images: Image[];
	originalLanguage: Language;
	remotePoster: string | null;
	seasons: Season[];
	year: number;
	qualityProfileId: number;
	seasonFolder: boolean;
	monitored: boolean;
	monitorNewItems: string;
	useSceneNumbering: boolean;
	runtime: number;
	tvdbId: number;
	tvRageId: number;
	tvMazeId: number;
	tmdbId: number;
	firstAired: string | null;
	lastAired: string | null;
	seriesType: string;
	cleanTitle: string;
	imdbId: string | null;
	titleSlug: string;
	folder: string;
	certification: string | null;
	genres: string[];
	tags: string[];
	added: string;
	ratings: Rating;
	statistics: Statistics;
	languageProfileId: number;
}