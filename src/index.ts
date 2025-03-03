import express, { Request, Response } from 'express';
import torrentsRouter from './routes/api/torrents/router'
import storagesRouter from './routes/api/storage/router'
import moviesRouter from './routes/api/movies/router'
import seriesRouter from './routes/series/router'
import cors from 'cors';
import { ipAccessMiddleware } from './middlewares/ip';
import { GlobalWatcher } from './services/watcher/global-watcher';

const app = express();
app.enable('trust proxy');
app.use(cors());
app.use(express.json());
app.use(ipAccessMiddleware);

const PORT = 3000;

const globalWatcher = new GlobalWatcher('SikaHpPVxDj7GM4Gufr3');
globalWatcher.start();

app.use('/api/torrents', torrentsRouter);
app.use('/api/storage', storagesRouter);
app.use('/api/movies', moviesRouter);
app.use('/api/series', seriesRouter);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server rulează pe port PULA ${PORT}`);
    console.log(`Accesibil la http://IP_EXTERN:${PORT}`);
});