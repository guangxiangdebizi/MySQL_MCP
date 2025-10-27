import mysql from "mysql2/promise";
import { dbLogger, logSqlOperation, logConnection } from "./logger.js";
import { TransactionManager } from "./transaction-manager.js";
export class DatabaseManager {
    connection = null;
    config = null;
    transactionManager = new TransactionManager();
    /**
     * 连接到MySQL数据库
     */
    async connect(config) {
        const startTime = Date.now();
        try {
            this.config = config;
            this.connection = await mysql.createConnection({
                host: config.host,
                port: config.port,
                user: config.user,
                password: config.password,
                database: config.database,
                charset: 'utf8mb4',
                timezone: '+08:00',
                multipleStatements: true, // 允许执行多条语句
                // 连接超时设置（60秒）
                connectTimeout: 60000,
                // 启用保活机制（防止空闲超时断开）
                enableKeepAlive: true,
                keepAliveInitialDelay: 10000, // 10秒后开始保活
                // 设置等待超时（与服务器保持一致，默认8小时）
                waitForConnections: true,
                // 空闲超时（4小时后自动关闭，避免被服务器强制断开）
                idleTimeout: 14400000, // 4 hours
                // 最大空闲时间（与 idleTimeout 配合）
                maxIdle: 10,
            });
            // 测试连接
            await this.connection.ping();
            const duration = Date.now() - startTime;
            logConnection('connect', config);
            dbLogger.info(`数据库连接成功，耗时: ${duration}ms`, {
                host: config.host,
                port: config.port,
                database: config.database,
                user: config.user
            });
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const err = error instanceof Error ? error : new Error(String(error));
            logConnection('connect', config, err);
            dbLogger.error(`数据库连接失败，耗时: ${duration}ms`, {
                host: config.host,
                port: config.port,
                database: config.database,
                user: config.user,
                error: err.message
            });
            throw new Error(`数据库连接失败: ${err.message}`);
        }
    }
    /**
     * 检查是否已连接（通过 ping 测试真实连接状态）
     */
    async isConnected() {
        if (!this.connection) {
            return false;
        }
        try {
            await this.connection.ping();
            return true;
        }
        catch (error) {
            dbLogger.warn('连接已断开（ping失败）', {
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }
    /**
     * 检查是否已连接（同步版本，仅检查对象是否存在）
     */
    isConnectedSync() {
        return this.connection !== null;
    }
    /**
     * 确保连接可用（如果断开则自动重连）
     */
    async ensureConnection() {
        if (!this.config) {
            throw new Error("数据库配置不存在，无法重连");
        }
        // 先快速检查对象是否存在
        if (!this.connection) {
            dbLogger.info('连接对象不存在，尝试重新连接...');
            await this.connect(this.config);
            return;
        }
        // 检查连接是否真的可用
        try {
            await this.connection.ping();
        }
        catch (error) {
            dbLogger.warn('连接已断开，尝试重新连接...', {
                error: error instanceof Error ? error.message : String(error)
            });
            // 关闭旧连接
            try {
                await this.connection.end();
            }
            catch (e) {
                // 忽略关闭错误
            }
            this.connection = null;
            await this.connect(this.config);
        }
    }
    /**
     * 执行SQL查询（支持所有SQL操作，自动事务管理）
     */
    async executeQuery(query, params = []) {
        // 确保连接可用（自动重连）
        await this.ensureConnection();
        if (!this.connection) {
            throw new Error("数据库未连接");
        }
        const startTime = Date.now();
        const cleanQuery = query.trim();
        const queryType = this.getQueryType(cleanQuery);
        try {
            // 对于INSERT、UPDATE、DELETE操作，自动开启事务
            if (['INSERT', 'UPDATE', 'DELETE'].includes(queryType)) {
                await this.ensureTransaction();
            }
            // 对于UPDATE和DELETE操作，先查询原始数据用于生成回滚查询
            let originalData = [];
            let tableName = '';
            let whereClause = '';
            if (['UPDATE', 'DELETE'].includes(queryType)) {
                try {
                    tableName = this.extractTableName(cleanQuery);
                    const whereMatch = cleanQuery.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
                    if (whereMatch) {
                        whereClause = whereMatch[1];
                        const originalDataQuery = `SELECT * FROM \`${tableName}\` WHERE ${whereClause}`;
                        // 提取WHERE条件的参数
                        let whereParams = [];
                        if (queryType === 'UPDATE') {
                            // UPDATE的参数格式是：[set_values..., where_params...]
                            const setCount = (cleanQuery.match(/SET\s+[^=]+=/gi) || []).length;
                            whereParams = params.slice(setCount);
                        }
                        else {
                            // DELETE的参数就是WHERE条件的参数
                            whereParams = params;
                        }
                        const [originalResult] = await this.connection.execute(originalDataQuery, whereParams);
                        originalData = originalResult;
                    }
                }
                catch (error) {
                    dbLogger.warn(`无法查询${queryType}操作的原始数据`, {
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }
            // 记录开始执行
            dbLogger.debug(`开始执行SQL`, { query: cleanQuery, params });
            const [result] = params.length > 0
                ? await this.connection.execute(cleanQuery, params)
                : await this.connection.execute(cleanQuery);
            const duration = Date.now() - startTime;
            // 记录成功执行
            logSqlOperation('EXECUTE', cleanQuery, params, duration);
            // 根据操作类型返回不同格式的结果
            if (this.isSelectQuery(cleanQuery)) {
                return {
                    type: 'SELECT',
                    data: result,
                    rowCount: Array.isArray(result) ? result.length : 0,
                    duration
                };
            }
            else {
                const header = result;
                // 对于有影响行数的操作，记录到事务历史
                if (['INSERT', 'UPDATE', 'DELETE'].includes(queryType) && (header.affectedRows || 0) > 0) {
                    if (!tableName) {
                        tableName = this.extractTableName(cleanQuery);
                    }
                    let rollbackQuery;
                    let rollbackParams;
                    // 生成回滚查询
                    if (queryType === 'INSERT' && header.insertId) {
                        // INSERT的回滚是DELETE
                        rollbackQuery = `DELETE FROM \`${tableName}\` WHERE id = ?`;
                        rollbackParams = [header.insertId];
                    }
                    else if (queryType === 'UPDATE' && originalData.length > 0) {
                        // UPDATE的回滚：恢复原始数据
                        rollbackQuery = this.generateUpdateRollbackQuery(tableName, originalData[0], whereClause);
                        const setCount = (cleanQuery.match(/SET\s+[^=]+=/gi) || []).length;
                        const whereParams = params.slice(setCount);
                        rollbackParams = [...Object.values(originalData[0]), ...whereParams];
                    }
                    else if (queryType === 'DELETE' && originalData.length > 0) {
                        // DELETE的回滚：重新插入删除的数据
                        rollbackQuery = this.generateInsertRollbackQuery(tableName, originalData);
                        rollbackParams = originalData.flatMap((row) => Object.values(row));
                    }
                    this.transactionManager.recordOperation({
                        type: queryType,
                        tableName,
                        description: `执行 ${queryType} 操作，影响 ${header.affectedRows} 行`,
                        query: cleanQuery,
                        params,
                        affectedRows: header.affectedRows || 0,
                        rollbackQuery,
                        rollbackParams
                    });
                }
                return {
                    type: queryType,
                    affectedRows: header.affectedRows || 0,
                    insertId: header.insertId || null,
                    changedRows: header.changedRows || 0,
                    duration
                };
            }
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const err = error instanceof Error ? error : new Error(String(error));
            // 记录执行失败
            logSqlOperation('EXECUTE', cleanQuery, params, duration, err);
            throw new Error(`查询执行失败: ${err.message}`);
        }
    }
    /**
     * 显示所有表
     */
    async showTables() {
        // 确保连接可用
        await this.ensureConnection();
        if (!this.connection) {
            throw new Error("数据库未连接");
        }
        try {
            const [rows] = await this.connection.execute("SHOW TABLES");
            return rows;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`获取表列表失败: ${errorMessage}`);
        }
    }
    /**
     * 描述表结构
     */
    async describeTable(tableName) {
        // 确保连接可用
        await this.ensureConnection();
        if (!this.connection) {
            throw new Error("数据库未连接");
        }
        try {
            // 验证表名（防止SQL注入）
            if (!this.isValidTableName(tableName)) {
                throw new Error("无效的表名");
            }
            const [rows] = await this.connection.execute(`DESCRIBE \`${tableName}\``);
            return rows;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`获取表结构失败: ${errorMessage}`);
        }
    }
    /**
     * 安全执行查询（支持参数化查询）
     */
    async executeQuerySafe(query, params = []) {
        if (!this.connection) {
            throw new Error("数据库未连接");
        }
        try {
            const [rows] = await this.connection.execute(query, params);
            return rows;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`查询执行失败: ${errorMessage}`);
        }
    }
    /**
     * 获取数据库信息
     */
    async getDatabaseInfo() {
        if (!this.connection || !this.config) {
            throw new Error("数据库未连接");
        }
        try {
            const [version] = await this.connection.execute("SELECT VERSION() as version");
            const [charset] = await this.connection.execute("SELECT @@character_set_database as charset");
            const [collation] = await this.connection.execute("SELECT @@collation_database as collation");
            return {
                host: this.config.host,
                port: this.config.port,
                database: this.config.database,
                user: this.config.user,
                version: version[0]?.version,
                charset: charset[0]?.charset,
                collation: collation[0]?.collation,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`获取数据库信息失败: ${errorMessage}`);
        }
    }
    /**
     * 断开数据库连接
     */
    async disconnect() {
        if (this.connection) {
            try {
                await this.connection.end();
                logConnection('disconnect', this.config);
                dbLogger.info("数据库连接已断开");
            }
            catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                logConnection('disconnect', this.config, err);
                dbLogger.error("断开数据库连接时发生错误", { error: err.message });
            }
            finally {
                this.connection = null;
                this.config = null;
            }
        }
    }
    /**
     * 判断是否为SELECT查询
     */
    isSelectQuery(query) {
        const upperQuery = query.toUpperCase().trim();
        return upperQuery.startsWith('SELECT') || upperQuery.startsWith('SHOW') || upperQuery.startsWith('DESCRIBE') || upperQuery.startsWith('DESC');
    }
    /**
     * 获取查询类型
     */
    getQueryType(query) {
        const upperQuery = query.toUpperCase().trim();
        const firstWord = upperQuery.split(' ')[0];
        return firstWord || 'UNKNOWN';
    }
    /**
     * 判断是否为危险查询
     */
    isDangerousQuery(query) {
        const dangerousKeywords = [
            'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER',
            'TRUNCATE', 'CREATE', 'REPLACE', 'LOAD', 'IMPORT'
        ];
        const upperQuery = query.toUpperCase().trim();
        return dangerousKeywords.some(keyword => upperQuery.startsWith(keyword + ' ') ||
            upperQuery.includes(' ' + keyword + ' '));
    }
    /**
     * 验证表名是否合法
     */
    isValidTableName(tableName) {
        // 只允许字母、数字、下划线，且不能以数字开头
        const tableNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
        return tableNameRegex.test(tableName) && tableName.length <= 64;
    }
    /**
     * 从SQL查询中提取表名
     */
    extractTableName(query) {
        const cleanQuery = query.trim().toUpperCase();
        // INSERT INTO table_name
        if (cleanQuery.startsWith('INSERT')) {
            const match = cleanQuery.match(/INSERT\s+INTO\s+`?(\w+)`?/);
            return match ? match[1] : 'unknown';
        }
        // UPDATE table_name
        if (cleanQuery.startsWith('UPDATE')) {
            const match = cleanQuery.match(/UPDATE\s+`?(\w+)`?/);
            return match ? match[1] : 'unknown';
        }
        // DELETE FROM table_name
        if (cleanQuery.startsWith('DELETE')) {
            const match = cleanQuery.match(/DELETE\s+FROM\s+`?(\w+)`?/);
            return match ? match[1] : 'unknown';
        }
        return 'unknown';
    }
    /**
     * 开始事务
     */
    async beginTransaction() {
        if (!this.connection) {
            throw new Error("数据库未连接");
        }
        await this.connection.beginTransaction();
        dbLogger.info("事务已开始");
    }
    /**
     * 提交事务
     */
    async commitTransaction() {
        if (!this.connection) {
            throw new Error("数据库未连接");
        }
        await this.connection.commit();
        dbLogger.info("事务已提交");
    }
    /**
     * 回滚事务
     */
    async rollbackTransaction() {
        if (!this.connection) {
            throw new Error("数据库未连接");
        }
        await this.connection.rollback();
        dbLogger.info("事务已回滚");
    }
    /**
     * 确保事务已开始
     */
    async ensureTransaction() {
        if (!this.transactionManager.isActive()) {
            await this.beginTransaction();
            await this.transactionManager.startTransaction();
        }
    }
    /**
     * 生成UPDATE操作的回滚查询
     */
    generateUpdateRollbackQuery(tableName, originalData, whereClause) {
        const columns = Object.keys(originalData);
        const setClause = columns.map(col => `\`${col}\` = ?`).join(', ');
        return `UPDATE \`${tableName}\` SET ${setClause} WHERE ${whereClause}`;
    }
    /**
     * 生成INSERT操作的回滚查询（用于DELETE的回滚）
     */
    generateInsertRollbackQuery(tableName, originalData) {
        if (originalData.length === 0)
            return '';
        const columns = Object.keys(originalData[0]);
        const placeholders = columns.map(() => '?').join(', ');
        if (originalData.length === 1) {
            return `INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) VALUES (${placeholders})`;
        }
        else {
            const valuePlaceholders = originalData.map(() => `(${placeholders})`).join(', ');
            return `INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) VALUES ${valuePlaceholders}`;
        }
    }
    /**
     * 获取事务管理器
     */
    getTransactionManager() {
        return this.transactionManager;
    }
}
