import fs from 'fs/promises';
import path from 'path';
import { MediaFile } from '../types/media';

export async function scanDirectory(dirPath: string, type: 'movie' | 'series'): Promise<MediaFile[]> {
    const files: MediaFile[] = [];
    
    try {
        const items = await fs.readdir(dirPath);
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = await fs.stat(fullPath);
            
            if (stat.isDirectory()) {
                files.push({
                    name: item,
                    path: fullPath,
                    type: type,
                    size: stat.size
                });
            }
        }
    } catch (error) {
        console.error(`Error scanning directory ${dirPath}:`, error);
    }
    
    return files;
}