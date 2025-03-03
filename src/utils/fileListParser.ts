import * as cheerio from 'cheerio';
import { MovieResult } from '@/types/torrent';

export async function parseFileListData(filelistData: string): Promise<MovieResult[]> {
    try {
        const results: MovieResult[] = [];

        const $ = cheerio.load(filelistData);

        $('.torrentrow').each((_, row) => {
            try {
                const $row = $(row);

                const titleLink = $row.find('a[href^="details.php"]');
                const name = titleLink.text().trim();
                const link = titleLink.attr('href') ? `https://filelist.io/${titleLink.attr('href')}` : '';

                const categoryImg = $row.find('a[href^="browse.php?cat="] img');
                const category = categoryImg.attr('alt') || 'Unknown';

                const size = $row.find('div.torrenttable span')
                    .filter((_, el) => {
                        const text = $(el).text().trim();
                        return text.includes('GB') || text.includes('MB');
                    })
                    .first()
                    .text()
                    .trim() || 'Unknown';

                const isFreeleech = !!$row.find('img[alt="FreeLeech"]').length;

                if (name) {
                    results.push({ name, link, size, category, freeleech: isFreeleech });
                }
            } catch (rowError) {
                console.error('Error parsing row:', rowError);
            }
        });

        return results;
    } catch (error) {
        console.error('Error parsing FileList data:', error);
        return [];
    }
}