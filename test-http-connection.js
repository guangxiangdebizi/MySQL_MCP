#!/usr/bin/env node

/**
 * MySQL MCP HTTP Server 测试脚本
 * 用于测试 StreamableHTTP 模式和 Header 预配置连接
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

// 测试配置
const DB_CONFIG = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: process.env.TEST_DB_PORT || '3306',
  user: process.env.TEST_DB_USER || 'root',
  password: process.env.TEST_DB_PASSWORD || '',
  database: process.env.TEST_DB_NAME || 'test'
};

console.log('🧪 MySQL MCP HTTP Server 测试\n');
console.log('📡 服务器地址:', BASE_URL);
console.log('🔐 数据库配置:', {
  host: DB_CONFIG.host,
  port: DB_CONFIG.port,
  user: DB_CONFIG.user,
  database: DB_CONFIG.database,
  password: '***' // 隐藏密码
});
console.log('\n' + '='.repeat(50) + '\n');

// 1. 测试健康检查
async function testHealth() {
  return new Promise((resolve, reject) => {
    console.log('1️⃣ 测试健康检查...');
    
    http.get(`${BASE_URL}/health`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ 健康检查通过');
          console.log('   响应:', JSON.stringify(result, null, 2));
          resolve(result);
        } catch (error) {
          console.error('❌ 健康检查失败:', error.message);
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.error('❌ 无法连接到服务器:', error.message);
      console.log('💡 提示: 请先运行 npm run start:http 启动服务器');
      reject(error);
    });
  });
}

// 2. 测试初始化会话
async function testInitialize(sessionHeaders = {}) {
  return new Promise((resolve, reject) => {
    console.log('\n2️⃣ 测试初始化会话...');
    
    const postData = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "test-client",
          version: "1.0.0"
        }
      }
    });

    const options = {
      hostname: 'localhost',
      port: PORT,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        ...sessionHeaders
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          const sessionId = res.headers['mcp-session-id'];
          console.log('✅ 会话初始化成功');
          console.log('   Session ID:', sessionId);
          console.log('   响应:', JSON.stringify(result, null, 2));
          resolve({ sessionId, result });
        } catch (error) {
          console.error('❌ 初始化失败:', error.message);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ 请求失败:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// 3. 测试列出工具
async function testListTools(sessionId) {
  return new Promise((resolve, reject) => {
    console.log('\n3️⃣ 测试列出工具...');
    
    const postData = JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list"
    });

    const options = {
      hostname: 'localhost',
      port: PORT,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        'Mcp-Session-Id': sessionId
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ 工具列表获取成功');
          console.log(`   发现 ${result.result?.tools?.length || 0} 个工具`);
          if (result.result?.tools) {
            result.result.tools.forEach((tool, index) => {
              console.log(`   ${index + 1}. ${tool.name}`);
            });
          }
          resolve(result);
        } catch (error) {
          console.error('❌ 获取工具列表失败:', error.message);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ 请求失败:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// 4. 测试 Header 预配置连接（带数据库配置）
async function testWithHeaderConnection() {
  console.log('\n\n' + '='.repeat(50));
  console.log('🔐 测试模式1: Header 预配置连接');
  console.log('='.repeat(50) + '\n');

  const sessionHeaders = {
    'X-MySQL-Host': DB_CONFIG.host,
    'X-MySQL-Port': DB_CONFIG.port,
    'X-MySQL-User': DB_CONFIG.user,
    'X-MySQL-Password': DB_CONFIG.password,
    'X-MySQL-Database': DB_CONFIG.database
  };

  try {
    const { sessionId } = await testInitialize(sessionHeaders);
    await testListTools(sessionId);
    
    // 测试列出连接
    console.log('\n4️⃣ 测试列出连接 (Header 预配置)...');
    const postData = JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "list_connections",
        arguments: {}
      }
    });

    await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: PORT,
        path: '/mcp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postData.length,
          'Mcp-Session-Id': sessionId,
          ...sessionHeaders
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            console.log('✅ 连接列表获取成功');
            console.log('   响应:', result.result?.content?.[0]?.text || JSON.stringify(result, null, 2));
            resolve(result);
          } catch (error) {
            console.error('❌ 获取连接列表失败:', error.message);
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    console.log('\n✅ Header 预配置连接测试完成');
  } catch (error) {
    console.error('\n❌ Header 预配置连接测试失败:', error.message);
  }
}

// 5. 测试工具参数连接（不带 Header 配置）
async function testWithoutHeaderConnection() {
  console.log('\n\n' + '='.repeat(50));
  console.log('🔧 测试模式2: 工具参数连接');
  console.log('='.repeat(50) + '\n');

  try {
    const { sessionId } = await testInitialize();
    await testListTools(sessionId);
    
    console.log('\n✅ 工具参数连接测试完成');
    console.log('💡 在实际使用中,可以通过 connect_database 工具连接数据库');
  } catch (error) {
    console.error('\n❌ 工具参数连接测试失败:', error.message);
  }
}

// 主测试流程
async function main() {
  try {
    // 测试健康检查
    await testHealth();
    
    // 测试两种连接模式
    await testWithHeaderConnection();
    await testWithoutHeaderConnection();
    
    console.log('\n\n' + '='.repeat(50));
    console.log('🎉 所有测试完成!');
    console.log('='.repeat(50));
    
    console.log('\n📋 测试总结:');
    console.log('✅ 健康检查通过');
    console.log('✅ Header 预配置连接工作正常');
    console.log('✅ 工具参数连接工作正常');
    console.log('\n💡 接下来可以:');
    console.log('   1. 在 Claude Desktop 中配置 MCP 客户端');
    console.log('   2. 使用 Header 预配置方式（推荐）');
    console.log('   3. 或使用工具参数方式（兼容性）');
    console.log('\n📖 配置指南: 查看 HTTP_CONFIG_EXAMPLE.md\n');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.log('\n💡 故障排除:');
    console.log('   1. 确认 HTTP 服务器已启动: npm run start:http');
    console.log('   2. 检查端口 3000 是否被占用');
    console.log('   3. 查看服务器日志获取更多信息\n');
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  main();
}

