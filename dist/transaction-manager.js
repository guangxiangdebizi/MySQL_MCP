import { dbLogger } from "./logger.js";
export class TransactionManager {
    isTransactionActive = false;
    operationHistory = [];
    currentTransactionId = null;
    /**
     * 检查是否有活跃的事务
     */
    isActive() {
        return this.isTransactionActive;
    }
    /**
     * 获取当前事务ID
     */
    getCurrentTransactionId() {
        return this.currentTransactionId;
    }
    /**
     * 开始新事务
     */
    async startTransaction() {
        const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.currentTransactionId = transactionId;
        this.isTransactionActive = true;
        this.operationHistory = [];
        dbLogger.info("自动开始新事务", {
            transactionId,
            timestamp: new Date().toISOString()
        });
        return transactionId;
    }
    /**
     * 记录操作到历史
     */
    recordOperation(operation) {
        if (!this.isTransactionActive) {
            throw new Error("没有活跃的事务");
        }
        const operationWithId = {
            ...operation,
            id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            timestamp: new Date()
        };
        this.operationHistory.push(operationWithId);
        dbLogger.info("记录事务操作", {
            transactionId: this.currentTransactionId,
            operationId: operationWithId.id,
            type: operationWithId.type,
            tableName: operationWithId.tableName,
            description: operationWithId.description
        });
    }
    /**
     * 获取操作历史
     */
    getOperationHistory() {
        return [...this.operationHistory];
    }
    /**
     * 获取可回滚的操作列表（格式化显示）
     */
    getRollbackOptions() {
        if (this.operationHistory.length === 0) {
            return "📝 当前事务中没有任何操作";
        }
        let result = "🔄 可回滚的操作历史：\n\n";
        this.operationHistory.forEach((op, index) => {
            const timeStr = op.timestamp.toLocaleString('zh-CN');
            result += `${index + 1}. [${timeStr}] ${op.type} - ${op.description}\n`;
            result += `   表: ${op.tableName}`;
            if (op.affectedRows !== undefined) {
                result += ` | 影响行数: ${op.affectedRows}`;
            }
            result += `\n\n`;
        });
        result += "💡 提示：\n";
        result += "- 选择 '提交事务' 将永久保存所有修改\n";
        result += "- 选择 '回滚到指定步骤' 可以撤销部分操作\n";
        result += "- 选择 '完全回滚' 将撤销所有操作";
        return result;
    }
    /**
     * 回滚到指定操作步骤
     */
    async rollbackToStep(stepNumber, executeRollback) {
        if (!this.isTransactionActive) {
            throw new Error("没有活跃的事务");
        }
        if (stepNumber < 1 || stepNumber > this.operationHistory.length) {
            throw new Error(`无效的步骤号。请选择 1-${this.operationHistory.length} 之间的数字`);
        }
        // 获取需要回滚的操作（从最后一个操作开始，回滚到指定步骤）
        const operationsToRollback = this.operationHistory.slice(stepNumber).reverse();
        let rollbackCount = 0;
        const rollbackResults = [];
        for (const operation of operationsToRollback) {
            if (operation.rollbackQuery) {
                try {
                    await executeRollback(operation.rollbackQuery, operation.rollbackParams);
                    rollbackCount++;
                    rollbackResults.push(`✅ 已回滚: ${operation.description}`);
                    dbLogger.info("执行操作回滚", {
                        transactionId: this.currentTransactionId,
                        operationId: operation.id,
                        rollbackQuery: operation.rollbackQuery
                    });
                }
                catch (error) {
                    const err = error instanceof Error ? error : new Error(String(error));
                    rollbackResults.push(`❌ 回滚失败: ${operation.description} - ${err.message}`);
                    dbLogger.error("操作回滚失败", {
                        transactionId: this.currentTransactionId,
                        operationId: operation.id,
                        error: err.message
                    });
                }
            }
            else {
                rollbackResults.push(`⚠️ 无法回滚: ${operation.description} (无回滚查询)`);
            }
        }
        // 更新操作历史，只保留到指定步骤
        this.operationHistory = this.operationHistory.slice(0, stepNumber);
        const result = `🔄 回滚操作完成！\n\n` +
            `📊 回滚统计:\n` +
            `- 尝试回滚: ${operationsToRollback.length} 个操作\n` +
            `- 成功回滚: ${rollbackCount} 个操作\n` +
            `- 剩余操作: ${this.operationHistory.length} 个\n\n` +
            `📋 回滚详情:\n${rollbackResults.join('\n')}`;
        return result;
    }
    /**
     * 完全回滚事务
     */
    async fullRollback(executeRollback) {
        if (!this.isTransactionActive) {
            throw new Error("没有活跃的事务");
        }
        const totalOperations = this.operationHistory.length;
        if (totalOperations === 0) {
            this.endTransaction();
            return "📝 当前事务中没有任何操作，事务已结束";
        }
        // 执行数据库级别的回滚
        await executeRollback("ROLLBACK");
        dbLogger.info("执行完全事务回滚", {
            transactionId: this.currentTransactionId,
            operationsCount: totalOperations
        });
        this.endTransaction();
        return `🔄 事务完全回滚成功！\n\n` +
            `📊 统计信息:\n` +
            `- 已撤销 ${totalOperations} 个操作\n` +
            `- 数据库已恢复到事务开始前的状态\n` +
            `- 事务已结束`;
    }
    /**
     * 提交事务
     */
    async commitTransaction(executeCommit) {
        if (!this.isTransactionActive) {
            throw new Error("没有活跃的事务");
        }
        const totalOperations = this.operationHistory.length;
        if (totalOperations === 0) {
            this.endTransaction();
            return "📝 当前事务中没有任何操作，事务已结束";
        }
        // 执行数据库级别的提交
        await executeCommit();
        dbLogger.info("提交事务成功", {
            transactionId: this.currentTransactionId,
            operationsCount: totalOperations,
            operations: this.operationHistory.map(op => ({
                type: op.type,
                tableName: op.tableName,
                description: op.description
            }))
        });
        const operationsSummary = this.operationHistory.map((op, index) => `${index + 1}. ${op.type} - ${op.description} (${op.tableName})`).join('\n');
        this.endTransaction();
        return `✅ 事务提交成功！所有修改已永久保存到数据库\n\n` +
            `📊 提交统计:\n` +
            `- 总操作数: ${totalOperations}\n` +
            `- 事务ID: ${this.currentTransactionId}\n\n` +
            `📋 已提交的操作:\n${operationsSummary}`;
    }
    /**
     * 结束事务
     */
    endTransaction() {
        this.isTransactionActive = false;
        this.operationHistory = [];
        this.currentTransactionId = null;
    }
    /**
     * 生成回滚查询
     */
    generateRollbackQuery(operation) {
        switch (operation.type) {
            case 'INSERT':
                // INSERT的回滚是DELETE
                if (operation.whereClause) {
                    return {
                        query: `DELETE FROM \`${operation.tableName}\` WHERE ${operation.whereClause}`,
                        params: operation.whereParams
                    };
                }
                return null;
            case 'UPDATE':
                // UPDATE的回滚是恢复原始数据
                if (operation.originalData && operation.whereClause) {
                    const columns = Object.keys(operation.originalData);
                    const setClause = columns.map(col => `\`${col}\` = ?`).join(', ');
                    const values = Object.values(operation.originalData);
                    return {
                        query: `UPDATE \`${operation.tableName}\` SET ${setClause} WHERE ${operation.whereClause}`,
                        params: [...values, ...operation.whereParams || []]
                    };
                }
                return null;
            case 'DELETE':
                // DELETE的回滚是INSERT原始数据
                if (operation.originalData) {
                    const columns = Object.keys(operation.originalData);
                    const placeholders = columns.map(() => '?').join(', ');
                    const values = Object.values(operation.originalData);
                    return {
                        query: `INSERT INTO \`${operation.tableName}\` (\`${columns.join('`, `')}\`) VALUES (${placeholders})`,
                        params: values
                    };
                }
                return null;
            case 'DROP_TABLE':
                // DROP TABLE的回滚需要重新创建表（这个比较复杂，暂时不支持）
                return null;
            case 'CREATE_TABLE':
                // CREATE TABLE的回滚是DROP TABLE
                return {
                    query: `DROP TABLE \`${operation.tableName}\``,
                    params: []
                };
            default:
                return null;
        }
    }
}
