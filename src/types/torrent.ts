export interface Torrent {
    name: string;
    hash: string;
    state: string;
    progress: number;
    added_on: number;
    save_path: string;
    size: number;
    downloaded: number;
    uploaded: number;
    num_seeds: number;
    num_leechs: number;
    ratio: number;
    content_path: string;
    category: string;
}
 
export interface TorrentResponse {
    success: boolean;
    data?: Torrent[];
    error?: string;
}

export interface MovieResult {
    name: string;
    link: string;
    size: string;
    category: string;
    freeleech: boolean;
}
