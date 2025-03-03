// global.ts

// Service configurations
export const serviceConfig = {
  // Radarr (movies) configuration
  radarr: {
    baseUrl: 'http://192.168.0.215:7878',
    apiKey: '7c30afb9ba2a4729b23d76f7501a380b',
    tmdbToken: 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1NjhjZDE1MDgwMjkwZTM4MTg4Nzk1OTA3ZjRhOGQ4OCIsIm5iZiI6MTczODM0NDQ2MS4xMjEsInN1YiI6IjY3OWQwODBkMTM0ZjQ4ODE2MTAxMmQ3ZSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.m5uNX_U7JGFGBqOXUF1OmvQDW7M4Kd0y1fL7UwOy49Q'
  },
  
  // Sonarr (TV series) configuration
  sonarr: {
    baseUrl: 'http://192.168.0.248:8989',
    apiKey: '7e9ea2637bdf4d86bd85020dbd7a5174'
  },
  
  // qBittorrent configuration
  qBittorrent: {
    baseUrl: 'http://192.168.0.65:8090/',
    username: 'admin',
    password: 'changeme'
  }
};