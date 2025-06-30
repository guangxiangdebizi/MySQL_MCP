#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import mysql from "mysql2/promise";
import { DatabaseManager } from "./database.js";
import { logger } from "./logger.js";

const server = new Server(
  {
    name: "mysql-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 全局数据库管理器实例
let dbManager: DatabaseManager | null = null;

// 列出可用工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
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
          },
          required: ["query"],
        },
      },

      {
        name: "begin_transaction",
        description: "开始数据库事务",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "commit_transaction",
        description: "提交数据库事务",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "rollback_transaction",
        description: "回滚数据库事务",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "show_transaction_history",
        description: "显示当前事务的操作历史",
        inputSchema: {
          type: "object",
          properties: {},
        },
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
          },
          required: ["step_number"],
        },
      },
      {
        name: "full_rollback",
        description: "完全回滚当前事务的所有操作",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "show_tables",
        description: "显示数据库中的所有表及其结构信息",
        inputSchema: {
          type: "object",
          properties: {},
        },
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
          },
          required: ["table_name"],
        },
      },
      {
        name: "disconnect_database",
        description: "断开数据库连接",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // 记录工具调用
  logger.info(`工具调用开始`, { tool: name, args });

  try {
    switch (name) {
      case "connect_database": {
        const { host, port = 3306, user, password, database } = args as {
          host: string;
          port?: number;
          user: string;
          password: string;
          database: string;
        };

        // 如果已有连接，先断开
        if (dbManager) {
          await dbManager.disconnect();
        }

        // 创建新的数据库管理器并连接
        dbManager = new DatabaseManager();
        await dbManager.connect({ host, port, user, password, database });

        return {
          content: [
            {
              type: "text",
              text: `✅ 成功连接到MySQL数据库！\n📍 主机: ${host}:${port}\n🗄️ 数据库: ${database}\n👤 用户: ${user}`,
            },
          ],
        };
      }

      case "execute_query": {
        if (!dbManager || !dbManager.isConnected()) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            "❌ 请先使用 connect_database 工具连接到数据库"
          );
        }

        const { query, params = [] } = args as { query: string; params?: any[] };
        const result = await dbManager.executeQuery(query, params);

        return {
          content: [
            {
              type: "text",
              text: `✅ SQL执行成功！\n\n📊 操作类型: ${result.type}\n⏱️ 执行时间: ${result.duration}ms\n\n📋 结果:\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }



      case "begin_transaction": {
        if (!dbManager || !dbManager.isConnected()) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            "❌ 请先使用 connect_database 工具连接到数据库"
          );
        }

        await dbManager.beginTransaction();

        return {
          content: [
            {
              type: "text",
              text: `✅ 事务已开始！\n\n⚠️ 请记得在操作完成后提交或回滚事务`,
            },
          ],
        };
      }

      case "commit_transaction": {
        if (!dbManager || !dbManager.isConnected()) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            "❌ 请先使用 connect_database 工具连接到数据库"
          );
        }

        const transactionManager = dbManager.getTransactionManager();
        const result = await transactionManager.commitTransaction(async () => {
          return await dbManager!.commitTransaction();
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
        if (!dbManager || !dbManager.isConnected()) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            "❌ 请先使用 connect_database 工具连接到数据库"
          );
        }

        const transactionManager = dbManager.getTransactionManager();
        const result = await transactionManager.fullRollback(async (query, params) => {
          return await dbManager!.executeQuery(query, params || []);
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
        if (!dbManager || !dbManager.isConnected()) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            "❌ 请先使用 connect_database 工具连接到数据库"
          );
        }

        const transactionManager = dbManager.getTransactionManager();
        const historyText = transactionManager.getRollbackOptions();

        return {
          content: [
            {
              type: "text",
              text: `📋 事务操作历史\n\n${historyText}`,
            },
          ],
        };
      }

      case "rollback_to_step": {
        if (!dbManager || !dbManager.isConnected()) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            "❌ 请先使用 connect_database 工具连接到数据库"
          );
        }

        const { step_number } = args as { step_number: number };
        const transactionManager = dbManager.getTransactionManager();
        
        const result = await transactionManager.rollbackToStep(step_number, async (query, params) => {
          return await dbManager!.executeQuery(query, params || []);
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
        if (!dbManager || !dbManager.isConnected()) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            "❌ 请先使用 connect_database 工具连接到数据库"
          );
        }

        const transactionManager = dbManager.getTransactionManager();
        const result = await transactionManager.fullRollback(async (query, params) => {
          return await dbManager!.executeQuery(query, params || []);
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
        if (!dbManager || !dbManager.isConnected()) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            "❌ 请先使用 connect_database 工具连接到数据库"
          );
        }

        const tables = await dbManager.showTables();
        let result = `📋 数据库概览\n\n`;
        
        if (tables.length === 0) {
          result += "🔍 数据库中没有找到任何表";
        } else {
          result += `📊 总共找到 ${tables.length} 个表:\n\n`;
          
          for (const table of tables) {
            const tableName = Object.values(table)[0] as string;
            try {
              // 获取表的行数
              const countResult = await dbManager.executeQuery(`SELECT COUNT(*) as count FROM \`${tableName}\``);
              const rowCount = countResult.data[0]?.count || 0;
              
              // 获取表结构（只显示列名和类型）
              const structure = await dbManager.describeTable(tableName);
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
        if (!dbManager || !dbManager.isConnected()) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            "❌ 请先使用 connect_database 工具连接到数据库"
          );
        }

        const { table_name } = args as { table_name: string };
        
        // 获取表结构
        const structure = await dbManager.describeTable(table_name);
        
        // 获取表的行数
        const countResult = await dbManager.executeQuery(`SELECT COUNT(*) as count FROM \`${table_name}\``);
        const totalRows = countResult.data[0]?.count || 0;
        
        // 获取样本数据（最多5行）
        let sampleData = [];
        if (totalRows > 0) {
          const sampleResult = await dbManager.executeQuery(`SELECT * FROM \`${table_name}\` LIMIT 5`);
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
        if (dbManager) {
          await dbManager.disconnect();
          dbManager = null;
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

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `未知的工具: ${name}`
        );
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    // 记录错误
    logger.error(`工具调用失败`, { 
      tool: name, 
      args, 
      error: err.message,
      stack: err.stack 
    });

    throw new McpError(ErrorCode.InternalError, `❌ 工具执行失败: ${err.message}`);
  } finally {
    // 记录工具调用结束
    logger.info(`工具调用结束`, { tool: name });
  }
});

// 启动服务器
async function main() {
  try {
    // 记录服务器启动
    logger.info("MySQL MCP Server 正在启动...");
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    logger.info("MySQL MCP Server 已启动并等待连接", {
      version: "2.0.0",
      capabilities: ["connect_database", "execute_query", "show_tables", "describe_table", "begin_transaction", "commit_transaction", "rollback_transaction", "show_transaction_history", "rollback_to_step", "full_rollback", "disconnect_database"]
    });
    
    console.error("MySQL MCP Server 已启动并等待连接...");
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("服务器启动失败", { error: err.message, stack: err.stack });
    throw err;
  }
}

// 优雅关闭处理
process.on("SIGINT", async () => {
  logger.info("接收到SIGINT信号，正在关闭服务器...");
  if (dbManager) {
    await dbManager.disconnect();
  }
  logger.info("服务器已关闭");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("接收到SIGTERM信号，正在关闭服务器...");
  if (dbManager) {
    await dbManager.disconnect();
  }
  logger.info("服务器已关闭");
  process.exit(0);
});

// 处理未捕获的异常
process.on("uncaughtException", (error) => {
  logger.error("未捕获的异常", { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("未处理的Promise拒绝", { reason, promise });
  process.exit(1);
});

main().catch((error) => {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error("启动服务器时发生错误", { error: err.message, stack: err.stack });
  console.error("启动服务器时发生错误:", err.message);
  process.exit(1);
}); 