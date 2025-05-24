export const corsOrigin = ({ argv, }) => {
    if (!argv.cors) {
        return false;
    }
    if (argv.cors.length === 0) {
        return '*';
    }
    const origins = argv.cors.map((item) => `${item}`);
    if (origins.includes('*'))
        return '*';
    return origins.map((origin) => {
        if (/^\/.*\/$/.test(origin)) {
            const pattern = origin.slice(1, -1);
            try {
                return new RegExp(pattern);
            }
            catch (error) {
                return origin;
            }
        }
        return origin;
    });
};
