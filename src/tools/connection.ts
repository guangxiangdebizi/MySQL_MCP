import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { DatabaseConnectionManager } from "../database.js";

/**
 * 连接管理工具定义
 */
export const connectionTools: Tool[] = [
  {
    name: "add_connection",
    description: "添加新的数据库连接",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "连接标识符（唯一ID，例如：prod, test, dev）"
        },
        host: {
          type: "string",
          description: "数据库主机地址"
        },
        port: {
          type: "number",
          description: "数据库端口号",
          default: 3306
        },
        user: {
          type: "string",
          description: "数据库用户名"
        },
        password: {
          type: "string",
          description: "数据库密码"
        },
        database: {
          type: "string",
          description: "数据库名称"
        }
      },
      required: ["id", "host", "user", "password", "database"]
    }
  },
  {
    name: "list_connections",
    description: "列出所有数据库连接",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "select_database",
    description: "选择活跃的数据库连接（后续SQL将在此数据库上执行）",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "要选择的连接ID"
        }
      },
      required: ["id"]
    }
  },
  {
    name: "remove_connection",
    description: "移除指定的数据库连接",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "要移除的连接ID"
        }
      },
      required: ["id"]
    }
  }
];

/**
 * 连接管理工具处理器
 */
export async function handleConnectionTool(
  name: string,
  args: any,
  dbManager: DatabaseConnectionManager
): Promise<any> {
  switch (name) {
    case "add_connection": {
      const { id, host, port = 3306, user, password, database } = args;
      
      await dbManager.addConnection({
        id,
        host,
        port,
        user,
        password,
        database
      });

      return {
        content: [
          {
            type: "text",
            text: `✅ 数据库连接已添加\n` +
                  `🆔 ID: ${id}\n` +
                  `🖥️  主机: ${host}:${port}\n` +
                  `📂 数据库: ${database}\n` +
                  `👤 用户: ${user}`
          }
        ]
      };
    }

    case "list_connections": {
      const connections = dbManager.listConnections();
      
      if (connections.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "⚠️  当前没有任何数据库连接\n\n💡 使用 add_connection 工具添加连接"
            }
          ]
        };
      }

      const activeId = dbManager.getActiveConnectionId();
      let text = `📊 当前数据库连接列表 (共 ${connections.length} 个)\n\n`;
      
      connections.forEach((conn, index) => {
        const prefix = conn.isActive ? "🟢" : "⚪";
        text += `${prefix} [${index + 1}] ${conn.id}\n`;
        text += `   └─ ${conn.host}:${conn.port}/${conn.database}\n`;
        text += `   └─ 用户: ${conn.user}\n`;
        if (conn.isActive) {
          text += `   └─ ✅ 当前活跃连接\n`;
        }
        text += `\n`;
      });

      text += `\n💡 使用 select_database 切换活跃连接`;

      return {
        content: [{ type: "text", text }]
      };
    }

    case "select_database": {
      const { id } = args;
      
      dbManager.selectDatabase(id);
      const connections = dbManager.listConnections();
      const selected = connections.find(c => c.id === id);

      return {
        content: [
          {
            type: "text",
            text: `✅ 已选择数据库\n` +
                  `🆔 ID: ${id}\n` +
                  `📂 数据库: ${selected?.database}\n` +
                  `🖥️  主机: ${selected?.host}:${selected?.port}\n\n` +
                  `✨ 后续所有 SQL 操作将在此数据库上执行`
          }
        ]
      };
    }

    case "remove_connection": {
      const { id } = args;
      
      await dbManager.removeConnection(id);

      return {
        content: [
          {
            type: "text",
            text: `✅ 连接已移除: ${id}\n` +
                  `📊 剩余连接数: ${dbManager.listConnections().length}`
          }
        ]
      };
    }

    default:
      throw new Error(`未知的连接工具: ${name}`);
  }
}

