import mysql from "mysql2/promise";
export class DatabaseConnectionManager {
    connections = new Map();
    configs = new Map();
    activeConnectionId = null;
    /**
     * 添加并连接数据库
     */
    async addConnection(config) {
        // 如果已存在，先断开
        if (this.connections.has(config.id)) {
            await this.removeConnection(config.id);
        }
        // 创建连接
        const connection = await mysql.createConnection({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database,
            charset: 'utf8mb4',
            timezone: '+08:00',
        });
        // 测试连接
        await connection.ping();
        // 保存连接和配置
        this.connections.set(config.id, connection);
        this.configs.set(config.id, {
            ...config,
            isActive: false,
            connectedAt: new Date()
        });
        // 如果是第一个连接，自动设为活跃
        if (this.activeConnectionId === null) {
            this.activeConnectionId = config.id;
        }
        console.log(`✅ 连接已添加: ${config.id} (${config.host}:${config.port}/${config.database})`);
    }
    /**
     * 移除连接
     */
    async removeConnection(id) {
        const connection = this.connections.get(id);
        if (!connection) {
            throw new Error(`连接 '${id}' 不存在`);
        }
        await connection.end();
        this.connections.delete(id);
        this.configs.delete(id);
        // 如果移除的是活跃连接，切换到第一个可用连接
        if (this.activeConnectionId === id) {
            const remaining = Array.from(this.connections.keys());
            this.activeConnectionId = remaining.length > 0 ? remaining[0] : null;
        }
        console.log(`🗑️  连接已移除: ${id}`);
    }
    /**
     * 选择活跃数据库
     */
    selectDatabase(id) {
        if (!this.connections.has(id)) {
            throw new Error(`连接 '${id}' 不存在`);
        }
        this.activeConnectionId = id;
        console.log(`🎯 已选择数据库: ${id}`);
    }
    /**
     * 获取活跃连接
     */
    getActiveConnection() {
        if (!this.activeConnectionId || !this.connections.has(this.activeConnectionId)) {
            throw new Error("没有活跃的数据库连接");
        }
        return this.connections.get(this.activeConnectionId);
    }
    /**
     * 获取活跃连接ID
     */
    getActiveConnectionId() {
        return this.activeConnectionId;
    }
    /**
     * 获取指定连接
     */
    getConnection(id) {
        return this.connections.get(id);
    }
    /**
     * 列出所有连接
     */
    listConnections() {
        return Array.from(this.configs.values()).map(config => ({
            ...config,
            isActive: config.id === this.activeConnectionId
        }));
    }
    /**
     * 执行查询
     */
    async executeQuery(sql, connectionId) {
        const connection = connectionId
            ? this.getConnection(connectionId)
            : this.getActiveConnection();
        if (!connection) {
            throw new Error(connectionId ? `连接 '${connectionId}' 不存在` : "没有活跃连接");
        }
        const [results] = await connection.query(sql);
        return results;
    }
    /**
     * 断开所有连接
     */
    async disconnectAll() {
        for (const [id, connection] of this.connections.entries()) {
            try {
                await connection.end();
                console.log(`断开连接: ${id}`);
            }
            catch (error) {
                console.error(`断开 ${id} 失败:`, error);
            }
        }
        this.connections.clear();
        this.configs.clear();
        this.activeConnectionId = null;
    }
}
