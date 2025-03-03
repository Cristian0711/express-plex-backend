import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const ipAccessMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const getClientIP = (req: Request): string => {
      const forwardedFor = req.headers['x-forwarded-for'];
      if (forwardedFor) {
          return (typeof forwardedFor === 'string' ? forwardedFor : forwardedFor[0]).split(',')[0];
      }
      return req.ip || req.socket.remoteAddress || '0.0.0.0';
  };

  const clientIP = getClientIP(req);
  logger.info('IP access attempt', { ip: clientIP });

  if (clientIP === '45.83.244.168' || clientIP === '::1' || clientIP === '127.0.0.1' || clientIP ==='2a01:367:c204::17:6d9') {
      logger.info('IP access granted', { ip: clientIP });
      next();
  } else {
      logger.warn('IP access denied', { 
          ip: clientIP, 
          route: req.originalUrl,
          method: req.method
      });
      res.status(403).json({ error: 'Access denied' });
  }
};