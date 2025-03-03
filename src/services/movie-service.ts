import axios from 'axios';
import { Movie, MovieTitles } from '@/types/shared/movie';
import { serviceConfig } from '@/config/global';

export class MovieService {
    private readonly baseUrl = serviceConfig.radarr.baseUrl;
    private readonly apiKey = serviceConfig.radarr.apiKey;
    private readonly token = serviceConfig.radarr.tmdbToken;

    private isEnglishLetters(text: string): boolean {
        return /^[a-zA-Z0-9\s\-:,.!?()'"]+$/.test(text);
    }

    private extractTitles(movie: Movie): MovieTitles {
        const englishAlternativeTitles = movie.alternateTitles
            .filter(alt => this.isEnglishLetters(alt.title))
            .map(alt => alt.title);

        return {
            title: movie.title,
            alternativeTitles: englishAlternativeTitles
        };
    }

    async searchMovies(term: string): Promise<Movie[]> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v3/movie/lookup`, {
                params: { term },
                headers: {
                    'X-Api-Key': this.apiKey
                }
            });

            console.log('Movies:', response.data);

            return response.data;
        } catch (error) {
            console.error('Error fetching movies:', error);
            throw error;
        }
    }

    async getImdbId(movieId: number): Promise<string> {
        try {
            const response = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}?language=en-US`, {
                params: { language: 'en-US' },
                headers: {
                    'accept': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            });
    
            return response.data.imdb_id;
        } catch (error) {
            console.error('Error fetching movie IMDB ID:', error);
            throw error;
        }
    }

    async searchMovieWithYear(title: string, year?: number): Promise<Movie | null> {
        try {
            const movies = await this.searchMovies(title);
            
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

    async matchMovie(searchInfo: { title: string; year?: number; tmdbId?: number }): Promise<MovieTitles | null> {
        try {
            // 1. Caută după TMDB ID
            if (searchInfo.tmdbId) {
                const moviesByTitle = await this.searchMovies(searchInfo.title);
                const movieById = moviesByTitle.find(movie => movie.tmdbId === searchInfo.tmdbId);
                if (movieById) {
                    console.log('Movie found by TMDB ID:', movieById.title);
                    return this.extractTitles(movieById);
                }
            }

            // 2. Caută după titlu și an
            if (searchInfo.year) {
                const exactMatch = await this.searchMovieWithYear(searchInfo.title, searchInfo.year);
                if (exactMatch) {
                    console.log('Movie found by title and year:', exactMatch.title);
                    return this.extractTitles(exactMatch);
                }
            }

            // 3. Caută doar după titlu
            const movieByTitle = await this.searchMovieWithYear(searchInfo.title);
            if (movieByTitle) {
                console.log('Movie found by title only:', movieByTitle.title);
                return this.extractTitles(movieByTitle);
            }

            console.log('No movie found for:', searchInfo.title);
            return null;
            
        } catch (error) {
            console.error('Error matching movie:', error);
            throw error;
        }
    }
}