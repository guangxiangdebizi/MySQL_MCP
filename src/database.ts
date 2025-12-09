import mysql, { Pool } from "mysql2/promise";

export interface DatabaseConfig {
  id: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface ConnectionInfo {
  id: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  isActive: boolean;
  connectedAt: Date;
}

export class DatabaseConnectionManager {
  private connections = new Map<string, Pool>();
  private configs = new Map<string, ConnectionInfo>();
  private activeConnectionId: string | null = null;

  /**
   * 添加并连接数据库
   */
  async addConnection(config: DatabaseConfig): Promise<void> {
    // 如果已存在，先断开
    if (this.connections.has(config.id)) {
      await this.removeConnection(config.id);
    }

    // 创建连接池
    const pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      charset: 'utf8mb4',
      timezone: '+08:00',
      // 连接池配置
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      // 连接保活配置
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      // 超时配置
      connectTimeout: 10000,
      // 自动重连
      maxIdle: 10,
      idleTimeout: 60000,
    });

    // 测试连接
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    // 保存连接池和配置
    this.connections.set(config.id, pool);
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
  async removeConnection(id: string): Promise<void> {
    const pool = this.connections.get(id);
    if (!pool) {
      throw new Error(`连接 '${id}' 不存在`);
    }

    await pool.end();
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
  selectDatabase(id: string): void {
    if (!this.connections.has(id)) {
      throw new Error(`连接 '${id}' 不存在`);
    }
    this.activeConnectionId = id;
    console.log(`🎯 已选择数据库: ${id}`);
  }

  /**
   * 获取活跃连接池
   */
  getActiveConnection(): Pool {
    if (!this.activeConnectionId || !this.connections.has(this.activeConnectionId)) {
      throw new Error("没有活跃的数据库连接");
    }
    return this.connections.get(this.activeConnectionId)!;
  }

  /**
   * 获取活跃连接ID
   */
  getActiveConnectionId(): string | null {
    return this.activeConnectionId;
  }

  /**
   * 获取指定连接池
   */
  getConnection(id: string): Pool | undefined {
    return this.connections.get(id);
  }

  /**
   * 列出所有连接
   */
  listConnections(): ConnectionInfo[] {
    return Array.from(this.configs.values()).map(config => ({
      ...config,
      isActive: config.id === this.activeConnectionId
    }));
  }

  /**
   * 执行查询
   */
  async executeQuery(sql: string, connectionId?: string): Promise<any> {
    const pool = connectionId 
      ? this.getConnection(connectionId)
      : this.getActiveConnection();

    if (!pool) {
      throw new Error(connectionId ? `连接 '${connectionId}' 不存在` : "没有活跃连接");
    }

    const [results] = await pool.query(sql);
    return results;
  }

  /**
   * 断开所有连接池
   */
  async disconnectAll(): Promise<void> {
    for (const [id, pool] of this.connections.entries()) {
      try {
        await pool.end();
        console.log(`断开连接池: ${id}`);
      } catch (error) {
        console.error(`断开 ${id} 失败:`, error);
      }
    }
    this.connections.clear();
    this.configs.clear();
    this.activeConnectionId = null;
  }
}

