import { serviceConfig } from '@/config/global';
import { Series } from '@/types/shared/series';
import axios from 'axios';

export class SeriesService {
    private readonly baseUrl = serviceConfig.sonarr.baseUrl;
    private readonly apiKey = serviceConfig.sonarr.apiKey;

    private isEnglishLetters(text: string): boolean {
        return /^[a-zA-Z0-9\s\-:,.!?()'"]+$/.test(text);
    }

    async searchSeries(term: string): Promise<Series[]> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v3/series/lookup`, {
                params: { term },
                headers: {
                    'X-Api-Key': this.apiKey
                }
            });
            
            const items =  response.data.map((item: any) => ({
                title: item.title,
                year: item.year,
                images: item.images,
                ratings: item.ratings,
                firstAired: item.firstAired,
                tvdbId: item.tvdbId,
                genres: item.genres,
                seasons: item.seasons,
            })) as Series[];

            const filteredItems = items.filter(item => item.ratings.votes >= 1000);
            return filteredItems
        } catch (error) {
            console.error('Error fetching movies:', error);
            throw error;
        }
    }

    async searchSeriesWithYear(title: string, year?: number): Promise<Series | null> {
        try {
            const movies = await this.searchSeries(title);
            
            if (movies.length === 0) {
                return null;
            }

            if (year) {
                const exactMatch = movies.find(movie => 
                    movie.title.toLowerCase() === title.toLowerCase() && 
                    movie.year === year
                );
                
                if (exactMatch) {
                    return exactMatch;
                }
            }

            return movies[0];
        } catch (error) {
            console.error('Error searching movie with year:', error);
            throw error;
        }
    }
}