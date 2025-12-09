/**
 * 测试 MySQL MCP Server 连接
 * 
 * 使用方法：
 * node test-connection.js
 */

async function testConnection() {
  const host = 'localhost';
  const port = 3001;
  
  console.log('🧪 开始测试 MySQL MCP Server...\n');
  
  // 1. 测试健康检查
  console.log('📊 步骤 1: 检查服务器健康状态');
  try {
    const healthResponse = await fetch(`http://${host}:${port}/health`);
    const health = await healthResponse.json();
    console.log('✅ 健康检查通过:', health);
    console.log('');
  } catch (error) {
    console.error('❌ 健康检查失败:', error.message);
    console.log('💡 请确保服务器已启动: npm start\n');
    return;
  }
  
  // 2. 测试初始化会话
  console.log('📊 步骤 2: 初始化 MCP 会话');
  let sessionId = null;
  try {
    const initResponse = await fetch(`http://${host}:${port}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MySQL-Host': 'localhost',
        'X-MySQL-Port': '3306',
        'X-MySQL-User': 'root',
        'X-MySQL-Password': '123456',
        'X-MySQL-Database': 'mysql'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        },
        id: 1
      })
    });
    
    sessionId = initResponse.headers.get('Mcp-Session-Id');
    const initResult = await initResponse.json();
    console.log('✅ 会话创建成功');
    console.log('   Session ID:', sessionId);
    console.log('   Server Info:', initResult.result.serverInfo);
    console.log('');
  } catch (error) {
    console.error('❌ 会话初始化失败:', error.message);
    return;
  }
  
  if (!sessionId) {
    console.error('❌ 未获取到 Session ID');
    return;
  }
  
  // 3. 测试列出工具
  console.log('📊 步骤 3: 获取可用工具列表');
  try {
    const toolsResponse = await fetch(`http://${host}:${port}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Mcp-Session-Id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 2
      })
    });
    
    const toolsResult = await toolsResponse.json();
    console.log('✅ 工具列表获取成功');
    console.log('   可用工具:', toolsResult.result.tools.map(t => t.name).join(', '));
    console.log('');
  } catch (error) {
    console.error('❌ 获取工具列表失败:', error.message);
  }
  
  // 4. 测试列出连接
  console.log('📊 步骤 4: 列出数据库连接');
  try {
    const listResponse = await fetch(`http://${host}:${port}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Mcp-Session-Id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'list_connections',
          arguments: {}
        },
        id: 3
      })
    });
    
    const listResult = await listResponse.json();
    if (listResult.result && listResult.result.content) {
      console.log('✅ 连接列表获取成功');
      console.log(listResult.result.content[0].text);
    } else {
      console.log('⚠️  返回结果:', JSON.stringify(listResult, null, 2));
    }
    console.log('');
  } catch (error) {
    console.error('❌ 列出连接失败:', error.message);
  }
  
  // 5. 测试查询（如果有 Header 配置的连接）
  console.log('📊 步骤 5: 测试数据库查询');
  try {
    const queryResponse = await fetch(`http://${host}:${port}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Mcp-Session-Id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'execute_query',
          arguments: {
            query: 'SELECT DATABASE() as current_db, VERSION() as version, NOW() as current_time'
          }
        },
        id: 4
      })
    });
    
    const queryResult = await queryResponse.json();
    if (queryResult.result && queryResult.result.content) {
      console.log('✅ 查询执行成功');
      console.log(queryResult.result.content[0].text);
    } else if (queryResult.error) {
      console.log('⚠️  查询失败:', queryResult.error.message);
      console.log('💡 这可能是因为没有配置 Header 连接，请在初始化时添加数据库配置');
    }
    console.log('');
  } catch (error) {
    console.error('❌ 查询执行失败:', error.message);
  }
  
  console.log('🎉 测试完成！\n');
  console.log('📝 测试总结:');
  console.log('   - 如果所有步骤都显示 ✅，说明服务器运行正常');
  console.log('   - 如果查询失败，请检查 Header 配置或使用 add_connection 工具添加连接');
  console.log('   - 完整使用方法请查看 README.md 和 QUICK_START.md\n');
}

testConnection().catch(console.error);

