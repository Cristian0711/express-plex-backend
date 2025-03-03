export interface AlternateTitle {
	sourceType: string;
	movieMetadataId: number;
	title: string;
}

export interface Image {
	coverType: string;
	url: string;
	remoteUrl: string;
}

export interface Rating {
	votes: number;
	value: number;
	type: string;
}

export interface MovieRatings {
	imdb?: Rating;
	tmdb?: Rating;
	metacritic?: Rating;
	rottenTomatoes?: Rating;
	trakt?: Rating;
}

export interface Collection {
	title: string;
	tmdbId: number;
}

export interface Language {
	id: number;
	name: string;
}

export interface Movie {
	tmdbId: number;
	title: string;
	originalTitle: string;
	originalLanguage: Language;
	alternateTitles: AlternateTitle[];
	year: number;
	runtime: number;
	overview: string;
	images: Image[];
	genres: string[];
	ratings: MovieRatings;
	collection?: Collection;
	studio?: string;
	certification?: string;
	website?: string;
	imdbId?: string;
	popularity?: number;
}

export interface MovieTitles {
	title: string;
	alternativeTitles: string[];
}