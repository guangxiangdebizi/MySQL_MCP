export const serializeCorsOrigin = ({ corsOrigin, }) => JSON.stringify(corsOrigin, (_key, value) => {
    if (value instanceof RegExp) {
        return value.toString();
    }
    return value;
});
