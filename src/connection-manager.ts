import { DatabaseManager, DatabaseConfig } from "./database.js";
import { logger } from "./logger.js";

export interface ConnectionInfo {
  id: string;
  config: DatabaseConfig;
  manager: DatabaseManager;
  isActive: boolean;
  connectedAt: Date;
}

export class ConnectionManager {
  private connections: Map<string, ConnectionInfo> = new Map();
  private activeConnectionId: string | null = null;

  /**
   * 添加新的数据库连接
   */
  async addConnection(connectionId: string, config: DatabaseConfig): Promise<void> {
    try {
      // 如果连接已存在，先断开
      if (this.connections.has(connectionId)) {
        await this.removeConnection(connectionId);
      }

      // 创建新的数据库管理器并连接
      const manager = new DatabaseManager();
      await manager.connect(config);

      // 存储连接信息
      const connectionInfo: ConnectionInfo = {
        id: connectionId,
        config,
        manager,
        isActive: false,
        connectedAt: new Date()
      };

      this.connections.set(connectionId, connectionInfo);

      // 如果是第一个连接，自动设为活跃连接
      if (this.activeConnectionId === null) {
        await this.switchActiveConnection(connectionId);
      }

      logger.info(`数据库连接已添加`, { 
        connectionId, 
        host: config.host, 
        database: config.database,
        totalConnections: this.connections.size 
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`添加数据库连接失败`, { connectionId, error: err.message });
      throw new Error(`添加数据库连接失败: ${err.message}`);
    }
  }

  /**
   * 移除数据库连接
   */
  async removeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`连接 '${connectionId}' 不存在`);
    }

    try {
      // 断开数据库连接
      await connection.manager.disconnect();
      
      // 从连接列表中移除
      this.connections.delete(connectionId);

      // 如果移除的是活跃连接，选择新的活跃连接
      if (this.activeConnectionId === connectionId) {
        this.activeConnectionId = null;
        
        // 如果还有其他连接，选择第一个作为活跃连接
        const remainingConnections = Array.from(this.connections.keys());
        if (remainingConnections.length > 0) {
          await this.switchActiveConnection(remainingConnections[0]);
        }
      }

      logger.info(`数据库连接已移除`, { 
        connectionId, 
        remainingConnections: this.connections.size 
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`移除数据库连接失败`, { connectionId, error: err.message });
      throw new Error(`移除数据库连接失败: ${err.message}`);
    }
  }

  /**
   * 切换活跃连接
   */
  async switchActiveConnection(connectionId: string): Promise<void> {
    if (!this.connections.has(connectionId)) {
      throw new Error(`连接 '${connectionId}' 不存在`);
    }

    // 更新活跃状态
    this.connections.forEach((conn, id) => {
      conn.isActive = (id === connectionId);
    });

    this.activeConnectionId = connectionId;

    logger.info(`已切换活跃连接`, { 
      connectionId, 
      database: this.connections.get(connectionId)?.config.database 
    });
  }

  /**
   * 获取活跃连接的数据库管理器
   */
  getActiveConnection(): DatabaseManager | null {
    if (!this.activeConnectionId) {
      return null;
    }
    
    const connection = this.connections.get(this.activeConnectionId);
    return connection ? connection.manager : null;
  }

  /**
   * 获取指定连接的数据库管理器
   */
  getConnection(connectionId: string): DatabaseManager | null {
    const connection = this.connections.get(connectionId);
    return connection ? connection.manager : null;
  }

  /**
   * 获取活跃连接ID
   */
  getActiveConnectionId(): string | null {
    return this.activeConnectionId;
  }

  /**
   * 列出所有连接信息
   */
  listConnections(): Array<{
    id: string;
    host: string;
    database: string;
    user: string;
    port: number;
    isActive: boolean;
    connectedAt: string;
  }> {
    return Array.from(this.connections.values()).map(conn => ({
      id: conn.id,
      host: conn.config.host,
      database: conn.config.database,
      user: conn.config.user,
      port: conn.config.port,
      isActive: conn.isActive,
      connectedAt: conn.connectedAt.toISOString()
    }));
  }

  /**
   * 检查是否有活跃连接
   */
  hasActiveConnection(): boolean {
    return this.activeConnectionId !== null && this.connections.has(this.activeConnectionId);
  }

  /**
   * 获取连接总数
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * 断开所有连接
   */
  async disconnectAll(): Promise<void> {
    const connectionIds = Array.from(this.connections.keys());
    
    for (const connectionId of connectionIds) {
      try {
        await this.removeConnection(connectionId);
      } catch (error) {
        logger.error(`断开连接失败`, { connectionId, error: error instanceof Error ? error.message : String(error) });
      }
    }

    this.activeConnectionId = null;
    logger.info(`所有数据库连接已断开`);
  }
} 