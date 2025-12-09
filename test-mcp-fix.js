/**
 * 测试 MCP 修复后的功能
 * 验证 initialize 和 tools/list 请求是否正常工作
 */

import fetch from 'node-fetch';

const MCP_URL = 'http://localhost:3002/mcp';

// 测试数据库配置（根据你的实际配置修改）
const headers = {
  'Content-Type': 'application/json',
  'X-MySQL-Host': '18.119.46.208',
  'X-MySQL-Port': '3306',
  'X-MySQL-User': 'root', // 请修改为你的实际用户名
  'X-MySQL-Password': 'your_password', // 请修改为你的实际密码
  'X-MySQL-Database': 'ry_vuebak'
};

async function testMCP() {
  console.log('🧪 开始测试 MCP 修复...\n');

  // 1. 测试 initialize 请求
  console.log('📋 测试 1: Initialize 请求');
  const initResponse = await fetch(MCP_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    })
  });

  const initData = await initResponse.json();
  const sessionId = initResponse.headers.get('mcp-session-id');
  
  if (initData.result && sessionId) {
    console.log('✅ Initialize 成功');
    console.log(`   会话ID: ${sessionId}`);
    console.log(`   服务器: ${initData.result.serverInfo.name} v${initData.result.serverInfo.version}\n`);
  } else {
    console.error('❌ Initialize 失败:', initData);
    return;
  }

  // 2. 测试 tools/list 请求（这是之前失败的地方）
  console.log('📋 测试 2: Tools/List 请求（修复前会失败）');
  const toolsResponse = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      ...headers,
      'Mcp-Session-Id': sessionId
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list'
    })
  });

  const toolsData = await toolsResponse.json();
  
  if (toolsData.result && toolsData.result.tools) {
    console.log(`✅ Tools/List 成功 - 找到 ${toolsData.result.tools.length} 个工具`);
    console.log('   可用工具:');
    toolsData.result.tools.forEach((tool, index) => {
      console.log(`   ${index + 1}. ${tool.name} - ${tool.description}`);
    });
    console.log();
  } else if (toolsData.error) {
    console.error('❌ Tools/List 失败:', toolsData.error);
    return;
  }

  // 3. 测试 list_connections 工具调用
  console.log('📋 测试 3: 调用 list_connections 工具');
  const callResponse = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      ...headers,
      'Mcp-Session-Id': sessionId
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'list_connections',
        arguments: {}
      }
    })
  });

  const callData = await callResponse.json();
  
  if (callData.result && callData.result.content) {
    console.log('✅ 工具调用成功');
    const content = callData.result.content[0].text;
    console.log('   返回内容:', content);
  } else if (callData.error) {
    console.error('❌ 工具调用失败:', callData.error);
    return;
  }

  console.log('\n🎉 所有测试通过！MCP 修复成功！');
}

// 运行测试
testMCP().catch(err => {
  console.error('❌ 测试失败:', err.message);
  process.exit(1);
});

