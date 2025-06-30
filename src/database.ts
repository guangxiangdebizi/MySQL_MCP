import mysql, { Connection, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { dbLogger, logSqlOperation, logConnection } from "./logger.js";
import { TransactionManager } from "./transaction-manager.js";

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export class DatabaseManager {
  private connection: Connection | null = null;
  private config: DatabaseConfig | null = null;
  private transactionManager: TransactionManager = new TransactionManager();

  /**
   * 连接到MySQL数据库
   */
  async connect(config: DatabaseConfig): Promise<void> {
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
    } catch (error) {
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
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.connection !== null;
  }

  /**
   * 执行SQL查询（支持所有SQL操作，自动事务管理）
   */
  async executeQuery(query: string, params: any[] = []): Promise<any> {
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
      let originalData: any[] = [];
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
            let whereParams: any[] = [];
            if (queryType === 'UPDATE') {
              // UPDATE的参数格式是：[set_values..., where_params...]
              const setCount = (cleanQuery.match(/SET\s+[^=]+=/gi) || []).length;
              whereParams = params.slice(setCount);
            } else {
              // DELETE的参数就是WHERE条件的参数
              whereParams = params;
            }
            
            const [originalResult] = await this.connection.execute(originalDataQuery, whereParams);
            originalData = originalResult as any[];
          }
        } catch (error) {
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
      } else {
        const header = result as ResultSetHeader;
        
        // 对于有影响行数的操作，记录到事务历史
        if (['INSERT', 'UPDATE', 'DELETE'].includes(queryType) && (header.affectedRows || 0) > 0) {
          if (!tableName) {
            tableName = this.extractTableName(cleanQuery);
          }
          
          let rollbackQuery: string | undefined;
          let rollbackParams: any[] | undefined;

          // 生成回滚查询
          if (queryType === 'INSERT' && header.insertId) {
            // INSERT的回滚是DELETE
            rollbackQuery = `DELETE FROM \`${tableName}\` WHERE id = ?`;
            rollbackParams = [header.insertId];
          } else if (queryType === 'UPDATE' && originalData.length > 0) {
            // UPDATE的回滚：恢复原始数据
            rollbackQuery = this.generateUpdateRollbackQuery(tableName, originalData[0], whereClause);
            const setCount = (cleanQuery.match(/SET\s+[^=]+=/gi) || []).length;
            const whereParams = params.slice(setCount);
            rollbackParams = [...Object.values(originalData[0]), ...whereParams];
          } else if (queryType === 'DELETE' && originalData.length > 0) {
            // DELETE的回滚：重新插入删除的数据
            rollbackQuery = this.generateInsertRollbackQuery(tableName, originalData);
            rollbackParams = originalData.flatMap((row: any) => Object.values(row));
          }

          this.transactionManager.recordOperation({
            type: queryType as 'INSERT' | 'UPDATE' | 'DELETE',
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
    } catch (error) {
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
  async showTables(): Promise<RowDataPacket[]> {
    if (!this.connection) {
      throw new Error("数据库未连接");
    }

    try {
      const [rows] = await this.connection.execute("SHOW TABLES");
      return rows as RowDataPacket[];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`获取表列表失败: ${errorMessage}`);
    }
  }

  /**
   * 描述表结构
   */
  async describeTable(tableName: string): Promise<RowDataPacket[]> {
    if (!this.connection) {
      throw new Error("数据库未连接");
    }

    try {
      // 验证表名（防止SQL注入）
      if (!this.isValidTableName(tableName)) {
        throw new Error("无效的表名");
      }

      const [rows] = await this.connection.execute(`DESCRIBE \`${tableName}\``);
      return rows as RowDataPacket[];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`获取表结构失败: ${errorMessage}`);
    }
  }

  /**
   * 安全执行查询（支持参数化查询）
   */
  async executeQuerySafe(query: string, params: any[] = []): Promise<any> {
    if (!this.connection) {
      throw new Error("数据库未连接");
    }

    try {
      const [rows] = await this.connection.execute(query, params);
      return rows;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`查询执行失败: ${errorMessage}`);
    }
  }

  /**
   * 获取数据库信息
   */
  async getDatabaseInfo(): Promise<any> {
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
        version: (version as any)[0]?.version,
        charset: (charset as any)[0]?.charset,
        collation: (collation as any)[0]?.collation,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`获取数据库信息失败: ${errorMessage}`);
    }
  }

  /**
   * 断开数据库连接
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.end();
        logConnection('disconnect', this.config);
        dbLogger.info("数据库连接已断开");
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logConnection('disconnect', this.config, err);
        dbLogger.error("断开数据库连接时发生错误", { error: err.message });
      } finally {
        this.connection = null;
        this.config = null;
      }
    }
  }

  /**
   * 判断是否为SELECT查询
   */
  private isDangerousQuery(query: string): boolean {
    const dangerousKeywords = [
      'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 
      'TRUNCATE', 'CREATE', 'REPLACE', 'LOAD', 'IMPORT'
    ];
    
    const upperQuery = query.toUpperCase().trim();
    return dangerousKeywords.some(keyword => 
      upperQuery.startsWith(keyword + ' ') || 
      upperQuery.includes(' ' + keyword + ' ')
    );
  }

  /**
   * 验证表名是否合法
   */
  private isValidTableName(tableName: string): boolean {
    // 只允许字母、数字、下划线，且不能以数字开头
    const tableNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return tableNameRegex.test(tableName) && tableName.length <= 64;
  }

  /**
   * 从SQL查询中提取表名
   */
  private extractTableName(query: string): string {
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
  async beginTransaction(): Promise<void> {
    if (!this.connection) {
      throw new Error("数据库未连接");
    }

    await this.connection.beginTransaction();
    dbLogger.info("事务已开始");
  }

  /**
   * 提交事务
   */
  async commitTransaction(): Promise<void> {
    if (!this.connection) {
      throw new Error("数据库未连接");
    }

    await this.connection.commit();
    dbLogger.info("事务已提交");
  }

  /**
   * 回滚事务
   */
  async rollbackTransaction(): Promise<void> {
    if (!this.connection) {
      throw new Error("数据库未连接");
    }

    await this.connection.rollback();
    dbLogger.info("事务已回滚");
  }

  /**
   * 确保事务已开始
   */
  private async ensureTransaction(): Promise<void> {
    if (!this.transactionManager.isActive()) {
      await this.beginTransaction();
      await this.transactionManager.startTransaction();
    }
  }

  /**
   * 生成UPDATE操作的回滚查询
   */
  private generateUpdateRollbackQuery(tableName: string, originalData: any, whereClause: string): string {
    const columns = Object.keys(originalData);
    const setClause = columns.map(col => `\`${col}\` = ?`).join(', ');
    return `UPDATE \`${tableName}\` SET ${setClause} WHERE ${whereClause}`;
  }

  /**
   * 生成INSERT操作的回滚查询（用于DELETE的回滚）
   */
  private generateInsertRollbackQuery(tableName: string, originalData: any[]): string {
    if (originalData.length === 0) return '';
    
    const columns = Object.keys(originalData[0]);
    const placeholders = columns.map(() => '?').join(', ');
    
    if (originalData.length === 1) {
      return `INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) VALUES (${placeholders})`;
    } else {
      const valuePlaceholders = originalData.map(() => `(${placeholders})`).join(', ');
      return `INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) VALUES ${valuePlaceholders}`;
    }
  }

  /**
   * 获取事务管理器
   */
  getTransactionManager(): TransactionManager {
    return this.transactionManager;
  }
} 