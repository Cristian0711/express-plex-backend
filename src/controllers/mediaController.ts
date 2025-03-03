import { Request, Response } from 'express';
import { scanDirectory } from '../services/scan-service';
import fs from 'fs/promises';
import path from 'path';
import { TorrentService } from '@/services/torrent-service';
import { Torrent } from '@/types/torrent';
import * as diskusage from 'diskusage';
import { logger } from '@/utils/logger';
import { plexPaths } from '@/config/paths';

interface LogDetails {
    error?: Error | string;
    [key: string]: any;
   }
   
export const logStorageAction = (req: Request, action: string, details?: LogDetails) => {
const username = req.user?.username || 'unknown';
const baseInfo = {
    username,
    action,
    ip: req.ip || req.socket.remoteAddress,
    ...details
};

if (details?.error) {
    logger.error('Storage action failed', baseInfo);
} else {
    logger.info('Storage action', baseInfo);
}
};


interface MediaItem {
   name: string;
   path: string;
   type: 'file' | 'directory';
   children?: MediaItem[];
   size?: number;
   modified?: Date;
}

interface AuthRequest extends Request {
 user?: {
   username: string;
   ip: string;
   sub: string;
 }
}

export class MediaController {
    private service!: TorrentService;
    private async initialize() {
        this.service = await TorrentService.getInstance();
    }
   
   constructor() {
    this.initialize();
   }

   private async getDiskInfo(path: string) {
       try {
           const info = await diskusage.check(path);
           return {
               total: info.total,
               free: info.free,
               used: info.total - info.free
           };
       } catch (error) {
           console.error('Error getting disk info:', error);
           return null;
       }
   }

   private async scanDirectoryRecursively(dirPath: string, type: 'movie' | 'series'): Promise<MediaItem[]> {
       const items: MediaItem[] = [];

       try {
           const entries = await fs.readdir(dirPath, { withFileTypes: true });

           for (const entry of entries) {
               const fullPath = path.join(dirPath, entry.name);
               
               if (entry.isDirectory()) {
                   const children = await this.scanDirectoryRecursively(fullPath, type);
                   const stats = await fs.stat(fullPath);
                   
                   items.push({
                       name: entry.name,
                       path: fullPath,
                       type: 'directory',
                       children,
                       size: this.calculateTotalSize(children),
                       modified: stats.mtime
                   });
               } else {
                   const stats = await fs.stat(fullPath);
                   items.push({
                       name: entry.name,
                       path: fullPath,
                       type: 'file',
                       size: stats.size,
                       modified: stats.mtime
                   });
               }
           }

           return items.sort((a, b) => {
               if (a.type === b.type) {
                   return a.name.localeCompare(b.name);
               }
               return a.type === 'directory' ? -1 : 1;
           });

       } catch (error) {
           console.error(`Error scanning directory ${dirPath}:`, error);
           return [];
       }
   }

   private calculateTotalSize(items: MediaItem[]): number {
       return items.reduce((total, item) => {
           if (item.type === 'directory' && item.children) {
               return total + this.calculateTotalSize(item.children);
           }
           return total + (item.size || 0);
       }, 0);
   }

   async getMediaList(req: AuthRequest, res: Response) {
    try {
        logStorageAction(req, 'GET_MEDIA_LIST');
        
        const moviesPath = plexPaths.movies;
        const seriesPath = plexPaths.series;
           
           const [movies, series, diskInfo] = await Promise.all([
               this.scanDirectoryRecursively(moviesPath, 'movie'),
               this.scanDirectoryRecursively(seriesPath, 'series'),
               this.getDiskInfo(plexPaths.base)
           ]);
   
           res.json({ 
               movies: {
                   path: moviesPath,
                   items: movies,
                   totalSize: this.calculateTotalSize(movies)
               }, 
               series: {
                   path: seriesPath,
                   items: series,
                   totalSize: this.calculateTotalSize(series)
               },
               diskInfo
           });
       } catch (error) {
           logStorageAction(req, 'GET_MEDIA_LIST_ERROR', { error: error instanceof Error ? error.message : 'Unknown error' });
           res.status(500).json({ error: 'Failed to scan directories' });
       }
   }

   async deleteFolder(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { path: folderPath } = req.body;
        logStorageAction(req, 'DELETE_FOLDER', { path: folderPath });

        if (!folderPath) {
            res.status(400).json({ success: false, error: 'Folder path is required' });
            return;
        }

        const allowedPaths = [plexPaths.movies, plexPaths.series];
        if (!allowedPaths.some((allowed) => folderPath.startsWith(allowed))) {
            res.status(403).json({ success: false, error: 'Path not allowed' });
            return;
        }

        const torrents = await this.service.getAllTorrents();
        const associatedTorrent = torrents.find((torrent: Torrent) => {
            const torrentPath = path.join(torrent.save_path, torrent.name);
            return torrentPath === folderPath;
        });

        if (associatedTorrent) {
            try {
                await this.service.deleteTorrent(associatedTorrent.hash, false);
                await new Promise((resolve) => setTimeout(resolve, 3000));
            } catch (torrentError) {
                console.error('Error deleting torrent:', torrentError);
            }
        }

        const folderExists = await fs.access(folderPath).then(() => true).catch(() => false);
        if (folderExists) {
            await fs.rm(folderPath, { recursive: true, force: true });
        }

        res.json({ success: true });
    } catch (error) {
        logStorageAction(req, 'DELETE_FOLDER_ERROR', { error: error instanceof Error ? error.message : 'Unknown error' });
        res.status(500).json({ success: false, error: 'Failed to delete folder' });
    }
	}
}