import util from 'node:util';
const defaultFormatArgs = (args) => args;
const log = ({ formatArgs = defaultFormatArgs, } = { formatArgs: defaultFormatArgs }) => (...args) => console.log('[supergateway]', ...formatArgs(args));
const logStderr = ({ formatArgs = defaultFormatArgs, } = { formatArgs: defaultFormatArgs }) => (...args) => console.error('[supergateway]', ...formatArgs(args));
const noneLogger = {
    info: () => { },
    error: () => { },
};
const infoLogger = {
    info: log(),
    error: logStderr(),
};
const infoLoggerStdio = {
    info: logStderr(),
    error: logStderr(),
};
const debugFormatArgs = (args) => args.map((arg) => {
    if (typeof arg === 'object') {
        return util.inspect(arg, {
            depth: null,
            colors: process.stderr.isTTY,
            compact: false,
        });
    }
    return arg;
});
const debugLogger = {
    info: log({ formatArgs: debugFormatArgs }),
    error: logStderr({ formatArgs: debugFormatArgs }),
};
const debugLoggerStdio = {
    info: logStderr({ formatArgs: debugFormatArgs }),
    error: logStderr({ formatArgs: debugFormatArgs }),
};
export const getLogger = ({ logLevel, outputTransport, }) => {
    if (logLevel === 'none') {
        return noneLogger;
    }
    if (logLevel === 'debug') {
        return outputTransport === 'stdio' ? debugLoggerStdio : debugLogger;
    }
    // info logLevel
    return outputTransport === 'stdio' ? infoLoggerStdio : infoLogger;
};
