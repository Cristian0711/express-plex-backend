import { Request, Response } from 'express';
import { MovieService } from '@/services/movie-service';
import { Movie } from '@/types/shared/movie';
import { logger } from '@/utils/logger';
import { serviceConfig } from '@/config/global';

interface MovieResponse {
  success: boolean;
  data?: Movie[];
  error?: string;
  message?: string;
  total?: number;
  searchTerm?: string;
}

interface MovieLogDetails {
  error?: Error | string;
  [key: string]: any;
}

interface AuthRequest extends Request {
  user?: {
    username: string;
    ip: string;
    sub: string;
  }
}

export const logMovieAction = (req: Request, action: string, details?: MovieLogDetails) => {
  const username = req.user?.username || 'unknown';
  const baseInfo = {
    username,
    action,
    ip: req.ip || req.socket.remoteAddress,
    ...details
  };

  if (details?.error) {
    logger.error('Movie action failed', baseInfo);
  } else {
    logger.info('Movie action', baseInfo);
  }
};

export class MovieController {
  private service: MovieService;
  private readonly apiKey = serviceConfig.radarr.apiKey;
  private readonly baseUrl = serviceConfig.radarr.baseUrl;

  constructor() {
    this.service = new MovieService();
  }

  async searchMovies(req: AuthRequest, res: Response): Promise<void> {
    try {
      const searchTerm = req.query.term as string;
      logMovieAction(req, 'SEARCH_MOVIES', { searchTerm });

      if (!searchTerm) {
        res.status(400).json({
          success: false,
          error: 'Search term is required. Use ?term=movie-name'
        } as MovieResponse);
        return;
      }

      const movies = await this.service.searchMovies(searchTerm);

      res.json({
        success: true,
        data: movies,
        total: movies.length,
        searchTerm
      } as MovieResponse);

    } catch (error) {
      logMovieAction(req, 'SEARCH_MOVIES_ERROR', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        searchTerm: req.query.term 
      });

      res.status(500).json({
        success: false,
        error: 'Failed to search movies',
        message: error instanceof Error ? error.message : 'Unknown error'
      } as MovieResponse);
    }
  }

  async getMovieById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      logMovieAction(req, 'GET_MOVIE_BY_ID', { movieId: id });

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Movie ID is required'
        } as MovieResponse);
        return;
      }

      const response = await fetch(`${this.baseUrl}/api/v3/movie/${id}`, {
        headers: {
          'X-Api-Key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch movie: ${response.status}`);
      }

      const movie = await response.json();

      res.json({
        success: true,
        data: [movie]
      } as MovieResponse);

    } catch (error) {
      logMovieAction(req, 'GET_MOVIE_BY_ID_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        movieId: req.params.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get movie',
        message: error instanceof Error ? error.message : 'Unknown error'
      } as MovieResponse);
    }
  }

  async getPopularMovies(req: AuthRequest, res: Response): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      logMovieAction(req, 'GET_POPULAR_MOVIES', { page });

      const response = await fetch(`${this.baseUrl}/api/v3/movie/popular?page=${page}`, {
        headers: {
          'X-Api-Key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch popular movies: ${response.status}`);
      }

      const movies = await response.json();

      res.json({
        success: true,
        data: movies,
        total: movies.length
      } as MovieResponse);

    } catch (error) {
      logMovieAction(req, 'GET_POPULAR_MOVIES_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        page: req.query.page
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get popular movies',
        message: error instanceof Error ? error.message : 'Unknown error'
      } as MovieResponse);
    }
  }

  async getRecentMovies(req: AuthRequest, res: Response): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      logMovieAction(req, 'GET_RECENT_MOVIES', { page });

      const response = await fetch(`${this.baseUrl}/api/v3/movie/recent?page=${page}`, {
        headers: {
          'X-Api-Key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recent movies: ${response.status}`);
      }

      const movies = await response.json();

      res.json({
        success: true,
        data: movies,
        total: movies.length
      } as MovieResponse);

    } catch (error) {
      logMovieAction(req, 'GET_RECENT_MOVIES_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        page: req.query.page
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get recent movies',
        message: error instanceof Error ? error.message : 'Unknown error'
      } as MovieResponse);
    }
  }
}