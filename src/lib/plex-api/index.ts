// index.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, Method } from 'axios';
import { URL } from 'url';
import { PlexLibrary } from './library';
import {
  PlexConfig,
  RequestParams,
  PlexLibrariesResponse,
  PlexWatchlistResponse,
  PlexVideo,
  PlexAxiosRequestConfig
} from './types';

export class PlexAPI {
  private readonly discoverClient: AxiosInstance;
  private readonly serverClient: AxiosInstance;
  private readonly clientId: string;
  private readonly DISCOVER_URL = 'https://discover.provider.plex.tv';
  private readonly DEFAULT_SERVER_URL = 'http://127.0.0.1:32400';

  constructor(private readonly config: PlexConfig) {
    this.clientId = config.clientId ?? this.generateClientId();
    const defaultHeaders = {
      'X-Plex-Token': config.token,
      'X-Plex-Client-Identifier': this.clientId,
      'Accept': 'application/json'
    };
    
    // Configurare client discover
    this.discoverClient = axios.create({
      baseURL: this.DISCOVER_URL,
      headers: defaultHeaders,
      timeout: 30000 // 30s timeout
    } as PlexAxiosRequestConfig);

    // Setăm proprietățile custom după creare
    (this.discoverClient.defaults as PlexAxiosRequestConfig).maxRetries = 3;
    (this.discoverClient.defaults as PlexAxiosRequestConfig).retryDelay = 2000;
    
    // Configurare client server local
    this.serverClient = axios.create({
      baseURL: config.serverUrl ?? this.DEFAULT_SERVER_URL,
      headers: defaultHeaders,
      timeout: 10000 // 10s timeout
    });
    
    // Adăugăm retry logic pentru discover client
    this.discoverClient.interceptors.response.use(
        response => response,
        async error => {
          const config = error.config as AxiosRequestConfig;
          const customConfig = config as PlexAxiosRequestConfig;
          
          const currentRetryCount = customConfig._retryCount || 0;
          const maxRetries = customConfig.maxRetries || 3;
          
          if (!config || currentRetryCount >= maxRetries) {
            return Promise.reject(error);
          }
      
          // Incrementăm contorul
          customConfig._retryCount = currentRetryCount + 1;
          
          // Calculăm delay-ul
          const baseDelay = customConfig.retryDelay || 2000;
          const delay = baseDelay * Math.pow(2, customConfig._retryCount - 1);
          
          console.log(`Request failed, retrying (${customConfig._retryCount}/${maxRetries}) in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return this.discoverClient.request(config);
        }
      );
  }

  private generateClientId(): string {
    return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }

  private async handleRequestError(error: any): Promise<never> {
    let message = 'Unknown error';
    let statusCode = undefined;

    if (error.response) {
      statusCode = error.response.status;
      message = error.response.data?.message || `HTTP Error ${statusCode}`;
    } else if (error.request) {
      if (error.code === 'ECONNABORTED') message = 'Request timed out';
      else if (error.code === 'ECONNRESET') message = 'Connection was reset';
      else message = error.message || 'No response received';
    } else {
      message = error.message;
    }

    throw new Error(`Plex API Error (${statusCode}): ${message}`);
  }

  async getLibraries(): Promise<PlexLibrary[]> {
    try {
      const response = await this.serverClient.get<PlexLibrariesResponse>('/media/providers');
      
      const libraries = response.data.MediaContainer.MediaProvider
        .find(provider => provider.identifier === 'com.plexapp.plugins.library')
        ?.Feature
        .find(feature => feature.Directory)
        ?.Directory;

      if (!libraries) {
        throw new Error('No libraries found in Plex response');
      }

      return libraries.map(section => new PlexLibrary(this, section));
    } catch (error) {
      throw this.handleRequestError(error);
    }
  }

  async getLibraryByName(name: string): Promise<PlexLibrary | undefined> {
    const libraries = await this.getLibraries();
    return libraries.find(lib => lib.title === name);
  }

  async refreshLibrary(id: string): Promise<void> {
    try {
      await this.serverClient.get(`/library/sections/${id}/refresh`);
    } catch (error) {
      throw this.handleRequestError(error);
    }
  }

  async getWatchlist(): Promise<PlexWatchlistResponse> {
    try {
      const response = await this.discoverClient.get<PlexWatchlistResponse>('/library/sections/watchlist/all');
      return response.data;
    } catch (error) {
      throw this.handleRequestError(error);
    }
  }

  async removeFromWatchlist(key: string): Promise<void> {
    try {
      await this.discoverClient.put(`/actions/removeFromWatchlist?ratingKey=${key}`);
    } catch (error) {
      throw this.handleRequestError(error);
    }
  }

  async getWatchlistVideos(): Promise<PlexVideo[]> {
    try {
      const response = await this.getWatchlist();
      
      if (!response?.MediaContainer?.Metadata) {
        console.log('No videos found in watchlist');
        return [];
      }
      
      const videos = Array.isArray(response.MediaContainer.Metadata) 
        ? response.MediaContainer.Metadata 
        : [response.MediaContainer.Metadata];

      return videos.filter((video): video is PlexVideo => 
        video !== undefined && 
        video !== null &&
        typeof video.type === 'string' &&
        video.type === 'movie'
      );
    } catch (error) {
      console.error('Error getting watchlist videos:', error);
      return [];
    }
  }

  async request<T>(
    endpoint: string,
    method: Method = 'GET',
    params: RequestParams = {},
    data?: any,
    useDiscoverClient: boolean = false
  ): Promise<AxiosResponse<T>> {
    try {
      const client = useDiscoverClient ? this.discoverClient : this.serverClient;
      const url = new URL(endpoint, client.defaults.baseURL);
      
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value.toString());
      });
      
      return await client({
        method,
        url: url.toString(),
        data
      });
    } catch (error) {
      throw this.handleRequestError(error);
    }
  }
}

export { PlexLibrary } from './library';
export * from './types';
export default PlexAPI;