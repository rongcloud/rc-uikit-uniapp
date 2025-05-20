import { LogTag } from '@/RCUIKit/enum/logTag';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 4,
  INFO = 3,
  WARN = 2,
  ERROR = 1,
}

/**
 * 日志工具类
 */
class Logger {
  private static instance: Logger;

  private currentLevel: LogLevel = LogLevel.DEBUG;

  private prefix: string = '[RCUIKit]';

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * 设置日志级别
   * @param level 日志级别，只有大于等于此级别的日志才会被打印
   */
  public setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * 设置日志前缀
   */
  public setPrefix(prefix: string): void {
    this.prefix = prefix;
  }

  /**
   * 格式化日志内容
   */
  private formatLog(...args: any[]): string {
    const timestamp = new Date().toISOString();
    return [
      `${timestamp} ${this.prefix}`,
      args.join(' '),
    ].join(' | ');
  }

  /**
   * 检查是否应该打印该级别的日志
   */
  private shouldLog(level: LogLevel): boolean {
    return level <= this.currentLevel;
  }

  /**
   * 输出调试日志
   */
  public debug(tag: LogTag, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatLog(...[tag, ...args]));
    }
  }

  /**
   * 输出信息日志
   */
  public info(tag: LogTag, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatLog(...[tag, ...args]));
    }
  }

  /**
   * 输出警告日志
   */
  public warn(tag: LogTag, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatLog(...[tag, ...args]));
    }
  }

  /**
   * 输出错误日志
   */
  public error(tag: LogTag, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatLog(...[tag, ...args]));
    }
  }

  /**
   * 根据日志级别输出日志
   */
  public log(level: LogLevel, tag: LogTag, ...args: any[]): void {
    if (!this.shouldLog(level)) return;

    switch (level) {
      case LogLevel.DEBUG:
        this.debug(tag, ...args);
        break;
      case LogLevel.INFO:
        this.info(tag, ...args);
        break;
      case LogLevel.WARN:
        this.warn(tag, ...args);
        break;
      case LogLevel.ERROR:
        this.error(tag, ...args);
        break;
    }
  }
}

export const logger = Logger.getInstance();

logger.setLevel(LogLevel.DEBUG);
