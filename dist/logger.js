import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
// 创建日志目录（如果不存在）
const logDir = 'logs';
// 定义日志格式
const logFormat = winston.format.combine(winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
}), winston.format.errors({ stack: true }), winston.format.printf(({ timestamp, level, message, stack }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${stack ? '\n' + stack : ''}`;
}));
// 创建日志传输器
const transports = [
    // 控制台输出
    new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), logFormat),
        level: 'info'
    }),
    // 错误日志文件（按日期轮转）
    new DailyRotateFile({
        filename: path.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        format: logFormat,
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true
    }),
    // 所有日志文件（按日期轮转）
    new DailyRotateFile({
        filename: path.join(logDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        format: logFormat,
        maxSize: '20m',
        maxFiles: '30d',
        zippedArchive: true
    }),
    // 数据库操作专用日志
    new DailyRotateFile({
        filename: path.join(logDir, 'database-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        format: winston.format.combine(logFormat, winston.format.label({ label: 'DATABASE' })),
        maxSize: '20m',
        maxFiles: '30d',
        zippedArchive: true
    })
];
// 创建logger实例
export const logger = winston.createLogger({
    level: 'info',
    format: logFormat,
    transports,
    // 处理未捕获的异常
    exceptionHandlers: [
        new DailyRotateFile({
            filename: path.join(logDir, 'exceptions-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d'
        })
    ],
    // 处理未处理的Promise拒绝
    rejectionHandlers: [
        new DailyRotateFile({
            filename: path.join(logDir, 'rejections-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d'
        })
    ]
});
// 数据库专用logger
export const dbLogger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(winston.format.label({ label: 'DB' }), logFormat),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.label({ label: 'DB' }), logFormat),
            level: 'info'
        }),
        new DailyRotateFile({
            filename: path.join(logDir, 'database-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '30d'
        })
    ]
});
// 工具函数：记录SQL操作
export function logSqlOperation(operation, query, params, duration, error) {
    const logData = {
        operation,
        query: query.replace(/\s+/g, ' ').trim(),
        params: params ? JSON.stringify(params) : undefined,
        duration: duration ? `${duration}ms` : undefined,
        timestamp: new Date().toISOString()
    };
    if (error) {
        dbLogger.error(`SQL操作失败`, { ...logData, error: error.message });
    }
    else {
        dbLogger.info(`SQL操作成功`, logData);
    }
}
// 工具函数：记录连接操作
export function logConnection(action, config, error) {
    const logData = {
        action,
        host: config?.host,
        port: config?.port,
        database: config?.database,
        user: config?.user,
        timestamp: new Date().toISOString()
    };
    if (error) {
        dbLogger.error(`数据库${action === 'connect' ? '连接' : '断开'}失败`, { ...logData, error: error.message });
    }
    else {
        dbLogger.info(`数据库${action === 'connect' ? '连接' : '断开'}成功`, logData);
    }
}
export default logger;
