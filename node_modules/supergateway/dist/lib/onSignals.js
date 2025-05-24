/**
 * Sets up signal handlers for graceful shutdown.
 *
 * @param options Configuration options
 * @param options.logger Logger instance
 * @param options.cleanup Optional cleanup function to be called before exit
 */
export function onSignals(options) {
    const { logger, cleanup } = options;
    const handleSignal = (signal) => {
        logger.info(`Caught ${signal}. Exiting...`);
        if (cleanup) {
            cleanup();
        }
        process.exit(0);
    };
    process.on('SIGINT', () => handleSignal('SIGINT'));
    process.on('SIGTERM', () => handleSignal('SIGTERM'));
    process.on('SIGHUP', () => handleSignal('SIGHUP'));
    process.stdin.on('close', () => {
        logger.info('stdin closed. Exiting...');
        if (cleanup) {
            cleanup();
        }
        process.exit(0);
    });
}
