import * as fs from 'node:fs/promises';
import path from 'path';
import { MovieInfo } from '@/types/plex';
import { plexPaths } from '@/config/paths';

interface MediaInfo {
    path: string;
    quality?: string;
}

interface MediaList {
    movies: Record<string, MediaInfo>;
    series: Record<string, MediaInfo>;
}

interface CheckResult {
    type: 'movies' | 'series';
    name: string;
    path: string;
    exists: boolean;
}


export class FileService {
    private readonly trackingFilePath: string;
    private mediaList: MediaList = {
        movies: {},
        series: {}
    };

    private static instance: FileService;

    private constructor(private readonly basePath: string = plexPaths.base) {
        this.trackingFilePath = plexPaths.mediaList;
        this.loadMediaList();
    }

    public static getInstance(): FileService {
        if (!FileService.instance) {
            FileService.instance = new FileService();
        }
        return FileService.instance;
    }

    private async loadMediaList() {
        try {
            const fileContent = await fs.readFile(this.trackingFilePath, 'utf-8');
            this.mediaList = JSON.parse(fileContent);
        } catch (error) {
            console.log('No existing media list found, creating new one');
            await this.saveMediaList();
        }
    }

    private async saveMediaList() {
        try {
            await fs.writeFile(
                this.trackingFilePath, 
                JSON.stringify(this.mediaList, null, 2)
            );
        } catch (error) {
            console.error('Error saving media list:', error);
        }
    }

    private extractQualityFromPath(path: string): string | undefined {
        const qualityMatch = path.match(/\b(1080p|720p|2160p|1440p)\b/i);
        return qualityMatch ? qualityMatch[1].toLowerCase() : undefined;
    }

    async addToList(type: 'movies' | 'series', name: string, path: string) {
        const quality = this.extractQualityFromPath(path);
        this.mediaList[type][name] = {
            path,
            quality
        };
        await this.saveMediaList();
    }

    async removeFromList(type: 'movies' | 'series', name: string) {
        delete this.mediaList[type][name];
        await this.saveMediaList();
    }

    async getMediaList(): Promise<MediaList> {
        return this.mediaList;
    }

    async isInList(type: 'movies' | 'series', name: string): Promise<boolean> {
        return !!this.mediaList[type][name];
    }

    async getPathFromList(type: 'movies' | 'series', name: string): Promise<string | null> {
        return this.mediaList[type][name]?.path || null;
    }

    async getQualityFromList(type: 'movies' | 'series', name: string): Promise<string | null> {
        const mediaInfo = this.mediaList[type][name];
        if (!mediaInfo) return null;
        
        if (!mediaInfo.quality && mediaInfo.path) {
            const quality = this.extractQualityFromPath(mediaInfo.path);
            if (quality) {
                mediaInfo.quality = quality;
                await this.saveMediaList();
            }
        }

        return mediaInfo.quality || null;
    }

    normalizeMovieTitle(title: string): string {
        return title
            .replace(/[^a-zA-Z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private normalizeForComparison(torrentTitle: string, searchTitle?: string): string {
        const normalized = torrentTitle
            .toLowerCase()
            .replace(/\(.*?\)/g, '')
            .replace(/\[.*?\]/g, '')
            .replace(/[.,\-_]/g, ' ')
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (searchTitle) {
            const searchWordCount = searchTitle.split(' ').length;
            return normalized.split(' ').slice(0, searchWordCount).join(' ');
        }

        return normalized;
    }

    async listMovies(): Promise<string[]> {
        try {
            return await fs.readdir(this.basePath);
        } catch (error) {
            console.error('Error listing movies directory:', error);
            return [];
        }
    }

    async isMovieExists(movie: MovieInfo): Promise<boolean> {
        if (await this.isInList('movies', movie.title) || 
            await this.isInList('movies',  `${movie.title} ${movie.year}`)) {
            return true;
        }

        // Then check in filesystem
        try {
            const files = await this.listMovies();
            const normalizedNewMovie = this.normalizeForComparison(movie.title);

            return files.some(file => {
                const normalizedFile = this.normalizeForComparison(file, movie.title);
                return normalizedNewMovie === normalizedFile;
            });
        } catch (error) {
            console.error('Error checking existing movies:', error);
            return false;
        }
    }

    async getMovieFolder(movie: MovieInfo): Promise<string | null> {
        // First check in our tracking list
        const trackedPath = await this.getPathFromList('movies', movie.title);
        if (trackedPath) {
            return trackedPath;
        }

        // Then check in filesystem
        try {
            const files = await this.listMovies();
            const normalizedNewMovie = this.normalizeForComparison(movie.title);

            const matchingFile = files.find(file => {
                const normalizedFile = this.normalizeForComparison(file, movie.title);
                return normalizedNewMovie === normalizedFile;
            });

            if (matchingFile) {
                const fullPath = path.join(this.basePath, matchingFile);
                // Add to tracking list when found
                await this.addToList('movies', movie.title, fullPath);
                return fullPath;
            }
            
            return null;
        } catch (error) {
            console.error('Error getting movie folder:', error);
            return null;
        }
    }

    async getMovieSize(movie: MovieInfo): Promise<number> {
        try {
            const movieFolder = await this.getMovieFolder(movie);
            if (!movieFolder) return 0;

            const stats = await fs.stat(movieFolder);
            return stats.size;
        } catch (error) {
            console.error('Error getting movie size:', error);
            return 0;
        }
    }

    createMoviePath(movie: MovieInfo): string {
        const movieName = this.normalizeMovieTitle(movie.title);
        const yearStr = movie.year ? ` (${movie.year})` : '';
        const fullPath = path.join(this.basePath, `${movieName}${yearStr}`);
        // Add to tracking list when creating new path
        this.addToList('movies', movie.title, fullPath);
        return fullPath;
    }

    async deleteMovie(movie: MovieInfo): Promise<boolean> {
        try {
            const movieFolder = await this.getMovieFolder(movie);
            if (!movieFolder) return false;

            await fs.rm(movieFolder, { recursive: true, force: true });
            // Remove from tracking list when deleted
            await this.removeFromList('movies', movie.title);
            return true;
        } catch (error) {
            console.error('Error deleting movie:', error);
            return false;
        }
    }

    private async checkPath(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async checkMediaList(): Promise<CheckResult[]> {
        const results: CheckResult[] = [];
        
        // Verifică filme
        for (const [name, info] of Object.entries(this.mediaList.movies)) {
            const exists = await this.checkPath(info.path);
            if (!exists) {
                results.push({
                    type: 'movies',
                    name,
                    path: info.path,
                    exists: false
                });
                await this.removeFromList('movies', name);
            }
        }

        for (const [name, info] of Object.entries(this.mediaList.series)) {
            const exists = await this.checkPath(info.path);
            if (!exists) {
                results.push({
                    type: 'series',
                    name,
                    path: info.path,
                    exists: false
                });
                await this.removeFromList('series', name);
            }
        }

        return results;
    }
}