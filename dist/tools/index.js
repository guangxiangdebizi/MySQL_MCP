import { connectionTools, handleConnectionTool } from "./connection.js";
import { queryTools, handleQueryTool } from "./query.js";
/**
 * 所有工具的统一导出
 */
export const allTools = [
    ...connectionTools,
    ...queryTools
];
/**
 * 工具调用统一处理器
 */
export async function handleToolCall(name, args, dbManager) {
    // 连接管理工具
    if (["add_connection", "list_connections", "select_database", "remove_connection"].includes(name)) {
        return handleConnectionTool(name, args, dbManager);
    }
    // 查询工具
    if (["execute_query", "show_tables", "describe_table", "show_databases"].includes(name)) {
        return handleQueryTool(name, args, dbManager);
    }
    throw new Error(`未知的工具: ${name}`);
}
