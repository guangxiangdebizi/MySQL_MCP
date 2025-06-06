import mysql from "mysql2/promise";
export class DatabaseManager {
    connection = null;
    config = null;
    /**
     * 连接到MySQL数据库
     */
    async connect(config) {
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
            });
            // 测试连接
            await this.connection.ping();
            console.error(`已成功连接到MySQL数据库: ${config.host}:${config.port}/${config.database}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`数据库连接失败: ${errorMessage}`);
        }
    }
    /**
     * 检查是否已连接
     */
    isConnected() {
        return this.connection !== null;
    }
    /**
     * 执行SQL查询
     */
    async executeQuery(query) {
        if (!this.connection) {
            throw new Error("数据库未连接");
        }
        try {
            // 清理查询语句
            const cleanQuery = query.trim();
            // 检查是否为危险操作
            if (this.isDangerousQuery(cleanQuery)) {
                throw new Error("为了安全起见，不允许执行可能修改数据的操作（DROP, DELETE, UPDATE, INSERT, ALTER, TRUNCATE）");
            }
            const [rows] = await this.connection.execute(cleanQuery);
            return rows;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`查询执行失败: ${errorMessage}`);
        }
    }
    /**
     * 显示所有表
     */
    async showTables() {
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
                console.error("数据库连接已断开");
            }
            catch (error) {
                console.error("断开数据库连接时发生错误:", error);
            }
            finally {
                this.connection = null;
                this.config = null;
            }
        }
    }
    /**
     * 检查是否为危险的查询操作
     */
    isDangerousQuery(query) {
        const dangerousPattern = /\b(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE|CREATE|REPLACE|LOAD|IMPORT)\b/i;
        return dangerousPattern.test(query.trim());
    }
    /**
     * 验证表名是否合法
     */
    isValidTableName(tableName) {
        // 只允许字母、数字、下划线，且不能以数字开头
        const tableNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
        return tableNameRegex.test(tableName) && tableName.length <= 64;
    }
}
