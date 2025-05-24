import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { spawn } from 'child_process';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { getVersion } from '../lib/getVersion.js';
import { WebSocketServerTransport } from '../server/websocket.js';
import { onSignals } from '../lib/onSignals.js';
import { serializeCorsOrigin } from '../lib/serializeCorsOrigin.js';
export async function stdioToWs(args) {
    const { stdioCmd, port, messagePath, logger, healthEndpoints, corsOrigin } = args;
    logger.info(`  - port: ${port}`);
    logger.info(`  - stdio: ${stdioCmd}`);
    logger.info(`  - messagePath: ${messagePath}`);
    logger.info(`  - CORS: ${corsOrigin ? `enabled (${serializeCorsOrigin({ corsOrigin })})` : 'disabled'}`);
    logger.info(`  - Health endpoints: ${healthEndpoints.length ? healthEndpoints.join(', ') : '(none)'}`);
    let wsTransport = null;
    let child = null;
    let isReady = false;
    const cleanup = () => {
        if (wsTransport) {
            wsTransport.close().catch((err) => {
                logger.error(`Error stopping WebSocket server: ${err.message}`);
            });
        }
        if (child) {
            child.kill();
        }
    };
    onSignals({
        logger,
        cleanup,
    });
    try {
        child = spawn(stdioCmd, { shell: true });
        child.on('exit', (code, signal) => {
            logger.error(`Child exited: code=${code}, signal=${signal}`);
            cleanup();
            process.exit(code ?? 1);
        });
        const server = new Server({ name: 'supergateway', version: getVersion() }, { capabilities: {} });
        // Handle child process output
        let buffer = '';
        child.stdout.on('data', (chunk) => {
            buffer += chunk.toString('utf8');
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? '';
            lines.forEach((line) => {
                if (!line.trim())
                    return;
                try {
                    const jsonMsg = JSON.parse(line);
                    logger.info(`Child → WebSocket: ${JSON.stringify(jsonMsg)}`);
                    // Broadcast to all connected clients
                    wsTransport?.send(jsonMsg, jsonMsg.id).catch((err) => {
                        logger.error('Failed to broadcast message:', err);
                    });
                }
                catch {
                    logger.error(`Child non-JSON: ${line}`);
                }
            });
        });
        child.stderr.on('data', (chunk) => {
            logger.info(`Child stderr: ${chunk.toString('utf8')}`);
        });
        const app = express();
        if (corsOrigin) {
            app.use(cors({ origin: corsOrigin }));
        }
        for (const ep of healthEndpoints) {
            app.get(ep, (_req, res) => {
                if (child?.killed) {
                    res.status(500).send('Child process has been killed');
                }
                if (!isReady) {
                    res.status(500).send('Server is not ready');
                }
                res.send('ok');
            });
        }
        const httpServer = createServer(app);
        wsTransport = new WebSocketServerTransport({
            path: messagePath,
            server: httpServer,
        });
        await server.connect(wsTransport);
        wsTransport.onmessage = (msg) => {
            const line = JSON.stringify(msg);
            logger.info(`WebSocket → Child: ${line}`);
            child.stdin.write(line + '\n');
        };
        wsTransport.onconnection = (clientId) => {
            logger.info(`New WebSocket connection: ${clientId}`);
        };
        wsTransport.ondisconnection = (clientId) => {
            logger.info(`WebSocket connection closed: ${clientId}`);
        };
        wsTransport.onerror = (err) => {
            logger.error(`WebSocket error: ${err.message}`);
        };
        isReady = true;
        httpServer.listen(port, () => {
            logger.info(`Listening on port ${port}`);
            logger.info(`WebSocket endpoint: ws://localhost:${port}${messagePath}`);
        });
    }
    catch (err) {
        logger.error(`Failed to start: ${err.message}`);
        cleanup();
        process.exit(1);
    }
}
