import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../../src/utils/logger';

describe('Logger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('constructor', () => {
    it('should create logger with default settings', () => {
      const logger = new Logger();
      logger.error('test');
      expect(consoleSpy.error).toHaveBeenCalledWith('[GemBack] test');
    });

    it('should create logger with custom prefix', () => {
      const logger = new Logger('error', '[Custom]');
      logger.error('test');
      expect(consoleSpy.error).toHaveBeenCalledWith('[Custom] test');
    });
  });

  describe('log levels', () => {
    it('should log debug messages when level is debug', () => {
      const logger = new Logger('debug');
      logger.debug('debug message');
      expect(consoleSpy.log).toHaveBeenCalledWith('[GemBack] debug message');
    });

    it('should not log debug messages when level is info', () => {
      const logger = new Logger('info');
      logger.debug('debug message');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should log info messages when level is info', () => {
      const logger = new Logger('info');
      logger.info('info message');
      expect(consoleSpy.log).toHaveBeenCalledWith('[GemBack] info message');
    });

    it('should not log info messages when level is warn', () => {
      const logger = new Logger('warn');
      logger.info('info message');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should log warn messages when level is warn', () => {
      const logger = new Logger('warn');
      logger.warn('warn message');
      expect(consoleSpy.warn).toHaveBeenCalledWith('[GemBack] warn message');
    });

    it('should log error messages when level is error', () => {
      const logger = new Logger('error');
      logger.error('error message');
      expect(consoleSpy.error).toHaveBeenCalledWith('[GemBack] error message');
    });

    it('should not log any messages when level is silent', () => {
      const logger = new Logger('silent');
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });
  });

  describe('setLevel', () => {
    it('should change log level dynamically', () => {
      const logger = new Logger('error');
      logger.info('info message 1');
      expect(consoleSpy.log).not.toHaveBeenCalled();

      logger.setLevel('info');
      logger.info('info message 2');
      expect(consoleSpy.log).toHaveBeenCalledWith('[GemBack] info message 2');
    });
  });

  describe('with arguments', () => {
    it('should pass additional arguments to console', () => {
      const logger = new Logger('debug');
      const obj = { key: 'value' };
      logger.debug('message', obj, 123);

      expect(consoleSpy.log).toHaveBeenCalledWith('[GemBack] message', obj, 123);
    });
  });
});
