const axios = require("axios");
const { filterFiles } = require("../utils/fileFilter");
const { analyzeFiles } = require("./analyzer.service");
const { addTasks } = require("./taskStore.service");
const { addLog } = require("./audit.service");
exports.fetchRepoFiles = async (repoUrl) => {
    try {
        const match = repoUrl.match(/github.com\/(.*?)\/(.*)/);
        const owner = match[1];
        const repo = match[2];

        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;

        const res = await axios.get(apiUrl);

        const files = [];

        for (let file of res.data) {
            if (file.type === "file") {
                const contentRes = await axios.get(file.download_url);
                files.push({
                    name: file.name,
                    path: file.path,
                    content: contentRes.data
                });
            }
        }

        const filteredFiles = filterFiles(files);


const tasks = await analyzeFiles(filteredFiles);


addTasks(tasks);


addLog({
    action: "TASK_GENERATION",
    count: tasks.length,
    repo: repoUrl
});

return {
    files: filteredFiles,
    tasks
};
    } catch (err) {
        console.error(err);
        throw new Error("Error fetching repo");
    }
};
//testing comment 