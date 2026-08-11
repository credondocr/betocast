import { appendFileSync, mkdirSync, existsSync, renameSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { config } from './config.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MAX_LOG_SIZE = 10 * 1024 * 1024;
const MAX_LOG_FILES = 5;

class Logger {
  private logDir: string;
  private logFile: string;
  private level: LogLevel;
  private enabled: boolean;

  constructor() {
    this.logDir = config.logDir || join(dirname(config.dbPath), 'logs');
    this.logFile = join(this.logDir, 'betocast.log');
    this.level = (config.logLevel as LogLevel) || 'info';
    this.enabled = config.logToFile !== false;

    if (this.enabled) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private rotateIfNeeded(): void {
    if (!existsSync(this.logFile)) return;

    try {
      const stats = statSync(this.logFile);
      if (stats.size < MAX_LOG_SIZE) return;

      for (let i = MAX_LOG_FILES - 1; i > 0; i--) {
        const oldFile = `${this.logFile}.${i}`;
        const newFile = `${this.logFile}.${i + 1}`;
        if (existsSync(oldFile)) {
          renameSync(oldFile, newFile);
        }
      }

      renameSync(this.logFile, `${this.logFile}.1`);
    } catch {
      // Ignore rotation errors
    }
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  private write(level: LogLevel, message: string, meta?: any): void {
    const formatted = this.formatMessage(level, message, meta);

    if (this.enabled) {
      this.rotateIfNeeded();
      try {
        appendFileSync(this.logFile, formatted + '\n');
      } catch {
        // Fallback to console only
      }
    }

    const consoleFn = level === 'debug' ? console.log :
                      level === 'info' ? console.log :
                      level === 'warn' ? console.warn :
                      console.error;

    if (level === 'error') {
      consoleFn(formatted);
    } else if (this.shouldLog(level)) {
      consoleFn(formatted);
    }
  }

  debug(message: string, meta?: any): void {
    this.write('debug', message, meta);
  }

  info(message: string, meta?: any): void {
    this.write('info', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.write('warn', message, meta);
  }

  error(message: string, meta?: any): void {
    this.write('error', message, meta);
  }
}

export const logger = new Logger();
