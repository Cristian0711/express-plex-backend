import { Request, Response } from 'express';
import { TorrentService } from '@/services/torrent-service';
import { TorrentResponse } from '@/types/torrent';
import fs from 'fs';
import { logger } from '@/utils/logger';
import { plexPaths } from '@/config/paths';

interface TorrentLogDetails {
	error?: Error | string;
	[key: string]: any;
   }
   
export const logTorrentAction = (req: Request, action: string, details?: TorrentLogDetails) => {
	const username = req.user?.username || 'unknown';
	const baseInfo = {
		username,
		action,
		ip: req.ip || req.socket.remoteAddress,
		...details
	};

	if (details?.error) {
		logger.error('Torrent action failed', baseInfo);
	} else {
		logger.info('Torrent action', baseInfo);
	}
};

interface AuthRequest extends Request {
 user?: {
   username: string;
   ip: string;
   sub: string;
 }
}

export class TorrentController {
 private service!: TorrentService;
 private async initialize() {
     this.service = await TorrentService.getInstance();
 }

 constructor() {
  this.initialize();
 }

 async getTorrents(req: AuthRequest, res: Response): Promise<void> {
   try {
     logTorrentAction(req, 'GET_TORRENTS');
     const torrents = await this.service.getAllTorrents();
     const plexTorrents = torrents.filter(torrent => torrent.category === 'plex');

     const filteredTorrents = plexTorrents.map((torrent: any) => ({
       id: torrent.hash,
       name: torrent.name,
       state: torrent.state,
       progress: torrent.progress,
       dateAdded: torrent.added_on,
       savePath: torrent.save_path,
       totalSize: torrent.total_size,
       totalDownloaded: torrent.downloaded,
       totalUploaded: torrent.uploaded,
       totalSeeds: torrent.num_complete,
       totalPeers: torrent.num_seeds + torrent.num_leechs,
       ratio: torrent.ratio,
       content_path: torrent.content_path,
     }));

     res.json({
       success: true,
       data: filteredTorrents
     });
   } catch (error) {
     logTorrentAction(req, 'GET_TORRENTS_ERROR', { error: error instanceof Error ? error.message : 'Unknown error' });
     res.status(500).json({
       success: false,
       error: error instanceof Error ? error.message : 'Unknown error'
     } as TorrentResponse);
   }
 }

 async searchTorrents(req: AuthRequest, res: Response): Promise<void> {
   try {
     const movieName = req.query.name as string;
     const filtered = (req.query.filtered as string) === 'true';
     logTorrentAction(req, 'SEARCH_TORRENTS', { query: movieName });

     if (!movieName) {
       res.status(400).json({ error: 'Movie name is required. Use ?name=movie-name' });
       return;
     }

     const movies = await this.service.searchTorrentByName(movieName, filtered);

     res.json({
       success: true,
       data: movies,
       total: movies.length,
       searchTerm: movieName
     });
   } catch (error) {
     logTorrentAction(req, 'SEARCH_TORRENTS_ERROR', { error: error instanceof Error ? error.message : 'Unknown error' });
     res.status(500).json({
       success: false,
       error: 'Internal server error',
       message: error instanceof Error ? error.message : 'Unknown error'
     });
   }
 }

 async downloadTorrent(req: AuthRequest, res: Response): Promise<void> {
   try {
     const { url, category, title } = req.body;
     logTorrentAction(req, 'DOWNLOAD_TORRENT', { category, url });

     if (!category || !['movies', 'series'].includes(category)) {
       res.status(400).json({
         error: 'Invalid category. Must be "movies" or "series"'
       });
       return;
     }

     const filelistUrl = url.replace('details.php', 'download.php');
     const response = await this.service.fetchFilelist(filelistUrl)

     if (!response.ok) {
       throw new Error(`Failed to download torrent: ${response.status}`);
     }

     const torrentBuffer = Buffer.from(await response.arrayBuffer());
     await this.service.addTorrent(title, category, torrentBuffer, {
      category,
      startPaused: false,
      savepath: category === 'movies' ? plexPaths.movies + '/' : plexPaths.series + '/',
      rename: title,
    });

     res.json({
       success: true,
       message: `Torrent added to qBittorrent in ${category} category`
     });
   } catch (error) {
     logTorrentAction(req, 'DOWNLOAD_TORRENT_ERROR', { error: error instanceof Error ? error.message : 'Unknown error' });
     res.status(500).json({
       success: false,
       error: 'Failed to add torrent',
       details: error instanceof Error ? error.message : 'Unknown error'
     });
   }
 }

 async deleteTorrent(req: AuthRequest, res: Response): Promise<void> {
   try {
     const { hash, deleteFiles = true } = req.body;
     logTorrentAction(req, 'DELETE_TORRENT', { hash, deleteFiles });

     if (!hash) {
       res.status(400).json({ error: 'Torrent hash is required' });
       return;
     }

     await this.service.deleteTorrent(hash, deleteFiles);

     res.json({
       success: true,
       message: 'Torrent deleted successfully'
     });
   } catch (error) {
     logTorrentAction(req, 'DELETE_TORRENT_ERROR', { error: error instanceof Error ? error.message : 'Unknown error' });
     res.status(500).json({
       success: false,
       error: 'Failed to delete torrent',
       details: error instanceof Error ? error.message : 'Unknown error'
     });
   }
 }
}