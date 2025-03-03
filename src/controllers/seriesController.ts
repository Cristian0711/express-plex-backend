import { SeriesService } from "@/services/series-service";
import { Series } from "@/types/shared/series";
import { Request, Response } from 'express';

interface MovieResponse {
  success: boolean;
  data?: Series[];
  error?: string;
  message?: string;
  total?: number;
  searchTerm?: string;
}

interface AuthRequest extends Request {
  user?: {
    username: string;
    ip: string;
    sub: string;
  }
}

export class SeriesController {
  private service: SeriesService;

  constructor() {
    this.service = new SeriesService();
  }

  async searchSeries(req: AuthRequest, res: Response): Promise<void> {
    try {
      const searchTerm = req.query.term as string;

      if (!searchTerm) {
        res.status(400).json({
          success: false,
          error: 'Search term is required. Use ?term=movie-name'
        } as MovieResponse);
        return;
      }

      const movies = await this.service.searchSeries(searchTerm);

      res.json({
        success: true,
        data: movies,
        total: movies.length,
        searchTerm
      } as MovieResponse);

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to search movies',
        message: error instanceof Error ? error.message : 'Unknown error'
      } as MovieResponse);
    }
  }
}