import { MovieResult } from '@/types/torrent';
import { MovieService } from './movie-service';
import { TorrentService } from './torrent-service';
import { FileService } from './file-service';
import PlexAPI, { MOVIE_CATEGORIES, PlexVideo } from '@/lib/plex-api';
import { MovieInfo, WatchlistChanges } from '@/types/plex';
import { MovieTitles } from '@/types/shared/movie';
import { plexPaths } from '@/config/paths';

export class WatchlistService {
    private movieService: MovieService;
    private torrentService!: TorrentService;
    private fileService: FileService;
    private plex: PlexAPI;

    private async initialize() {
        this.torrentService = await TorrentService.getInstance();
    }

    constructor(private readonly _plex: PlexAPI) {
        this.movieService = new MovieService();
        this.fileService = FileService.getInstance();
        this.plex = _plex;

        this.initialize()
    }

    private normalizeSearchTitle(title: string): string {
        return title
            .replace(/[^a-zA-Z0-9\s]/g, ' ') 
            .replace(/\s+/g, ' ')            
            .trim();                     
    }

    async getWatchlistMovies(): Promise<MovieInfo[]> {
        const movies = await this.plex.getWatchlistVideos();
        return movies
            .filter((v): v is PlexVideo & { type: 'movie' } => v.type === 'movie')
            .map(v => {
                const movieInfo: MovieInfo = { 
                    title: v.title, 
                    year: v.year,
                    ratingKey: v.ratingKey,
                };

                if (v.banner) {
                    const match = v.banner.match(/\/movies\/(\d+)\//);
                    if (match && match[1]) {
                        movieInfo.tmdbId = parseInt(match[1]);
                    }
                }
    
                return movieInfo;
            });
    }

    detectChanges(currentMovies: MovieInfo[], lastWatchlist: MovieInfo[]): WatchlistChanges {
        return {
            newMovies: currentMovies.filter(current => 
                !lastWatchlist.some(last => 
                    last.title === current.title && last.year === last.year
                )
            ),
            removedMovies: lastWatchlist.filter(last => 
                !currentMovies.some(current => 
                    current.title === last.title && current.year === last.year
                )
            )
        };
    }

    private async findMovieOnTrackers(movieTitles: MovieTitles, movieInfo: MovieInfo): Promise<MovieResult | null> {
			const findMovieByCategories = (movies: MovieResult[]): MovieResult | null => {
        const sortedCategories = [...MOVIE_CATEGORIES].sort((a, b) => a.priority - b.priority);

        for (const category of sortedCategories) {
            const movie = movies.find(m => 
                m.category === category.name && 
                (!category.requiredTags || category.requiredTags.every(tag => m.name.includes(tag)))
            );
            if (movie) return movie;
        }
        return null;
    	};


        if(movieInfo.tmdbId) {
            const imdb_id = await this.movieService.getImdbId(movieInfo.tmdbId);
            const searchResults = await this.torrentService.searchToorrentById(imdb_id);
            let movie = findMovieByCategories(searchResults);
            if (movie) {
                console.log('Found movie by TMDB ID:', movieInfo.tmdbId);
                return movie;
            }
        }

        const yearStr = movieInfo.year ? ` ${movieInfo.year}` : '';
        const normalizedMainTitle = this.normalizeSearchTitle(movieTitles.title);
        let searchResults = await this.torrentService.searchTorrentByName(normalizedMainTitle + yearStr);
        let movie = findMovieByCategories(searchResults);
        if (movie) {
                console.log('Found movie by main title:', normalizedMainTitle);
                return movie;
        }

        for (const altTitle of movieTitles.alternativeTitles) {
                const normalizedAltTitle = this.normalizeSearchTitle(altTitle);
                searchResults = await this.torrentService.searchTorrentByName(normalizedAltTitle + yearStr);
                movie = findMovieByCategories(searchResults);
                if (movie) {
                        console.log('Found movie by alternative title:', normalizedAltTitle);
                        return movie;
                }
        }

        console.log('No matching movie found after trying all title variants');
        return null;
    }

    async processNewMovie(movieInfo: MovieInfo): Promise<boolean> {
			try{
				console.log('Processing new movie:', movieInfo.title);
				
				if (await this.fileService.isMovieExists(movieInfo)) {
                    this.plex.removeFromWatchlist(movieInfo.ratingKey || '');
                    console.log(`${movieInfo.title} is already in your library!`);
                    return false;
				}
				
				const movieTitles = await this.movieService.matchMovie(movieInfo);
                if (!movieTitles) {
                    console.log('No movie titles found for:', movieInfo.title);
                    return false;
                }

				const hdRoMovie = await this.findMovieOnTrackers(movieTitles, movieInfo);

				if (!hdRoMovie) {
						console.log(`No result found for ${movieInfo.title}`);
						return false;
				}

				const torrent_name = `${movieTitles.title} ${movieInfo.year}`;
				await this.torrentService.addTorrentFromURL(torrent_name, 'movies', hdRoMovie.link, {
						category: 'movie',
						startPaused: false,
						savepath: plexPaths.movies,
						rename: torrent_name
				});

                
                this.plex.removeFromWatchlist(movieInfo.ratingKey || '');
        return true;
			} catch (error) {
				console.info('Error adding torrent:', error);
				return false;
			}
    }
}
