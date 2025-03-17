const fs = require("fs");
const path = require("path");
const DEFAULT_CONFIG_FILE = path.join("config", "config.json");

function getProjectRoot() {
    const scriptDir = path.dirname(__filename);
    return path.dirname(path.dirname(scriptDir));
}

function getFilePath(relativePath) {
    const fullPath = path.join(getProjectRoot(), relativePath);
    console.log(`Resolved path: ${fullPath}`);
    return fullPath;
}

function parseArgs() {
    const args = process.argv.slice(2);
    let configPath = DEFAULT_CONFIG_FILE;

    for (let i = 0; i < args.length; i++) {
        if ((args[i] === "-c" || args[i] === "--config") && i + 1 < args.length) {
            configPath = args[i + 1];
            break;
        }
    }

    return { configPath };
}

function loadConfig(configFile) {
    try {
        const fullPath = getFilePath(configFile);
        console.log(`Loading config from: ${fullPath}`);
        const configData = fs.readFileSync(fullPath, "utf8");
        return JSON.parse(configData);
    } catch (error) {
        console.error(`Error loading config file: ${error}`);
        return {
            proxy_url: "https://raw.githubusercontent.com/monosans/proxy-list/refs/heads/main/proxies/all.txt",
            proxy_file: "data/proxy.txt",
            output_file: "data/working_proxies.txt",
            test_url: "http://httpbin.org/status/200",
            timeout: 3,
            concurrent_checks: 50,
            save_to_input_file: true,
        };
    }
}

async function downloadAndSaveProxies(config) {
    try {
        const response = await fetch(config.proxy_url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const proxies = text.trim().split("\n");

        const proxyFile = path.join("data", path.basename(config.proxy_file));
        const proxyFilePath = getFilePath(proxyFile);

        fs.mkdirSync(path.dirname(proxyFilePath), { recursive: true });
        fs.writeFileSync(proxyFilePath, proxies.join("\n"));

        console.log(`✅ Successfully downloaded ${proxies.length} proxies to ${proxyFile}`);
        return true;
    } catch (error) {
        console.log(`❌ Error downloading proxies: ${error}`);
        return false;
    }
}

function runProxyChecker() {
    try {
        require("./proxy_checker.js");
    } catch (error) {
        console.log(`❌ Error running proxy checker: ${error}`);
    }
}

async function main() {
    const { configPath } = parseArgs();
    const config = loadConfig(configPath);

    console.log(`Using configuration from: ${configPath}`);
    console.log(`Proxy URL: ${config.proxy_url}`);
    console.log(`Proxy file: ${config.proxy_file}`);

    if (await downloadAndSaveProxies(config)) {
        console.log("\nStarting the proxy check...");
        runProxyChecker();
    }
}

main().catch((error) => {
    console.error("Error executing the program:", error);
});
