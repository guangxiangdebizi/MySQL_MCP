FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package文件以优化Docker层缓存
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制应用代码
COPY . .

# 构建TypeScript代码
RUN npm run build

# 确保dist目录存在并包含index.js
RUN ls -la dist/ && test -f dist/index.js

# 暴露端口（如果需要HTTP模式）
EXPOSE 3100

# 设置默认命令（这将被smithery.yaml中的commandFunction覆盖）
CMD ["node", "dist/index.js"] 