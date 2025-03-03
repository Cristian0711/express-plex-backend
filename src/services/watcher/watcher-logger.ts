import fs from 'fs/promises';
import path from 'path';

export class WatcherLogger {
    private static instance: WatcherLogger;
    private readonly logPath: string;

    private constructor() {
        this.logPath = path.join(process.cwd(), 'logs', 'watcher.log');
        this.ensureLogDirectory();
    }

    public static getInstance(): WatcherLogger {
        if (!WatcherLogger.instance) {
            WatcherLogger.instance = new WatcherLogger();
        }
        return WatcherLogger.instance;
    }

    private async ensureLogDirectory(): Promise<void> {
        const logDir = path.dirname(this.logPath);
        try {
            await fs.access(logDir);
        } catch {
            await fs.mkdir(logDir, { recursive: true });
        }
    }

    private async writeLog(message: string): Promise<void> {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}\n`;
        
        try {
            await fs.appendFile(this.logPath, logEntry);
        } catch (error) {
            console.error('Error writing to log file:', error);
        }
    }

    async logStart(service: string): Promise<void> {
        await this.writeLog(`Starting check: ${service}`);
    }

    async logEnd(service: string, details?: string): Promise<void> {
        const message = details 
            ? `Finished check: ${service} - ${details}`
            : `Finished check: ${service}`;
        await this.writeLog(message);
    }

    async logError(service: string, error: Error | string): Promise<void> {
        const errorMessage = error instanceof Error ? error.message : error;
        await this.writeLog(`Error in ${service}: ${errorMessage}`);
    }
}