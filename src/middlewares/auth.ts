import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { logger } from '../utils/logger';

declare global {
   namespace Express {
     interface Request {
       user?: any;
     }
   }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
 const authHeader = req.headers.authorization;
 
 if (!authHeader?.startsWith('Bearer ')) {
   logger.warn('Authentication failed - Missing or invalid token format');
   res.status(401).json({ error: 'Unauthorized - Missing or invalid token' });
   return;
 }

 const token = authHeader.split(' ')[1];
 const secret = new TextEncoder().encode('access-salt');
 
 jwtVerify(token, secret)
   .then(decoded => {
     logger.info('Authentication successful', {
       username: decoded.payload.username,
       method: req.method,
       url: `${req.baseUrl}${req.path}`,
       ip: req.ip || req.socket.remoteAddress
     });
     req.user = decoded.payload;
     next();
   })
   .catch(error => {
     logger.error('Authentication failed - Invalid token', { error: error.message });
     res.status(401).json({ error: 'Unauthorized - Invalid token' });
  });
};