const axios = require("axios");

const GITHUB_API = "https://api.github.com";

async function fetchRepoContents(owner, repo, path = "") {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;
    const res = await axios.get(url);

    let files = [];

    for (const item of res.data) {
        if (item.type === "file") {
            if (!item.download_url) continue;
            const fileRes = await axios.get(item.download_url);
            files.push({
                name: item.path,
                content: fileRes.data
            });
        } else if (item.type === "dir") {
            const nested = await fetchRepoContents(owner, repo, item.path);
            files = files.concat(nested);
        }
    }

    return files;
}

exports.getRepoFiles = async (repoUrl) => {
    const parts = repoUrl.split("/");
    const owner = parts[3];
    const repo = parts[4];

    return await fetchRepoContents(owner, repo);
};