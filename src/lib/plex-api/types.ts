export interface PlexConfig {
    token: string;
    serverUrl?: string;
    clientId?: string;
}

export interface RequestParams {
  [key: string]: string | number | boolean;
}

export interface PlexLibrarySection {
  id: string;
  key: string;
  title: string;
  type: string;
  agent?: string;
  scanner?: string;
  language?: string;
  uuid?: string;
}

export interface PlexMediaContainer {
  MediaProvider: Array<{
    identifier: string;
    Feature: Array<{
      Directory?: PlexLibrarySection[];
    }>;
  }>;
}

export interface PlexLibrariesResponse {
  MediaContainer: PlexMediaContainer;
}

// Pentru watchlist și alte response-uri
export interface PlexImage {
  alt: string;
  type: 'background' | 'banner' | 'clearLogo' | 'clearLogoWide' | 'coverArt' | 'coverPoster' | 'coverSquare' | 'snapshot';
  url: string;
}

export interface PlexVideo {
  art: string;
  banner?: string;
  guid: string;
  key?: string;
  primaryExtraKey?: string;
  rating?: string;
  ratingKey?: string;
  studio?: string;
  tagline?: string;
  type?: 'movie' | 'show' | 'episode';
  thumb?: string;
  addedAt?: number;
  duration?: number;
  publicPagesURL?: string;
  slug?: string;
  userState?: number;
  title: string;
  contentRating?: string;
  originallyAvailableAt?: string;
  year?: number;
  audienceRating?: number;
  audienceRatingImage?: string;
  ratingImage?: string;
  imdbRatingCount?: number;
  Image?: PlexImage[];
  viewCount?: number;
  lastViewedAt?: number;
}

export interface PlexWatchlistResponse {
  MediaContainer: {
    Metadata: PlexVideo | PlexVideo[];
  };
}

  import { CreateAxiosDefaults } from 'axios';

interface CustomAxiosConfig extends CreateAxiosDefaults {
  maxRetries?: number;
  retryDelay?: number;
  _retryCount?: number;
}

export interface PlexAxiosRequestConfig extends CustomAxiosConfig {
  _retryCount?: number;
}

export interface MovieCategory {
    name: string;
    priority: number;
    requiredTags?: string[];
  }
  
export const MOVIE_CATEGORIES: MovieCategory[] = [
{ name: 'Filme HD-RO', priority: 2, requiredTags: ['1080p'] },
{ name: 'Filme HD', priority: 3, requiredTags: ['1080p'] },
{ name: 'Filme 4K', priority: 1 },
];
  