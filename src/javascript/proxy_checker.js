const fs = require("fs");
const path = require("path");
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
            test_urls: [
                "https://www.google.com",
                "https://www.cloudflare.com",
                "https://www.microsoft.com",
                "https://www.amazon.com",
                "https://www.github.com",
            ],
            timeout: 5,
            concurrent_checks: 20,
            save_to_input_file: false,
            retry_count: 1,
            speed_filter: {
                enabled: false,
                max_speed: 1000,
                min_speed: 0,
            },
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
const TEST_URLS = config.test_urls;
const TIMEOUT = config.timeout * 1000;
const CONCURRENT_CHECKS = config.concurrent_checks;
const SAVE_TO_INPUT_FILE = config.save_to_input_file;
const RETRY_COUNT = config.retry_count || 1;
const SPEED_FILTER = config.speed_filter || { enabled: false, max_speed: 1000, min_speed: 0 };

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

function randomUrl() {
    return TEST_URLS[Math.floor(Math.random() * TEST_URLS.length)];
}

async function checkHttpProxy(proxyInfo) {
    return new Promise(async (resolve) => {
        try {
            const proxyUrl = proxyInfo.toString();
            const agent = new HttpsProxyAgent(proxyUrl);
            const startTime = Date.now();

            // Use random URL instead of testing all URLs
            const url = randomUrl();
            try {
                const fetchResult = await Promise.race([
                    fetch(url, {
                        agent,
                        timeout: TIMEOUT,
                        method: "HEAD",
                    }),
                    timeout(TIMEOUT),
                ]);

                const responseTime = Date.now() - startTime;
                const working = fetchResult.ok;

                resolve({
                    working,
                    successRate: working ? 1 : 0,
                    speed: working ? responseTime : null,
                });
            } catch (error) {
                console.debug(`Error testing ${url} with proxy ${proxyUrl}: ${error.message}`);
                resolve({ working: false, successRate: 0, speed: null });
            }
        } catch (error) {
            resolve({ working: false, successRate: 0, speed: null });
        }
    });
}

async function checkSocksProxy(proxyInfo) {
    return new Promise(async (resolve) => {
        try {
            const proxyUrl = proxyInfo.toString();
            const agent = new SocksProxyAgent(proxyUrl);
            const startTime = Date.now();

            const url = randomUrl();
            try {
                const fetchResult = await Promise.race([
                    fetch(url, {
                        agent,
                        timeout: TIMEOUT,
                        method: "HEAD",
                    }),
                    timeout(TIMEOUT),
                ]);

                const responseTime = Date.now() - startTime;
                const working = fetchResult.ok;

                resolve({
                    working,
                    successRate: working ? 1 : 0,
                    speed: working ? responseTime : null,
                });
            } catch (error) {
                console.debug(`Error testing ${url} with proxy ${proxyUrl}: ${error.message}`);
                resolve({ working: false, successRate: 0, speed: null });
            }
        } catch (error) {
            resolve({ working: false, successRate: 0, speed: null });
        }
    });
}

function validateProxyString(proxyStr) {
    const regex = /^(https?|socks[45])?(:\/{2})?([^:@]+:)?([^@]+@)?([^:]+)(:\d+)$/i;
    return regex.test(proxyStr);
}

async function checkProxy(proxyStr) {
    try {
        if (!validateProxyString(proxyStr)) {
            console.log(`❌ Invalid proxy format: ${proxyStr}`);
            return { working: false, successRate: 0, speed: null, proxy: proxyStr };
        }

        const proxyInfo = parseProxyString(proxyStr);

        switch (proxyInfo.protocol) {
            case "http":
            case "https":
                return { ...(await checkHttpProxy(proxyInfo)), proxy: proxyStr };
            case "socks4":
            case "socks5":
                return { ...(await checkSocksProxy(proxyInfo)), proxy: proxyStr };
            default:
                proxyInfo.protocol = "http";
                return { ...(await checkHttpProxy(proxyInfo)), proxy: proxyStr };
        }
    } catch (error) {
        return { working: false, successRate: 0, speed: null, proxy: proxyStr };
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
    const MAX_RETRIES = RETRY_COUNT;

    const retryMap = new Map();

    console.log(`Starting proxy check of ${totalProxies} proxies...`);
    function drawProgressBar(current, total, barLength = 30) {
        const progress = Math.round((current / total) * barLength);
        const progressBar = "█".repeat(progress) + "░".repeat(barLength - progress);
        const percentage = Math.round((current / total) * 100);
        return `[${progressBar}] ${current}/${total} (${percentage}%)`;
    }

    const checkWithSem = async (proxy, retryCount = 0) => {
        try {
            await sem.acquire();
            const result = await Promise.race([checkProxy(proxy), timeout(TIMEOUT * 2)]);

            processedCount++;
            if (processedCount % 5 === 0 || processedCount === totalProxies) {
                const progressBar = drawProgressBar(processedCount, totalProxies);
                console.log(progressBar);
            }

            if (result.working) {
                if (SPEED_FILTER.enabled && result.speed !== null) {
                    if (result.speed < SPEED_FILTER.min_speed || result.speed > SPEED_FILTER.max_speed) {
                        console.log(
                            `❌ Filtered: ${proxy} | Speed: ${result.speed}ms (outside range ${SPEED_FILTER.min_speed}-${SPEED_FILTER.max_speed}ms)`
                        );
                        return false;
                    }
                }

                const speedCategory = result.speed ? categorizeSpeed(result.speed) : "unknown";
                const successPercent = Math.round(result.successRate * 100);
                console.log(
                    `✅ Working: ${proxy} | Speed: ${
                        result.speed || "N/A"
                    }ms (${speedCategory}) | Success: ${successPercent}%`
                );
                workingProxies.push({
                    proxy,
                    speed: result.speed,
                    successRate: result.successRate,
                    category: speedCategory,
                });
            } else if (retryCount < MAX_RETRIES) {
                console.log(`⚠️ Retry (${retryCount + 1}/${MAX_RETRIES}): ${proxy}`);
                retryMap.set(proxy, retryCount + 1);
            } else {
                console.log(`❌ Failed: ${proxy}`);
            }

            return result.working;
        } catch (error) {
            processedCount++;
            console.log(`❌ Timeout: ${proxy}`);
            return false;
        } finally {
            sem.release();
        }
    };

    function categorizeSpeed(speed) {
        if (speed < 500) return "fast";
        if (speed < 1000) return "medium";
        return "slow";
    }

    const batchSize = CONCURRENT_CHECKS;
    for (let i = 0; i < proxies.length; i += batchSize) {
        const batch = proxies.slice(i, i + batchSize);
        try {
            await Promise.race([Promise.all(batch.map((proxy) => checkWithSem(proxy))), timeout(TIMEOUT * 3)]);
        } catch (error) {
            console.log(`Batch timeout, moving to next batch...`);
            continue;
        }
    }

    const retriesToProcess = Array.from(retryMap.entries()).filter(([_, count]) => count <= MAX_RETRIES);

    if (retriesToProcess.length > 0) {
        console.log(`\nRetrying ${retriesToProcess.length} proxies...`);
        for (const [proxy, retryCount] of retriesToProcess) {
            await checkWithSem(proxy, retryCount);
        }
    }

    return {
        proxyStrings: workingProxies.map((p) => p.proxy),
        proxyObjects: workingProxies,
    };
}

function saveWorkingProxies(proxies, filePath) {
    try {
        const fullPath = getFilePath(filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });

        const jsonFilePath = fullPath.replace(/\.[^.]+$/, ".json");
        fs.writeFileSync(jsonFilePath, JSON.stringify(proxies.proxyObjects, null, 2));
        console.log(`✅ Saved detailed proxy data to ${jsonFilePath}`);

        fs.writeFileSync(fullPath, proxies.proxyStrings.join("\n"));
        console.log(`✅ Saved ${proxies.proxyStrings.length} working proxies to ${filePath}`);
    } catch (error) {
        console.error(`Error saving working proxies: ${error.message}`);
    }
}

async function main() {
    console.log("Starting proxy check...");
    console.log(`Using configuration from file: ${configPath}`);
    console.log(`Proxy file: ${PROXY_FILE}`);
    console.log(`Output file: ${OUTPUT_FILE}`);
    console.log(`URLs for testing: ${TEST_URLS.join(", ")}`);
    console.log(`Timeout: ${TIMEOUT / 1000} seconds`);
    console.log(`Number of concurrent checks: ${CONCURRENT_CHECKS}`);
    console.log(`Save to input file: ${SAVE_TO_INPUT_FILE ? "Yes" : "No"}`);
    console.log(`Retry count: ${RETRY_COUNT}`);

    if (SPEED_FILTER.enabled) {
        console.log(`Speed filter: Enabled (${SPEED_FILTER.min_speed}ms - ${SPEED_FILTER.max_speed}ms)`);
    } else {
        console.log(`Speed filter: Disabled`);
    }

    const proxies = readProxiesFromFile(PROXY_FILE);
    console.log(`Loaded ${proxies.length} proxies from file ${PROXY_FILE}`);

    if (proxies.length === 0) {
        console.error("No proxies found for checking.");
        return;
    }

    const workingProxies = await processProxiesInBatches(proxies);

    console.log(`\nResults of the check:`);
    console.log(`Total proxies: ${proxies.length}`);
    console.log(`Working proxies: ${workingProxies.proxyStrings.length}`);
    console.log(`Not working proxies: ${proxies.length - workingProxies.proxyStrings.length}`);

    const categories = workingProxies.proxyObjects.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1;
        return acc;
    }, {});

    console.log("\nProxy Speed Categories:");
    Object.entries(categories).forEach(([category, count]) => {
        console.log(`- ${category}: ${count} proxies`);
    });

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
