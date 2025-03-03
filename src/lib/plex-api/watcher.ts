import { FileService } from '@/services/file-service';
import PlexAPI, { PlexLibrary } from './index';
import { WatchlistService } from '@/services/watchlist-service';

interface MovieInfo {
    title: string;
    year?: number;
}

export class PlexWatcher {
    private readonly REFRESH_ATTEMPTS = 5;
    private readonly REFRESH_DELAY = 10000;
    
    private plex: PlexAPI;
    private watchlistService: WatchlistService;
    private lastWatchlist: MovieInfo[] = [];
    private fileService: FileService;

    constructor(plexToken: string) {
        this.plex = new PlexAPI({ token: plexToken });
        this.watchlistService = new WatchlistService(this.plex);
        this.fileService = FileService.getInstance();
    }

    private async refreshLibraryWithRetry(library: PlexLibrary): Promise<void> {
        for (let i = 0; i < this.REFRESH_ATTEMPTS; i++) {
            console.log(`Refreshing library attempt ${i + 1}/${this.REFRESH_ATTEMPTS}`);
            await library.refresh();
            await new Promise(resolve => setTimeout(resolve, this.REFRESH_DELAY));
        }
    }

    private async findMoviesLibrary(): Promise<PlexLibrary | null> {
        const library = await this.plex.getLibraryByName('Movies');
        if (!library) {
            console.log('Movies library not found!');
            return null;
        }
        return library;
    }

    async checkWatchlist(): Promise<void> {
        try {
            const currentMovies = await this.watchlistService.getWatchlistMovies();
            if (!currentMovies.length) {
                console.log('Watchlist is empty');
                return;
            }

            const { newMovies, removedMovies } = this.watchlistService.detectChanges(
                currentMovies, 
                this.lastWatchlist
            );

            if (newMovies.length > 0) {
                const firstMovie = newMovies[0];
                const exists = await this.fileService.isMovieExists(firstMovie);
                
                if (exists) {
                    console.log(`${firstMovie.title} is already in your library!`);
                    this.plex.removeFromWatchlist(firstMovie.ratingKey || '');
                    this.lastWatchlist = currentMovies;
                    return;
                }

                const success = await this.watchlistService.processNewMovie(firstMovie);
                if (success) {
                    this.lastWatchlist = currentMovies;
                    const library = await this.findMoviesLibrary();
                    if (library) {
                        await this.refreshLibraryWithRetry(library);
                    }
                }
            }

            if (removedMovies.length > 0) {
                console.log('Movies removed:', removedMovies.map(m => m.title).join(', '));
                this.lastWatchlist = currentMovies;
            }
        } catch (error) {
            console.error('Error checking watchlist:', error);
        }
    }
}