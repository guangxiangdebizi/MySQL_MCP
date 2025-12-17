import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { DatabaseConnectionManager } from "../database.js";

/**
 * 查询工具定义
 */
export const queryTools: Tool[] = [
  {
    name: "execute_query",
    description: "执行SQL查询（支持SELECT、INSERT、UPDATE、DELETE等所有SQL语句）。注意：通常不需要指定connection_id，系统会自动使用当前活跃连接。",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "要执行的SQL查询语句"
        },
        connection_id: {
          type: "string",
          description: "【通常不需要填写】指定连接ID。留空则自动使用当前活跃连接。如需查看可用连接ID，请先调用 list_connections 工具。"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "show_tables",
    description: "显示数据库中的所有表。自动使用当前活跃的数据库连接。",
    inputSchema: {
      type: "object",
      properties: {
        connection_id: {
          type: "string",
          description: "【通常不需要填写】指定连接ID，留空自动使用活跃连接"
        }
      },
      required: []
    }
  },
  {
    name: "describe_table",
    description: "查看表的结构和字段信息。自动使用当前活跃的数据库连接。",
    inputSchema: {
      type: "object",
      properties: {
        table_name: {
          type: "string",
          description: "表名"
        },
        connection_id: {
          type: "string",
          description: "【通常不需要填写】指定连接ID，留空自动使用活跃连接"
        }
      },
      required: ["table_name"]
    }
  },
  {
    name: "show_databases",
    description: "显示所有可访问的数据库。自动使用当前活跃的数据库连接。",
    inputSchema: {
      type: "object",
      properties: {
        connection_id: {
          type: "string",
          description: "【通常不需要填写】指定连接ID，留空自动使用活跃连接"
        }
      },
      required: []
    }
  }
];

/**
 * 验证并规范化 connection_id 参数
 * 如果传入无效值（空字符串、"默认"、"default" 等），返回 undefined 使用活跃连接
 */
function normalizeConnectionId(
  connectionId: string | undefined,
  dbManager: DatabaseConnectionManager
): string | undefined {
  // 如果未提供或为空，使用活跃连接
  if (!connectionId || connectionId.trim() === '') {
    return undefined;
  }

  const trimmed = connectionId.trim();
  
  // 常见的无效值列表（AI 可能会传这些）
  const invalidValues = [
    '默认', 'default', 'active', 'current', 'auto', 
    '当前', '活跃', 'none', 'null', 'undefined'
  ];
  
  if (invalidValues.includes(trimmed.toLowerCase())) {
    return undefined;
  }

  // 检查连接是否真实存在
  const connections = dbManager.listConnections();
  const exists = connections.some(conn => conn.id === trimmed);
  
  if (!exists) {
    // 连接不存在，回退到活跃连接
    console.log(`⚠️ connection_id "${trimmed}" 不存在，使用活跃连接`);
    return undefined;
  }

  return trimmed;
}

/**
 * 查询工具处理器
 */
export async function handleQueryTool(
  name: string,
  args: any,
  dbManager: DatabaseConnectionManager
): Promise<any> {
  // 规范化 connection_id，无效值自动回退到活跃连接
  const connection_id = normalizeConnectionId(args.connection_id, dbManager);

  switch (name) {
    case "execute_query": {
      const { query } = args;
      
      const results = await dbManager.executeQuery(query, connection_id);
      
      // 格式化结果
      let text = "";
      if (Array.isArray(results)) {
        if (results.length === 0) {
          text = "✅ 查询成功，但没有返回数据";
        } else {
          text = `✅ 查询成功，返回 ${results.length} 行数据\n\n`;
          text += "```json\n";
          text += JSON.stringify(results, null, 2);
          text += "\n```";
        }
      } else if (results.affectedRows !== undefined) {
        text = `✅ 执行成功\n`;
        text += `📝 影响行数: ${results.affectedRows}\n`;
        if (results.insertId) {
          text += `🆔 插入ID: ${results.insertId}\n`;
        }
      } else {
        text = "✅ 执行成功";
      }

      return {
        content: [{ type: "text", text }]
      };
    }

    case "show_tables": {
      const results = await dbManager.executeQuery("SHOW TABLES", connection_id);
      
      if (!Array.isArray(results) || results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "⚠️  数据库中没有表"
            }
          ]
        };
      }

      const tableKey = Object.keys(results[0])[0];
      const tables = results.map((row: any) => row[tableKey]);
      
      let text = `📊 数据库表列表 (共 ${tables.length} 个表)\n\n`;
      tables.forEach((table: string, index: number) => {
        text += `${index + 1}. ${table}\n`;
      });

      return {
        content: [{ type: "text", text }]
      };
    }

    case "describe_table": {
      const { table_name } = args;
      
      // 获取表结构
      const structure = await dbManager.executeQuery(
        `DESCRIBE ${table_name}`,
        connection_id
      );
      
      // 获取样本数据
      const sampleData = await dbManager.executeQuery(
        `SELECT * FROM ${table_name} LIMIT 3`,
        connection_id
      );

      let text = `📋 表结构: ${table_name}\n\n`;
      text += "**字段信息:**\n```\n";
      
      if (Array.isArray(structure)) {
        structure.forEach((field: any) => {
          text += `${field.Field}\n`;
          text += `  类型: ${field.Type}\n`;
          text += `  空值: ${field.Null}\n`;
          text += `  键: ${field.Key || '-'}\n`;
          text += `  默认: ${field.Default !== null ? field.Default : 'NULL'}\n`;
          text += `  备注: ${field.Extra || '-'}\n\n`;
        });
      }
      text += "```\n\n";

      if (Array.isArray(sampleData) && sampleData.length > 0) {
        text += `**样本数据 (前3行):**\n`;
        text += "```json\n";
        text += JSON.stringify(sampleData, null, 2);
        text += "\n```";
      } else {
        text += "**样本数据:** 表中暂无数据";
      }

      return {
        content: [{ type: "text", text }]
      };
    }

    case "show_databases": {
      const results = await dbManager.executeQuery("SHOW DATABASES", connection_id);
      
      if (!Array.isArray(results) || results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "⚠️  没有可访问的数据库"
            }
          ]
        };
      }

      const databases = results.map((row: any) => row.Database);
      
      let text = `🗄️  可访问的数据库列表 (共 ${databases.length} 个)\n\n`;
      databases.forEach((db: string, index: number) => {
        text += `${index + 1}. ${db}\n`;
      });

      return {
        content: [{ type: "text", text }]
      };
    }

    default:
      throw new Error(`未知的查询工具: ${name}`);
  }
}

