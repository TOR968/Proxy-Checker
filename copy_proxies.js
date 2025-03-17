const fs = require("fs");

async function copyProxies() {
    console.log("Copying proxies between projects...");

    if (!fs.existsSync("proxy_config.json")) {
        console.error("Error: File proxy_config.json not found!");
        return false;
    }

    const config = JSON.parse(fs.readFileSync("proxy_config.json", "utf8"));
    const sourceProxy = config.source_proxy;

    if (!fs.existsSync(sourceProxy)) {
        console.error(`Error: File ${sourceProxy} not found!`);
        return false;
    }

    for (const projectPath of config.project_paths) {
        if (fs.existsSync(projectPath)) {
            console.log(`Copying to ${projectPath}...`);
            fs.copyFileSync(sourceProxy, projectPath);
            console.log(`Successfully copied to ${projectPath}`);
        } else {
            console.log(`Skipping ${projectPath} (path does not exist)`);
        }
    }

    console.log("\nCopying completed!");
    return true;
}

copyProxies().then(() => {
    console.log("Press Ctrl+C to exit...");
});
