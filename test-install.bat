@echo off
title MySQL MCP Server - 一键安装脚本
echo.
echo ================================================
echo       MySQL MCP Server 一键安装脚本
echo ================================================
echo.

echo 🔧 正在检查Node.js环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未找到Node.js，请先安装Node.js 18+
    echo    下载地址: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js环境检查通过

echo.
echo 📦 正在安装项目依赖...
npm install
if errorlevel 1 (
    echo ❌ 依赖安装失败，请检查网络连接
    pause
    exit /b 1
)
echo ✅ 依赖安装成功

echo.
echo 🔨 正在构建项目...
npm run build
if errorlevel 1 (
    echo ❌ 项目构建失败，请检查错误信息
    pause
    exit /b 1
)
echo ✅ 项目构建成功

echo.
echo 🎯 安装完成！请按照以下步骤配置：
echo.
echo 1. 在VSCode中按 Ctrl+Shift+P
echo 2. 输入 "Cline: Open MCP Settings"
echo 3. 添加以下配置：
echo.
echo {
echo   "mcpServers": {
echo     "mysql-database": {
echo       "command": "node",
echo       "args": ["%CD%/dist/index.js"],
echo       "env": {}
echo     }
echo   }
echo }
echo.
echo 4. 重启VSCode即可使用
echo.
echo 💡 更多使用方法请查看 README.md
echo.
pause 