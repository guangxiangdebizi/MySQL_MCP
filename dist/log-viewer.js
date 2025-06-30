#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logDir = path.join(__dirname, '..', 'logs');
class LogViewer {
    /**
     * 获取所有日志文件
     */
    async getLogFiles() {
        try {
            const files = await fs.readdir(logDir);
            return files.filter(file => file.endsWith('.log')).sort();
        }
        catch (error) {
            console.error('无法读取日志目录:', error);
            return [];
        }
    }
    /**
     * 读取指定日志文件
     */
    async readLogFile(filename) {
        try {
            const filePath = path.join(logDir, filename);
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            return lines.map(line => {
                try {
                    // 解析日志行格式: [timestamp] LEVEL: message
                    const match = line.match(/^\[([^\]]+)\]\s+(\w+):\s+(.+)$/);
                    if (match) {
                        const [, timestamp, level, messageWithData] = match;
                        // 尝试解析JSON数据
                        let message = messageWithData;
                        let data = undefined;
                        try {
                            const jsonMatch = messageWithData.match(/^(.+?)\s+(\{.+\})$/);
                            if (jsonMatch) {
                                message = jsonMatch[1];
                                data = JSON.parse(jsonMatch[2]);
                            }
                        }
                        catch {
                            // 如果不是JSON格式，保持原样
                        }
                        return { timestamp, level, message, data };
                    }
                    return { timestamp: '', level: 'INFO', message: line };
                }
                catch {
                    return { timestamp: '', level: 'INFO', message: line };
                }
            });
        }
        catch (error) {
            console.error(`无法读取日志文件 ${filename}:`, error);
            return [];
        }
    }
    /**
     * 按级别过滤日志
     */
    filterByLevel(logs, level) {
        return logs.filter(log => log.level.toUpperCase() === level.toUpperCase());
    }
    /**
     * 按时间范围过滤日志
     */
    filterByTimeRange(logs, startTime, endTime) {
        return logs.filter(log => {
            const logTime = new Date(log.timestamp);
            const start = new Date(startTime);
            const end = new Date(endTime);
            return logTime >= start && logTime <= end;
        });
    }
    /**
     * 搜索日志内容
     */
    searchLogs(logs, keyword) {
        const lowerKeyword = keyword.toLowerCase();
        return logs.filter(log => log.message.toLowerCase().includes(lowerKeyword) ||
            (log.data && JSON.stringify(log.data).toLowerCase().includes(lowerKeyword)));
    }
    /**
     * 格式化输出日志
     */
    formatLog(log) {
        const colorMap = {
            ERROR: '\x1b[31m', // 红色
            WARN: '\x1b[33m', // 黄色
            INFO: '\x1b[36m', // 青色
            DEBUG: '\x1b[37m', // 白色
        };
        const reset = '\x1b[0m';
        const color = colorMap[log.level] || '';
        let output = `${color}[${log.timestamp}] ${log.level}${reset}: ${log.message}`;
        if (log.data) {
            output += '\n' + JSON.stringify(log.data, null, 2);
        }
        return output;
    }
    /**
     * 显示日志统计
     */
    showStats(logs) {
        const stats = logs.reduce((acc, log) => {
            acc[log.level] = (acc[log.level] || 0) + 1;
            return acc;
        }, {});
        console.log('\n📊 日志统计:');
        console.log('='.repeat(30));
        Object.entries(stats).forEach(([level, count]) => {
            console.log(`${level}: ${count}`);
        });
        console.log(`总计: ${logs.length}`);
    }
    /**
     * 获取最近的错误
     */
    getRecentErrors(logs, count = 10) {
        return logs
            .filter(log => log.level === 'ERROR')
            .slice(-count)
            .reverse();
    }
    /**
     * 分析数据库操作
     */
    analyzeDatabaseOperations(logs) {
        const dbOps = logs.filter(log => log.message.includes('SQL操作') ||
            log.message.includes('数据库连接') ||
            log.data?.operation);
        console.log('\n🗄️ 数据库操作分析:');
        console.log('='.repeat(40));
        const opStats = dbOps.reduce((acc, log) => {
            if (log.data?.operation) {
                acc[log.data.operation] = (acc[log.data.operation] || 0) + 1;
            }
            return acc;
        }, {});
        Object.entries(opStats).forEach(([op, count]) => {
            console.log(`${op}: ${count} 次`);
        });
        // 显示最近的数据库错误
        const dbErrors = dbOps.filter(log => log.level === 'ERROR').slice(-5);
        if (dbErrors.length > 0) {
            console.log('\n🚨 最近的数据库错误:');
            dbErrors.forEach(error => {
                console.log(this.formatLog(error));
            });
        }
    }
}
// 命令行接口
async function main() {
    const viewer = new LogViewer();
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log(`
MySQL MCP Server 日志查看器

用法:
  node log-viewer.js list                     # 列出所有日志文件
  node log-viewer.js view <filename>          # 查看指定日志文件
  node log-viewer.js errors [filename]        # 查看错误日志
  node log-viewer.js search <keyword>         # 搜索日志内容
  node log-viewer.js stats [filename]         # 显示日志统计
  node log-viewer.js db-analysis [filename]   # 数据库操作分析
  node log-viewer.js tail [filename] [lines]  # 查看最新日志

示例:
  node log-viewer.js view combined-2024-01-15.log
  node log-viewer.js errors
  node log-viewer.js search "连接失败"
    `);
        return;
    }
    const command = args[0];
    switch (command) {
        case 'list': {
            const files = await viewer.getLogFiles();
            console.log('📁 可用的日志文件:');
            files.forEach(file => console.log(`  ${file}`));
            break;
        }
        case 'view': {
            const filename = args[1];
            if (!filename) {
                console.error('请指定日志文件名');
                return;
            }
            const logs = await viewer.readLogFile(filename);
            logs.forEach(log => console.log(viewer.formatLog(log)));
            break;
        }
        case 'errors': {
            const filename = args[1] || 'combined-' + new Date().toISOString().split('T')[0] + '.log';
            const logs = await viewer.readLogFile(filename);
            const errors = viewer.filterByLevel(logs, 'ERROR');
            console.log(`🚨 错误日志 (${errors.length} 条):`);
            errors.forEach(log => console.log(viewer.formatLog(log)));
            break;
        }
        case 'search': {
            const keyword = args[1];
            if (!keyword) {
                console.error('请指定搜索关键词');
                return;
            }
            const files = await viewer.getLogFiles();
            const allLogs = [];
            for (const file of files) {
                const logs = await viewer.readLogFile(file);
                allLogs.push(...logs);
            }
            const results = viewer.searchLogs(allLogs, keyword);
            console.log(`🔍 搜索结果 "${keyword}" (${results.length} 条):`);
            results.forEach(log => console.log(viewer.formatLog(log)));
            break;
        }
        case 'stats': {
            const filename = args[1] || 'combined-' + new Date().toISOString().split('T')[0] + '.log';
            const logs = await viewer.readLogFile(filename);
            viewer.showStats(logs);
            break;
        }
        case 'db-analysis': {
            const filename = args[1] || 'database-' + new Date().toISOString().split('T')[0] + '.log';
            const logs = await viewer.readLogFile(filename);
            viewer.analyzeDatabaseOperations(logs);
            break;
        }
        case 'tail': {
            const filename = args[1] || 'combined-' + new Date().toISOString().split('T')[0] + '.log';
            const lines = parseInt(args[2]) || 20;
            const logs = await viewer.readLogFile(filename);
            const recent = logs.slice(-lines);
            console.log(`📋 最新 ${lines} 条日志:`);
            recent.forEach(log => console.log(viewer.formatLog(log)));
            break;
        }
        default:
            console.error(`未知命令: ${command}`);
    }
}
main().catch(console.error);
