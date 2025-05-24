#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode, } from "@modelcontextprotocol/sdk/types.js";
import { DatabaseManager } from "./database.js";
const server = new Server({
    name: "mysql-mcp-server",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
    },
});
// 全局数据库管理器实例
let dbManager = null;
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
                description: "执行SQL查询语句",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "要执行的SQL查询语句",
                        },
                    },
                    required: ["query"],
                },
            },
            {
                name: "show_tables",
                description: "显示数据库中的所有表",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "describe_table",
                description: "显示指定表的结构信息",
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
    try {
        switch (name) {
            case "connect_database": {
                const { host, port = 3306, user, password, database } = args;
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
                    throw new McpError(ErrorCode.InvalidRequest, "❌ 请先使用 connect_database 工具连接到数据库");
                }
                const { query } = args;
                const result = await dbManager.executeQuery(query);
                return {
                    content: [
                        {
                            type: "text",
                            text: `✅ 查询执行成功！\n\n📊 结果:\n${JSON.stringify(result, null, 2)}`,
                        },
                    ],
                };
            }
            case "show_tables": {
                if (!dbManager || !dbManager.isConnected()) {
                    throw new McpError(ErrorCode.InvalidRequest, "❌ 请先使用 connect_database 工具连接到数据库");
                }
                const tables = await dbManager.showTables();
                const tableList = tables.map((table) => Object.values(table)[0]).join("\n");
                return {
                    content: [
                        {
                            type: "text",
                            text: `📋 数据库中的表:\n\n${tableList}`,
                        },
                    ],
                };
            }
            case "describe_table": {
                if (!dbManager || !dbManager.isConnected()) {
                    throw new McpError(ErrorCode.InvalidRequest, "❌ 请先使用 connect_database 工具连接到数据库");
                }
                const { table_name } = args;
                const structure = await dbManager.describeTable(table_name);
                const structureText = structure
                    .map((col) => `${col.Field} | ${col.Type} | ${col.Null} | ${col.Key} | ${col.Default} | ${col.Extra}`)
                    .join("\n");
                return {
                    content: [
                        {
                            type: "text",
                            text: `🔍 表 "${table_name}" 的结构:\n\n字段名 | 类型 | 可为空 | 键 | 默认值 | 额外信息\n${"=".repeat(50)}\n${structureText}`,
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
                throw new McpError(ErrorCode.MethodNotFound, `未知的工具: ${name}`);
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new McpError(ErrorCode.InternalError, `❌ 执行失败: ${errorMessage}`);
    }
});
// 启动服务器
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MySQL MCP Server 已启动并等待连接...");
}
// 优雅关闭处理
process.on("SIGINT", async () => {
    if (dbManager) {
        await dbManager.disconnect();
    }
    process.exit(0);
});
process.on("SIGTERM", async () => {
    if (dbManager) {
        await dbManager.disconnect();
    }
    process.exit(0);
});
main().catch((error) => {
    console.error("启动服务器时发生错误:", error);
    process.exit(1);
});
