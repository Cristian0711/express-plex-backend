import { qBittorrentClient, TorrentAddParameters } from '@robertklep/qbittorrent';
import { MovieResult, Torrent } from '@/types/torrent';
import { parseFileListData } from '@/utils/fileListParser';
import { FileService } from './file-service';
import { serviceConfig } from '@/config/global';

interface AddTorrentOptions {
    savepath?: string;
    category?: string;
    rename?: string;
    startPaused?: boolean;
}

export class TorrentService {
    private client: qBittorrentClient;
    private fileService: FileService;
    private static instance: TorrentService | null = null;
    private isInitialized: boolean = false;

    private constructor() {
        this.fileService = FileService.getInstance();
        this.client = new qBittorrentClient(
            serviceConfig.qBittorrent.baseUrl, 
            serviceConfig.qBittorrent.username, 
            serviceConfig.qBittorrent.password
        );
    }
    
    private async initialize(): Promise<void> {
        if (!this.isInitialized) {
            try {
                console.log('Initializing!');
                await this.client.torrents.info();
                this.isInitialized = true;
                console.log('Initialized!');
            } catch (error) {
                console.error('Failed to initialize qBittorrent client:', error);
                throw new Error('Failed to initialize TorrentService');
            }
        }
    }
    
    public static async getInstance(): Promise<TorrentService> {
        if (!TorrentService.instance) {
            TorrentService.instance = new TorrentService();
            await TorrentService.instance.initialize();
        }
        return TorrentService.instance;
    }
    
    private async ensureConnection(): Promise<void> {
        try {
            this.client = new qBittorrentClient(
                serviceConfig.qBittorrent.baseUrl, 
                serviceConfig.qBittorrent.username, 
                serviceConfig.qBittorrent.password
            );
            await new Promise(resolve => setTimeout(resolve, 100)); 
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to ensure connection!');
        }
    }

    async getAllTorrents(): Promise<Torrent[]> {
        try {
            console.log('Get all torrents!');
            await this.ensureConnection();
            const torrents = await this.client.torrents.info();
            return torrents.filter((torrent: any) => torrent.category === 'plex');
        } catch (error) {
            console.error('Error getting torrents:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to get torrents');
        }
    }

    async addTorrent(title: string, category: 'movies' | 'series', torrentBuffer: Buffer, options: AddTorrentOptions = {}): Promise<any> {
        try {
            await this.ensureConnection();
            const result = await this.client.torrents.add(<TorrentAddParameters>{
                torrents: { 
                    buffer : torrentBuffer
                },
                paused: true,
                savepath: options.savepath,
                category: 'plex',
                sequentialDownload: true,
                rename: options.rename,
            });

            if (!result) {
                throw new Error('Failed to add torrent - no response from qBittorrent');
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            const torrents = await this.getAllTorrents();
            const addedTorrent = torrents.find(t => t.name === title);

            if (!addedTorrent) {
                console.log('Could not find added torrent');
                return false;
            }

            await this.fileService.addToList(category, title, addedTorrent.content_path);
            return result;
        } catch (error) {
            console.error('Error adding torrent:', error);
            throw new Error(
                error instanceof Error 
                    ? `Failed to add torrent: ${error.message}` 
                    : 'Failed to add torrent'
            );
        }
    }

    async addTorrentFromURL(title: string, category: 'movies' | 'series', url: string, options: AddTorrentOptions): Promise<void> {
        try {
            await this.ensureConnection();
            const filelistUrl = url.replace('details.php', 'download.php');
            const response = await this.fetchFilelist(filelistUrl);

            if (!response.ok) {
                throw new Error(`Failed to download torrent: ${response.status}`);
            }

            const torrentBuffer = Buffer.from(await response.arrayBuffer());
            await this.addTorrent(title, category, torrentBuffer, options);
        } catch (error) {
            console.error('Error adding torrent from URL:', error);
            throw new Error(
                error instanceof Error 
                    ? `Failed to add torrent from URL: ${error.message}` 
                    : 'Failed to add torrent from URL'
            );
        }
    }

    async deleteTorrent(hash: string, deleteFiles: boolean = false): Promise<boolean> {
        try {
            await this.ensureConnection();
            await this.client.torrents.delete(hash, deleteFiles);
            return true;
        } catch (error) {
            console.error('Error deleting torrent:', error);
            throw new Error(
                error instanceof Error 
                    ? `Failed to delete torrent: ${error.message}` 
                    : 'Failed to delete torrent'
            );
        }
    }

    async pauseTorrent(hash: string): Promise<boolean> {
        try {
            await this.ensureConnection();
            await this.client.torrents.pause(hash);
            return true;
        } catch (error) {
            console.error('Error pausing torrent:', error);
            throw new Error(
                error instanceof Error 
                    ? `Failed to pause torrent: ${error.message}` 
                    : 'Failed to pause torrent'
            );
        }
    }

    async resumeTorrent(hash: string): Promise<boolean> {
        try {
            await this.ensureConnection();
            await this.client.torrents.resume(hash);
            return true;
        } catch (error) {
            console.error('Error resuming torrent:', error);
            throw new Error(
                error instanceof Error 
                    ? `Failed to resume torrent: ${error.message}` 
                    : 'Failed to resume torrent'
            );
        }
    }

    private normalizeSearchTitle(title: string): string {
        return title
            .replace(/[^a-zA-Z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    public async fetchFilelist(filelistUrl: string): Promise<Response> {
        try {
            const response = await fetch(filelistUrl, {
                method: 'get',
                // headers: { 
                //     'authority': 'filelist.io',
                //     'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                //     'accept-encoding': 'identity',
                //     'accept-language': 'en-US,en;q=0.9',
                //     'cache-control': 'max-age=0',
                //     'priority': 'u=0, i',
                //     'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"',
                //     'sec-ch-ua-mobile': '?0',
                //     'sec-ch-ua-platform': '"Windows"',
                //     'sec-fetch-dest': 'document',
                //     'sec-fetch-mode': 'navigate',
                //     'sec-fetch-site': 'none',
                //     'sec-fetch-user': '?1',
                //     'upgrade-insecure-requests': '1',
                //     'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
                //     'referer': 'https://filelist.io/index.php',
                //     'origin': 'https://filelist.io/',
                //     'Cookie': 'PHPSESSID=qnrdgsivt6pb6q1apvm82iktmn; uid=1239915; pass=0d68c42f4a072a3efda8fbb854f41840'
                // }

                headers: { 
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7', 
                    'Referer': 'https://filelist.io/index.php', 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36', 
                    'Cookie': 'PHPSESSID=qnrdgsivt6pb6q1apvm82iktmn; pass=0d68c42f4a072a3efda8fbb854f41840; uid=1239915'
                  }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch filelist: ${response.status}`);
            }

            return response;
        } catch (error) {
            console.error('Error fetching filelist:', error);
            throw error;
        }
    }

    async searchTorrents(query: string, searchType: 1 | 3, filtered: boolean = false): Promise<MovieResult[]> {
        try {
            let page = 0;
            let results: MovieResult[] = [];
            let hasResults = true;

            // Normalizează query-ul dacă e căutare după nume
            const searchQuery = searchType === 1 ? this.normalizeSearchTitle(query) : query;

            while (hasResults) {
                const filelistURL = `https://filelist.io/browse.php?search=${encodeURIComponent(searchQuery)}&cat=0&searchin=${searchType}&sort=2&page=${page}`;
                const response = await this.fetchFilelist(filelistURL);
                
                if (response.status !== 200) {
                    throw new Error('Failed to fetch from FileList');
                }

                const htmlContent = await response.text();
                const pageResults = await parseFileListData(htmlContent);

                if (pageResults.length === 0) {
                    hasResults = false;
                } else {
                    results.push(...pageResults);
                    page++;
                }
            }

            // Sortare și filtrare doar pentru căutări după nume
            if (searchType === 1) {
                const cleanMovieName = searchQuery
                    .toLowerCase()
                    .replace(/\s*\(\d{4}\)|\s*\[\d{4}\]|\s+\d{4}/, '')
                    .trim();
                
                const normalizedSearch = cleanMovieName.replace(/\s+/g, '.');

                results.sort((a, b) => {
                    const aTitle = a.name.toLowerCase();
                    const bTitle = b.name.toLowerCase();
                    
                    const aExactStart = aTitle.startsWith(normalizedSearch) ? 2 : (aTitle.includes(normalizedSearch) ? 1 : 0);
                    const bExactStart = bTitle.startsWith(normalizedSearch) ? 2 : (bTitle.includes(normalizedSearch) ? 1 : 0);
                    
                    return bExactStart - aExactStart;
                });

                if (filtered) {
                    return results.filter(result => 
                        result.name.toLowerCase().startsWith(normalizedSearch)
                    );
                }
            }

            return results;
        } catch (error) {
            console.error('Error searching torrents:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to search torrents');
        }
    }


    async searchTorrentByName(movieName: string, filtered: boolean = false): Promise<MovieResult[]> {
        return this.searchTorrents(movieName, 1, filtered);
    }

    async searchToorrentById(imdbId: string): Promise<MovieResult[]> {
        const cleanImdbId = imdbId.replace(/^tt/, '');
        return this.searchTorrents(cleanImdbId, 3, false);
    }
}