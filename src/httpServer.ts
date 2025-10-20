#!/usr/bin/env node

import express, { Request, Response } from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema, 
  CallToolResult,
  Tool,
  McpError,
  ErrorCode
} from "@modelcontextprotocol/sdk/types.js";
import { ConnectionManager } from "./connection-manager.js";
import { DatabaseManager } from "./database.js";
import { logger } from "./logger.js";

// 会话存储
interface Session { 
  id: string; 
  server: Server;
  connectionManager: ConnectionManager;
  headerConnectionId: string | null; // 存储从 header 创建的连接ID
  createdAt: Date; 
  lastActivity: Date;
}
const sessions = new Map<string, Session>();

// 从 headers 中提取数据库配置
function extractDatabaseConfigFromHeaders(req: Request): {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
} | null {
  const host = req.headers['x-mysql-host'] as string | undefined;
  const port = req.headers['x-mysql-port'] as string | undefined;
  const user = req.headers['x-mysql-user'] as string | undefined;
  const password = req.headers['x-mysql-password'] as string | undefined;
  const database = req.headers['x-mysql-database'] as string | undefined;

  // 如果没有任何数据库配置,返回 null
  if (!host && !user && !database) {
    return null;
  }

  return {
    host: host?.trim(),
    port: port ? parseInt(port) : undefined,
    user: user?.trim(),
    password: password?.trim(),
    database: database?.trim()
  };
}

// 创建 MCP Server (每个会话一个实例)
function createMCPServer(connectionManager: ConnectionManager): Server {
  const server = new Server(
    { 
      name: "mysql-mcp-server", 
      version: "3.1.0" 
    }, 
    { 
      capabilities: { 
        tools: {} 
      } 
    }
  );

  // 辅助函数：获取数据库管理器
  function getTargetManager(connection_id?: string): DatabaseManager {
    const targetManager = connection_id 
      ? connectionManager.getConnection(connection_id)
      : connectionManager.getActiveConnection();

    if (!targetManager || !targetManager.isConnected()) {
      const errorMsg = connection_id 
        ? `❌ 连接 '${connection_id}' 不存在或未连接`
        : "❌ 没有活跃的数据库连接，请先使用 connect_database 工具连接到数据库";
      
      throw new McpError(ErrorCode.InvalidRequest, errorMsg);
    }

    return targetManager;
  }

  // 列出可用工具
  const tools: Tool[] = [
    {
      name: "connect_database",
      description: "连接到MySQL数据库",
      inputSchema: {
        type: "object",
        properties: {
          host: {
            type: "string",
            description: "数据库主机地址（例如：localhost 或 127.0.0.1）",
          },
          port: {
            type: "number",
            description: "数据库端口号（默认：3306）",
            default: 3306,
          },
          user: {
            type: "string",
            description: "数据库用户名",
          },
          password: {
            type: "string",
            description: "数据库密码",
          },
          database: {
            type: "string",
            description: "要连接的数据库名称",
          },
          connection_id: {
            type: "string",
            description: "连接标识符（可选，用于管理多个数据库连接）",
          },
        },
        required: ["host", "user", "password", "database"],
      } as any,
    },
    {
      name: "execute_query",
      description: "执行SQL查询语句（支持增删改查所有操作）",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "要执行的SQL查询语句",
          },
          params: {
            type: "array",
            description: "SQL参数（可选，用于参数化查询）",
            items: {
              type: "string"
            }
          },
          connection_id: {
            type: "string",
            description: "连接标识符（可选，不指定则使用当前活跃连接）",
          },
        },
        required: ["query"],
      } as any,
    },
    {
      name: "begin_transaction",
      description: "开始数据库事务",
      inputSchema: {
        type: "object",
        properties: {
          connection_id: {
            type: "string",
            description: "连接标识符（可选，不指定则使用当前活跃连接）",
          },
        },
      } as any,
    },
    {
      name: "commit_transaction",
      description: "提交数据库事务",
      inputSchema: {
        type: "object",
        properties: {
          connection_id: {
            type: "string",
            description: "连接标识符（可选，不指定则使用当前活跃连接）",
          },
        },
      } as any,
    },
    {
      name: "rollback_transaction",
      description: "回滚数据库事务",
      inputSchema: {
        type: "object",
        properties: {
          connection_id: {
            type: "string",
            description: "连接标识符（可选，不指定则使用当前活跃连接）",
          },
        },
      } as any,
    },
    {
      name: "show_transaction_history",
      description: "显示当前事务的操作历史",
      inputSchema: {
        type: "object",
        properties: {
          connection_id: {
            type: "string",
            description: "连接标识符（可选，不指定则使用当前活跃连接）",
          },
        },
      } as any,
    },
    {
      name: "rollback_to_step",
      description: "回滚到指定的操作步骤",
      inputSchema: {
        type: "object",
        properties: {
          step_number: {
            type: "number",
            description: "要回滚到的步骤号（从操作历史中选择）",
          },
          connection_id: {
            type: "string",
            description: "连接标识符（可选，不指定则使用当前活跃连接）",
          },
        },
        required: ["step_number"],
      } as any,
    },
    {
      name: "full_rollback",
      description: "完全回滚当前事务的所有操作",
      inputSchema: {
        type: "object",
        properties: {
          connection_id: {
            type: "string",
            description: "连接标识符（可选，不指定则使用当前活跃连接）",
          },
        },
      } as any,
    },
    {
      name: "show_tables",
      description: "显示数据库中的所有表及其结构信息",
      inputSchema: {
        type: "object",
        properties: {
          connection_id: {
            type: "string",
            description: "连接标识符（可选，不指定则使用当前活跃连接）",
          },
        },
      } as any,
    },
    {
      name: "describe_table",
      description: "显示指定表的详细结构信息和样本数据",
      inputSchema: {
        type: "object",
        properties: {
          table_name: {
            type: "string",
            description: "要查看结构的表名",
          },
          connection_id: {
            type: "string",
            description: "连接标识符（可选，不指定则使用当前活跃连接）",
          },
        },
        required: ["table_name"],
      } as any,
    },
    {
      name: "disconnect_database",
      description: "断开数据库连接",
      inputSchema: {
        type: "object",
        properties: {
          connection_id: {
            type: "string",
            description: "要断开的连接标识符（可选，不指定则断开当前活跃连接）",
          },
        },
      } as any,
    },
    {
      name: "list_connections",
      description: "列出所有数据库连接",
      inputSchema: {
        type: "object",
        properties: {},
      } as any,
    },
    {
      name: "switch_active_connection",
      description: "切换当前活跃的数据库连接",
      inputSchema: {
        type: "object",
        properties: {
          connection_id: {
            type: "string",
            description: "要切换到的连接标识符",
          },
        },
        required: ["connection_id"],
      } as any,
    },
    {
      name: "remove_connection",
      description: "移除指定的数据库连接",
      inputSchema: {
        type: "object",
        properties: {
          connection_id: {
            type: "string",
            description: "要移除的连接标识符",
          },
        },
        required: ["connection_id"],
      } as any,
    },
  ];

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const { name, arguments: args } = request.params as any;

    // 记录工具调用
    logger.info(`工具调用开始 (HTTP)`, { tool: name, args });

    try {
      switch (name) {
        case "connect_database": {
          const { host, port = 3306, user, password, database, connection_id } = args as {
            host: string;
            port?: number;
            user: string;
            password: string;
            database: string;
            connection_id?: string;
          };

          // 生成连接ID（如果未提供）
          const connId = connection_id || `${host}_${database}_${Date.now()}`;

          // 添加新连接
          await connectionManager.addConnection(connId, { host, port, user, password, database });

          const totalConnections = connectionManager.getConnectionCount();
          const isActive = connectionManager.getActiveConnectionId() === connId;

          return {
            content: [
              {
                type: "text",
                text: `✅ 成功连接到MySQL数据库！\n📍 连接ID: ${connId}\n📍 主机: ${host}:${port}\n🗄️ 数据库: ${database}\n👤 用户: ${user}\n🎯 活跃连接: ${isActive ? '是' : '否'}\n📊 总连接数: ${totalConnections}`,
              },
            ],
          };
        }

        case "execute_query": {
          const { query, params = [], connection_id } = args as { 
            query: string; 
            params?: any[]; 
            connection_id?: string; 
          };

          // 获取目标数据库管理器
          const targetManager = connection_id 
            ? connectionManager.getConnection(connection_id)
            : connectionManager.getActiveConnection();

          if (!targetManager || !targetManager.isConnected()) {
            const errorMsg = connection_id 
              ? `❌ 连接 '${connection_id}' 不存在或未连接`
              : "❌ 没有活跃的数据库连接，请先使用 connect_database 工具连接到数据库";
            
            throw new McpError(ErrorCode.InvalidRequest, errorMsg);
          }

          const result = await targetManager.executeQuery(query, params);
          const activeConnId = connectionManager.getActiveConnectionId();
          const usedConnId = connection_id || activeConnId;

          return {
            content: [
              {
                type: "text",
                text: `✅ SQL执行成功！\n🔗 使用连接: ${usedConnId}\n📊 操作类型: ${result.type}\n⏱️ 执行时间: ${result.duration}ms\n\n📋 结果:\n${JSON.stringify(result, null, 2)}`,
              },
            ],
          };
        }

        case "begin_transaction": {
          const { connection_id } = args as { connection_id?: string };
          const targetManager = getTargetManager(connection_id);
          await targetManager.beginTransaction();

          return {
            content: [
              {
                type: "text",
                text: `✅ 事务已开始！\n🔗 连接: ${connection_id || connectionManager.getActiveConnectionId()}\n\n⚠️ 请记得在操作完成后提交或回滚事务`,
              },
            ],
          };
        }

        case "commit_transaction": {
          const { connection_id } = args as { connection_id?: string };
          const targetManager = getTargetManager(connection_id);
          const transactionManager = targetManager.getTransactionManager();
          const result = await transactionManager.commitTransaction(async () => {
            return await targetManager.commitTransaction();
          });

          return {
            content: [
              {
                type: "text",
                text: result,
              },
            ],
          };
        }

        case "rollback_transaction": {
          const { connection_id } = args as { connection_id?: string };
          const targetManager = getTargetManager(connection_id);
          const transactionManager = targetManager.getTransactionManager();
          const result = await transactionManager.fullRollback(async (query, params) => {
            return await targetManager.executeQuery(query, params || []);
          });

          return {
            content: [
              {
                type: "text",
                text: result,
              },
            ],
          };
        }

        case "show_transaction_history": {
          const { connection_id } = args as { connection_id?: string };
          const targetManager = getTargetManager(connection_id);
          const transactionManager = targetManager.getTransactionManager();
          const historyText = transactionManager.getRollbackOptions();

          return {
            content: [
              {
                type: "text",
                text: `📋 事务操作历史\n🔗 连接: ${connection_id || connectionManager.getActiveConnectionId()}\n\n${historyText}`,
              },
            ],
          };
        }

        case "rollback_to_step": {
          const { step_number, connection_id } = args as { step_number: number; connection_id?: string };
          const targetManager = getTargetManager(connection_id);
          const transactionManager = targetManager.getTransactionManager();
          
          const result = await transactionManager.rollbackToStep(step_number, async (query, params) => {
            return await targetManager.executeQuery(query, params || []);
          });

          return {
            content: [
              {
                type: "text",
                text: result,
              },
            ],
          };
        }

        case "full_rollback": {
          const { connection_id } = args as { connection_id?: string };
          const targetManager = getTargetManager(connection_id);
          const transactionManager = targetManager.getTransactionManager();
          const result = await transactionManager.fullRollback(async (query, params) => {
            return await targetManager.executeQuery(query, params || []);
          });

          return {
            content: [
              {
                type: "text",
                text: result,
              },
            ],
          };
        }

        case "show_tables": {
          const { connection_id } = args as { connection_id?: string };
          const targetManager = getTargetManager(connection_id);
          const tables = await targetManager.showTables();
          let result = `📋 数据库概览\n🔗 连接: ${connection_id || connectionManager.getActiveConnectionId()}\n\n`;
          
          if (tables.length === 0) {
            result += "🔍 数据库中没有找到任何表";
          } else {
            result += `📊 总共找到 ${tables.length} 个表:\n\n`;
            
            for (const table of tables) {
              const tableName = Object.values(table)[0] as string;
              try {
                // 获取表的行数
                const countResult = await targetManager.executeQuery(`SELECT COUNT(*) as count FROM \`${tableName}\``);
                const rowCount = countResult.data[0]?.count || 0;
                
                // 获取表结构（只显示列名和类型）
                const structure = await targetManager.describeTable(tableName);
                const columnInfo = structure.map((col: any) => `${col.Field}(${col.Type})`).slice(0, 5).join(', ');
                const moreColumns = structure.length > 5 ? `... +${structure.length - 5}列` : '';
                
                result += `🗂️ **${tableName}**\n`;
                result += `   📊 行数: ${rowCount}\n`;
                result += `   🏗️ 列: ${columnInfo}${moreColumns}\n\n`;
              } catch (error) {
                result += `🗂️ **${tableName}**\n`;
                result += `   ⚠️ 无法获取详细信息\n\n`;
              }
            }
            
            result += `💡 提示: 使用 describe_table 工具查看具体表的详细结构和样本数据`;
          }

          return {
            content: [
              {
                type: "text",
                text: result,
              },
            ],
          };
        }

        case "describe_table": {
          const { table_name, connection_id } = args as { table_name: string; connection_id?: string };
          const targetManager = getTargetManager(connection_id);
          
          // 获取表结构
          const structure = await targetManager.describeTable(table_name);
          
          // 获取表的行数
          const countResult = await targetManager.executeQuery(`SELECT COUNT(*) as count FROM \`${table_name}\``);
          const totalRows = countResult.data[0]?.count || 0;
          
          // 获取样本数据（最多5行）
          let sampleData = [];
          if (totalRows > 0) {
            const sampleResult = await targetManager.executeQuery(`SELECT * FROM \`${table_name}\` LIMIT 5`);
            sampleData = sampleResult.data;
          }

          // 格式化表结构
          const structureText = structure
            .map((col: any) => 
              `${col.Field.padEnd(20)} | ${col.Type.padEnd(15)} | ${col.Null.padEnd(8)} | ${col.Key.padEnd(8)} | ${(col.Default || 'NULL').toString().padEnd(10)} | ${col.Extra || ''}`
            )
            .join("\n");

          let result = `🔍 表 "${table_name}" 的详细信息\n\n`;
          result += `📊 基本信息:\n`;
          result += `   总行数: ${totalRows}\n`;
          result += `   总列数: ${structure.length}\n\n`;
          
          result += `🏗️ 表结构:\n`;
          result += `${"=".repeat(80)}\n`;
          result += `字段名               | 类型            | 可为空   | 键      | 默认值     | 额外信息\n`;
          result += `${"=".repeat(80)}\n`;
          result += `${structureText}\n\n`;
          
          if (sampleData.length > 0) {
            result += `📄 样本数据 (前${sampleData.length}行):\n`;
            result += `${"=".repeat(80)}\n`;
            result += JSON.stringify(sampleData, null, 2);
          } else {
            result += `📄 样本数据:\n`;
            result += `   表中暂无数据`;
          }
          
          result += `\n\n💡 提示: 使用 execute_query 工具可以执行更复杂的查询操作`;

          return {
            content: [
              {
                type: "text",
                text: result,
              },
            ],
          };
        }

        case "disconnect_database": {
          const { connection_id } = args as { connection_id?: string };
          
          if (connection_id) {
            // 移除指定连接
            await connectionManager.removeConnection(connection_id);
          } else if (connectionManager.hasActiveConnection()) {
            // 移除活跃连接
            const activeId = connectionManager.getActiveConnectionId();
            if (activeId) {
              await connectionManager.removeConnection(activeId);
            }
          }

          return {
            content: [
              {
                type: "text",
                text: "✅ 数据库连接已断开",
              },
            ],
          };
        }

        case "list_connections": {
          const connections = connectionManager.listConnections();
          
          if (connections.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `📋 数据库连接列表\n\n🔍 当前没有任何数据库连接`,
                },
              ],
            };
          }

          let result = `📋 数据库连接列表\n\n📊 总连接数: ${connections.length}\n\n`;
          
          connections.forEach((conn, index) => {
            // 判断是否是通过 Header 创建的连接
            const isHeaderConnection = conn.id.startsWith('header_connection_');
            const connectionSource = isHeaderConnection ? '🔐(Header预配置)' : '🔧(工具参数)';
            
            result += `${index + 1}. 🔗 **${conn.id}** ${connectionSource}${conn.isActive ? ' 🎯(活跃)' : ''}\n`;
            result += `   📍 主机: ${conn.host}:${conn.port}\n`;
            result += `   🗄️ 数据库: ${conn.database}\n`;
            result += `   👤 用户: ${conn.user}\n`;
            result += `   ⏰ 连接时间: ${new Date(conn.connectedAt).toLocaleString()}\n\n`;
          });

          return {
            content: [
              {
                type: "text",
                text: result,
              },
            ],
          };
        }

        case "switch_active_connection": {
          const { connection_id } = args as { connection_id: string };
          
          await connectionManager.switchActiveConnection(connection_id);
          const connection = connectionManager.listConnections().find(c => c.id === connection_id);

          return {
            content: [
              {
                type: "text",
                text: `✅ 已切换活跃连接到: ${connection_id}\n📍 数据库: ${connection?.database}\n📊 当前总连接数: ${connectionManager.getConnectionCount()}`,
              },
            ],
          };
        }

        case "remove_connection": {
          const { connection_id } = args as { connection_id: string };
          
          await connectionManager.removeConnection(connection_id);

          return {
            content: [
              {
                type: "text",
                text: `✅ 已移除连接: ${connection_id}\n📊 剩余连接数: ${connectionManager.getConnectionCount()}`,
              },
            ],
          };
        }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `未知的工具: ${name}`);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      // 记录错误
      logger.error(`工具调用失败 (HTTP)`, { 
        tool: name, 
        args, 
        error: err.message,
        stack: err.stack 
      });

      throw new McpError(ErrorCode.InternalError, `❌ 工具执行失败: ${err.message}`);
    } finally {
      // 记录工具调用结束
      logger.info(`工具调用结束 (HTTP)`, { tool: name });
    }
  });

  return server;
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// CORS 配置 - 允许自定义 Header
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Accept', 
    'Authorization', 
    'Mcp-Session-Id',
    'X-MySQL-Host',
    'X-MySQL-Port',
    'X-MySQL-User',
    'X-MySQL-Password',
    'X-MySQL-Database'
  ],
  exposedHeaders: ['Content-Type', 'Mcp-Session-Id']
}));

app.use(express.json({ limit: "10mb" }));

// 健康检查
app.get("/health", (_req: Request, res: Response) => {
  res.json({ 
    status: "healthy", 
    transport: "streamable-http", 
    activeSessions: sessions.size,
    version: "3.1.0"
  });
});

// Streamable HTTP 主端点：POST /mcp（JSON-RPC）
app.all("/mcp", async (req: Request, res: Response) => {
  const sessionIdHeader = req.headers["mcp-session-id"] as string | undefined;
  const method = req.method.toUpperCase();

  if (method === "POST") {
    const body = req.body;
    if (!body) {
      return res.status(400).json({ 
        jsonrpc: "2.0", 
        error: { code: -32600, message: "Empty body" }, 
        id: null 
      });
    }

    // 忽略通知（如 notifications/initialized）
    const isNotification = (body.id === undefined || body.id === null) && 
                          typeof body.method === "string" && 
                          body.method.startsWith("notifications/");
    
    if (isNotification) {
      if (sessionIdHeader && sessions.has(sessionIdHeader)) {
        sessions.get(sessionIdHeader)!.lastActivity = new Date();
      }
      return res.status(204).end();
    }

    // 初始化/会话管理
    const isInit = body.method === "initialize";
    let session: Session | undefined;
    
    if (sessionIdHeader && sessions.has(sessionIdHeader)) {
      session = sessions.get(sessionIdHeader)!;
      session.lastActivity = new Date();
    } else if (isInit) {
      const newId = randomUUID();
      const connectionManager = new ConnectionManager();
      const server = createMCPServer(connectionManager);
      
      session = { 
        id: newId, 
        server, 
        connectionManager,
        headerConnectionId: null,
        createdAt: new Date(), 
        lastActivity: new Date() 
      };
      
      sessions.set(newId, session);
      res.setHeader("Mcp-Session-Id", newId);
      
      logger.info("新会话已创建", { sessionId: newId });
    } else {
      return res.status(400).json({ 
        jsonrpc: "2.0", 
        error: { code: -32000, message: "No session and not initialize" }, 
        id: null 
      });
    }

    // 检查并处理 Header 中的数据库配置
    if (session) {
      const dbConfig = extractDatabaseConfigFromHeaders(req);
      
      if (dbConfig && dbConfig.host && dbConfig.user && dbConfig.database) {
        // 验证配置是否完整
        if (!dbConfig.password) {
          logger.warn("Header 数据库配置不完整，缺少密码", { sessionId: session.id });
        } else {
          // 如果 header 中有数据库配置,自动建立连接
          const headerConnId = `header_connection_${session.id}`;
          
          try {
            // 检查是否已经创建了这个连接
            if (!session.headerConnectionId || 
                !session.connectionManager.getConnection(session.headerConnectionId)) {
              
              await session.connectionManager.addConnection(headerConnId, {
                host: dbConfig.host,
                port: dbConfig.port || 3306,
                user: dbConfig.user,
                password: dbConfig.password,
                database: dbConfig.database
              });
              
              session.headerConnectionId = headerConnId;
              
              logger.info("从 Header 自动创建数据库连接", { 
                sessionId: session.id, 
                connectionId: headerConnId,
                host: dbConfig.host,
                database: dbConfig.database
              });
            }
          } catch (error) {
            logger.error("从 Header 创建数据库连接失败", { 
              sessionId: session.id, 
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }
    }

    // 处理核心方法
    if (body.method === "initialize") {
      return res.json({ 
        jsonrpc: "2.0", 
        result: { 
          protocolVersion: "2024-11-05", 
          capabilities: { tools: {} }, 
          serverInfo: { name: "mysql-mcp-server", version: "3.1.0" } 
        }, 
        id: body.id 
      });
    }

    if (body.method === "tools/list") {
      const tools = [
        {
          name: "connect_database",
          description: "连接到MySQL数据库",
          inputSchema: {
            type: "object",
            properties: {
              host: { type: "string", description: "数据库主机地址" },
              port: { type: "number", description: "数据库端口号（默认：3306）", default: 3306 },
              user: { type: "string", description: "数据库用户名" },
              password: { type: "string", description: "数据库密码" },
              database: { type: "string", description: "要连接的数据库名称" },
              connection_id: { type: "string", description: "连接标识符（可选）" },
            },
            required: ["host", "user", "password", "database"],
          },
        },
        {
          name: "execute_query",
          description: "执行SQL查询语句（支持增删改查所有操作）",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "要执行的SQL查询语句" },
              params: { type: "array", description: "SQL参数（可选）", items: { type: "string" } },
              connection_id: { type: "string", description: "连接标识符（可选）" },
            },
            required: ["query"],
          },
        },
        // ... 其他工具的定义可以类似添加
      ];
      
      return res.json({ jsonrpc: "2.0", result: { tools }, id: body.id });
    }

    if (body.method === "tools/call" && session) {
      const { name, arguments: args } = body.params;
      
      try {
        const result = await session.server.request(
          { method: "tools/call", params: { name, arguments: args } },
          CallToolRequestSchema
        );
        
        return res.json({ jsonrpc: "2.0", result, id: body.id });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        return res.status(500).json({ 
          jsonrpc: "2.0", 
          error: { code: -32000, message: err.message }, 
          id: body.id 
        });
      }
    }

    return res.status(400).json({ 
      jsonrpc: "2.0", 
      error: { code: -32601, message: `Method not found: ${body.method}` }, 
      id: body.id 
    });
  }

  return res.status(405).json({ 
    jsonrpc: "2.0", 
    error: { code: -32600, message: "Method Not Allowed" }, 
    id: null 
  });
});

// 启动服务器
app.listen(PORT, () => {
  logger.info(`StreamableHTTP MCP Server 已启动`, { port: PORT });
  console.log(`🚀 StreamableHTTP MCP Server 已启动`);
  console.log(`📡 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`\n📋 支持的 Header 配置:`);
  console.log(`   - X-MySQL-Host: 数据库主机地址`);
  console.log(`   - X-MySQL-Port: 数据库端口号`);
  console.log(`   - X-MySQL-User: 数据库用户名`);
  console.log(`   - X-MySQL-Password: 数据库密码`);
  console.log(`   - X-MySQL-Database: 数据库名称`);
});

// 优雅关闭处理
process.on("SIGINT", async () => {
  logger.info("接收到SIGINT信号，正在关闭服务器...");
  
  // 断开所有会话的连接
  for (const [sessionId, session] of sessions.entries()) {
    try {
      await session.connectionManager.disconnectAll();
      logger.info(`会话 ${sessionId} 的连接已断开`);
    } catch (error) {
      logger.error(`断开会话 ${sessionId} 连接失败`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  logger.info("服务器已关闭");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("接收到SIGTERM信号，正在关闭服务器...");
  
  // 断开所有会话的连接
  for (const [sessionId, session] of sessions.entries()) {
    try {
      await session.connectionManager.disconnectAll();
    } catch (error) {
      logger.error(`断开会话 ${sessionId} 连接失败`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  logger.info("服务器已关闭");
  process.exit(0);
});

