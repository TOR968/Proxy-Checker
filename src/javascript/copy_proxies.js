const fs = require("fs");
const path = require("path");

function getProjectRoot() {
    const scriptDir = path.dirname(__filename);
    return path.dirname(path.dirname(scriptDir));
}

function getFilePath(relativePath) {
    return path.join(getProjectRoot(), relativePath);
}

async function copyProxies() {
    console.log("Copying proxies between projects...");

    const configPath = getFilePath(path.join("config", "proxy_config.json"));
    if (!fs.existsSync(configPath)) {
        console.error("Error: File proxy_config.json not found!");
        return false;
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const sourceProxy = path.isAbsolute(config.source_proxy) ? config.source_proxy : getFilePath(config.source_proxy);

    if (!fs.existsSync(sourceProxy)) {
        console.error(`Error: File ${sourceProxy} not found!`);
        return false;
    }

    for (const projectPath of config.project_paths) {
        const targetPath = path.isAbsolute(projectPath) ? projectPath : getFilePath(projectPath);

        if (fs.existsSync(targetPath)) {
            console.log(`Copying to ${targetPath}...`);
            fs.copyFileSync(sourceProxy, targetPath);
            console.log(`Successfully copied to ${targetPath}`);
        } else {
            console.log(`Skipping ${targetPath} (path does not exist)`);
        }
    }

    console.log("\nCopying completed!");
    return true;
}

copyProxies().then(() => {
    console.log("Press Ctrl+C to exit...");
});
