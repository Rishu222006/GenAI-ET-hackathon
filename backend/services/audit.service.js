const logs = [];

const addLog = (entry) => {
    logs.push({
        ...entry,
        timestamp: new Date()
    });

    console.log("AUDIT LOG:", {
        ...entry,
        timestamp: new Date()
    });
};

const getLogs = () => {
    return logs;
};

const clearLogs = () => {
    logs.length = 0;
};

module.exports = { addLog, getLogs, clearLogs };