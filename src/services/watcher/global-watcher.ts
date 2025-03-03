import { PlexWatcher } from '@/lib/plex-api/watcher';
import { WatcherLogger } from './watcher-logger';
import { FileService } from '../file-service';
import { TorrentService } from '../torrent-service';

export class GlobalWatcher {
    private intervalId?: ReturnType<typeof setInterval>;
    private plexWatcher: PlexWatcher;
    private readonly REFRESH_INTERVAL = 30000; // 30 secunde
    private logger: WatcherLogger;
    private fileService: FileService;
    private torrentService!: TorrentService;

    private async initialize() {
        this.torrentService = await TorrentService.getInstance();
    }

    public constructor(plexToken: string) {
        this.plexWatcher = new PlexWatcher(plexToken);
        this.logger = WatcherLogger.getInstance();
        this.fileService = FileService.getInstance();
        this.initialize();
    }

    private async checkMediaPaths(): Promise<void> {
        try {
            await this.logger.logStart('FileService.checkMediaList');
            const results = await this.fileService.checkMediaList();
            
            if (results.length > 0) {
                const missingMovies = results.filter(r => r.type === 'movies').length;
                const missingSeries = results.filter(r => r.type === 'series').length;
                
                await this.logger.logEnd(
                    'FileService.checkMediaList', 
                    `Found ${results.length} missing items (${missingMovies} movies, ${missingSeries} series)`
                );

                // Log each missing item separately for better tracking
                const torrents = await this.torrentService.getAllTorrents();
                for (const item of results) {
                    await this.logger.logEnd(
                        `Missing ${item.type}`,
                        `${item.name} at path: ${item.path}`
                    );

                    const foundTorrent = torrents.find(t => (t.name === item.name || t.content_path == item.path));

                    if(!foundTorrent) {
                        continue;
                    }

                    const result = await this.torrentService.deleteTorrent(foundTorrent.hash, false);
                    await this.logger.logEnd(
                        `Torrent removed ${item.name}`
                    );
                }
            } else {
                await this.logger.logEnd('FileService.checkMediaList', 'All media paths are valid');
            }
        } catch (error) {
            await this.logger.logError('FileService.checkMediaList', error as Error);
        }
    }

    private async checkAll(): Promise<void> {
        try {
            await this.logger.logStart('GlobalWatcher.checkAll');

            await this.logger.logStart('PlexWatcher.checkMediaPaths');
            await this.checkMediaPaths();
            await this.logger.logEnd('PlexWatcher.checkMediaPaths');

            await this.logger.logStart('PlexWatcher.checkWatchlist');
            await this.plexWatcher.checkWatchlist();
            await this.logger.logEnd('PlexWatcher.checkWatchlist');

            await this.logger.logEnd('GlobalWatcher.checkAll');
        } catch (error) {
            await this.logger.logError('GlobalWatcher.checkAll', error as Error);
        }
    }

    async start(): Promise<void> {
        await this.logger.logStart('GlobalWatcher.start');
        this.checkAll();
        this.intervalId = setInterval(() => {
            this.checkAll();
        }, this.REFRESH_INTERVAL);
    }

    async stop(): Promise<void> {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
            await this.logger.logEnd('GlobalWatcher.stop');
        }
    }
}