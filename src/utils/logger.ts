import winston from 'winston';
import fs from 'fs';

const logger = winston.createLogger({
 format: winston.format.combine(
   winston.format.timestamp(),
   winston.format.json()
 ),
 transports: [
   new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
   new winston.transports.File({ filename: 'logs/auth.log', level: 'info' }),
   new winston.transports.File({ filename: 'logs/combined.log' })
 ]
});

if (process.env.NODE_ENV !== 'production') {
 logger.add(new winston.transports.Console({
   format: winston.format.combine(
     winston.format.colorize(),
     winston.format.simple()
   )
 }));
}

// Create logs directory if it doesn't exist
if (!fs.existsSync('logs')) {
 fs.mkdirSync('logs');
}

export { logger };