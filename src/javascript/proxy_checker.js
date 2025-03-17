const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { SocksProxyAgent } = require("socks-proxy-agent");

function getProjectRoot() {
    const scriptDir = path.dirname(__filename);
    return path.dirname(path.dirname(scriptDir));
}

function getFilePath(relativePath) {
    const fullPath = path.join(getProjectRoot(), relativePath);
    console.log(`Resolved path: ${fullPath}`);
    return fullPath;
}

function loadConfig(configPath = path.join("config", "config.json")) {
    try {
        const fullPath = getFilePath(configPath);
        console.log(`Loading config from: ${fullPath}`);
        const configData = fs.readFileSync(fullPath, "utf8");
        return JSON.parse(configData);
    } catch (error) {
        console.error(`Error loading configuration: ${error.message}`);
        return {
            proxy_file: "data/proxy.txt",
            output_file: "data/working_proxies.txt",
            test_url: "http://www.google.com",
            timeout: 5,
            concurrent_checks: 20,
            save_to_input_file: false,
        };
    }
}

function parseProxyString(proxyStr) {
    let protocol = "http";
    let username = "";
    let password = "";
    let host = "";
    let port = "";

    if (proxyStr.includes("://")) {
        [protocol, proxyStr] = proxyStr.split("://");
    }

    if (proxyStr.includes("@")) {
        const [auth, hostPort] = proxyStr.split("@");
        [username, password] = auth.split(":");
        [host, port] = hostPort.split(":");
    } else if (proxyStr.includes(":")) {
        const parts = proxyStr.split(":");
        if (parts.length === 4) {
            [host, port, username, password] = parts;
        } else {
            [host, port] = parts;
        }
    }

    return {
        protocol: protocol.toLowerCase(),
        host,
        port: parseInt(port),
        username,
        password,
        toString() {
            const auth = username && password ? `${username}:${password}@` : "";
            return `${protocol}://${auth}${host}:${port}`;
        },
    };
}

function parseArgs() {
    const args = process.argv.slice(2);
    let configPath = path.join("config", "config.json");

    for (let i = 0; i < args.length; i++) {
        if ((args[i] === "-c" || args[i] === "--config") && i + 1 < args.length) {
            configPath = args[i + 1];
            break;
        }
    }

    return { configPath };
}

const { configPath } = parseArgs();
console.log(`Using configuration file: ${configPath}`);

const config = loadConfig(configPath);

const PROXY_FILE = path.join("data", path.basename(config.proxy_file));
const OUTPUT_FILE = path.join("data", path.basename(config.output_file));
const TEST_URL = config.test_url;
const TIMEOUT = config.timeout * 1000;
const CONCURRENT_CHECKS = config.concurrent_checks;
const SAVE_TO_INPUT_FILE = config.save_to_input_file;

const dataDir = path.join(getProjectRoot(), "data");
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

function readProxiesFromFile(filePath) {
    try {
        const fullPath = getFilePath(filePath);
        const data = fs.readFileSync(fullPath, "utf8");
        return data.split("\n").filter((line) => line.trim() !== "");
    } catch (error) {
        console.error(`Error reading a file:${error.message}`);
        return [];
    }
}

function timeout(ms) {
    return new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));
}

async function checkHttpProxy(proxyInfo) {
    return new Promise(async (resolve) => {
        try {
            const proxyUrl = proxyInfo.toString();
            const agent = new HttpsProxyAgent(proxyUrl);

            const result = await Promise.race([
                fetch(TEST_URL, {
                    agent,
                    timeout: TIMEOUT,
                    method: "HEAD",
                }),
                timeout(TIMEOUT),
            ]);

            resolve(result.ok);
        } catch (error) {
            resolve(false);
        }
    });
}

async function checkSocksProxy(proxyInfo) {
    return new Promise(async (resolve) => {
        try {
            const proxyUrl = proxyInfo.toString();
            const agent = new SocksProxyAgent(proxyUrl);

            const result = await Promise.race([
                fetch(TEST_URL, {
                    agent,
                    timeout: TIMEOUT,
                    method: "HEAD",
                }),
                timeout(TIMEOUT),
            ]);

            resolve(result.ok);
        } catch (error) {
            resolve(false);
        }
    });
}

async function checkProxy(proxyStr) {
    try {
        const proxyInfo = parseProxyString(proxyStr);

        switch (proxyInfo.protocol) {
            case "http":
            case "https":
                return await checkHttpProxy(proxyInfo);
            case "socks4":
            case "socks5":
                return await checkSocksProxy(proxyInfo);
            default:
                proxyInfo.protocol = "http";
                return await checkHttpProxy(proxyInfo);
        }
    } catch (error) {
        return false;
    }
}

class Semaphore {
    constructor(max) {
        this.max = max;
        this.count = 0;
        this.queue = [];
    }

    async acquire() {
        if (this.count < this.max) {
            this.count++;
            return;
        }
        await new Promise((resolve) => this.queue.push(resolve));
        this.count++;
    }

    release() {
        this.count--;
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            next();
        }
    }
}

async function processProxiesInBatches(proxies) {
    const sem = new Semaphore(CONCURRENT_CHECKS);
    const workingProxies = [];
    const totalProxies = proxies.length;
    let processedCount = 0;

    console.log(`Starting proxy check of ${totalProxies} proxies...`);

    const checkWithSem = async (proxy) => {
        try {
            await sem.acquire();
            const isWorking = await Promise.race([checkProxy(proxy), timeout(TIMEOUT * 2)]);

            processedCount++;
            if (processedCount % 10 === 0 || processedCount === totalProxies) {
                console.log(
                    `Progress: ${processedCount}/${totalProxies} (${Math.round(
                        (processedCount / totalProxies) * 100
                    )}%)`
                );
            }

            if (isWorking) {
                console.log(`✅ Working: ${proxy}`);
                workingProxies.push(proxy);
            } else {
                console.log(`❌ Failed: ${proxy}`);
            }

            return isWorking;
        } catch (error) {
            processedCount++;
            console.log(`❌ Timeout: ${proxy}`);
            return false;
        } finally {
            sem.release();
        }
    };

    const batchSize = CONCURRENT_CHECKS;
    for (let i = 0; i < proxies.length; i += batchSize) {
        const batch = proxies.slice(i, i + batchSize);
        try {
            await Promise.race([Promise.all(batch.map(checkWithSem)), timeout(TIMEOUT * 3)]);
        } catch (error) {
            console.log(`Batch timeout, moving to next batch...`);
            continue;
        }
    }

    return workingProxies;
}

function saveWorkingProxies(proxies, filePath) {
    try {
        const fullPath = getFilePath(filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, proxies.join("\n"));
        console.log(`✅ Saved ${proxies.length} working proxies to ${filePath}`);
    } catch (error) {
        console.error(`Error saving working proxies: ${error.message}`);
    }
}

async function main() {
    console.log("Starting proxy check...");
    console.log(`Using configuration from file: ${configPath}`);
    console.log(`Proxy file: ${PROXY_FILE}`);
    console.log(`Output file: ${OUTPUT_FILE}`);
    console.log(`URL for testing: ${TEST_URL}`);
    console.log(`Timeout: ${TIMEOUT / 1000} seconds`);
    console.log(`Number of concurrent checks: ${CONCURRENT_CHECKS}`);
    console.log(`Save to input file: ${SAVE_TO_INPUT_FILE ? "Yes" : "No"}`);

    const proxies = readProxiesFromFile(PROXY_FILE);
    console.log(`Loaded ${proxies.length} proxies from file ${PROXY_FILE}`);

    if (proxies.length === 0) {
        console.error("No proxies found for checking.");
        return;
    }

    const workingProxies = await processProxiesInBatches(proxies);

    console.log(`\nResults of the check:`);
    console.log(`Total proxies: ${proxies.length}`);
    console.log(`Working proxies: ${workingProxies.length}`);
    console.log(`Not working proxies: ${proxies.length - workingProxies.length}`);

    if (SAVE_TO_INPUT_FILE) {
        console.log(`Saving working proxies to input file: ${PROXY_FILE}`);
        saveWorkingProxies(workingProxies, PROXY_FILE);
    } else {
        console.log(`Not saving to input file (disabled in configuration)`);
        saveWorkingProxies(workingProxies, OUTPUT_FILE);
    }
}

main().catch((error) => {
    console.error("Error executing the program:", error);
});
