const fs = require("fs");
const fetch = require("node-fetch");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { SocksProxyAgent } = require("socks-proxy-agent");

function loadConfig(configPath = "config.json") {
    try {
        const configData = fs.readFileSync(configPath, "utf8");
        return JSON.parse(configData);
    } catch (error) {
        console.error(`Error loading configuration: ${error.message}`);
        return {
            proxy_file: "proxy.txt",
            output_file: "working_proxies.txt",
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

    // Перевіряємо, чи є протокол
    if (proxyStr.includes("://")) {
        [protocol, proxyStr] = proxyStr.split("://");
    }

    // Якщо є @ - значить є автентифікація
    if (proxyStr.includes("@")) {
        const [auth, hostPort] = proxyStr.split("@");
        [username, password] = auth.split(":");
        [host, port] = hostPort.split(":");
    } else if (proxyStr.includes(":")) {
        // Формат без @ але з автентифікацією (ip:port:username:password)
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
    let configPath = "config.json";

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

const PROXY_FILE = config.proxy_file;
const OUTPUT_FILE = config.output_file;
const TEST_URL = config.test_url;
const TIMEOUT = config.timeout * 1000;
const CONCURRENT_CHECKS = config.concurrent_checks;
const SAVE_TO_INPUT_FILE = config.save_to_input_file;

function readProxiesFromFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, "utf8");
        return data.split("\n").filter((line) => line.trim() !== "");
    } catch (error) {
        console.error(`Error reading a file:${error.message}`);
        return [];
    }
}

async function checkHttpProxy(proxyInfo) {
    return new Promise(async (resolve) => {
        try {
            const proxyUrl = proxyInfo.toString();
            const agent = new HttpsProxyAgent(proxyUrl);

            const response = await fetch(TEST_URL, {
                agent,
                timeout: TIMEOUT,
                method: "HEAD",
            });

            resolve(response.ok);
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

            const response = await fetch(TEST_URL, {
                agent,
                timeout: TIMEOUT,
                method: "HEAD",
            });

            resolve(response.ok);
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

async function processProxiesInBatches(proxies) {
    const workingProxies = [];
    const totalProxies = proxies.length;
    let processedCount = 0;

    console.log(`Starting proxy check of ${totalProxies} proxies...`);

    for (let i = 0; i < totalProxies; i += CONCURRENT_CHECKS) {
        const batch = proxies.slice(i, i + CONCURRENT_CHECKS);
        const promises = batch.map(async (proxy) => {
            const isWorking = await checkProxy(proxy);
            processedCount++;

            if (processedCount % 10 === 0 || processedCount === totalProxies) {
                console.log(
                    `Progress: ${processedCount}/${totalProxies} (${Math.round((processedCount / totalProxies) * 100)}%)`
                );
            }

            if (isWorking) {
                console.log(`✅ Works: ${proxy}`);
                workingProxies.push(proxy);
            } else {
                console.log(`❌ Not works: ${proxy}`);
            }

            return { proxy, isWorking };
        });

        await Promise.all(promises);
    }

    return workingProxies;
}

function saveWorkingProxies(proxies, filePath) {
    try {
        fs.writeFileSync(filePath, proxies.join("\n"));
        console.log(`Saved ${proxies.length} working proxies to file ${filePath}`);
    } catch (error) {
        console.error(`Error saving file: ${error.message}`);
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

    saveWorkingProxies(workingProxies, OUTPUT_FILE);

    if (SAVE_TO_INPUT_FILE) {
        console.log(`Saving working proxies to input file: ${PROXY_FILE}`);
        saveWorkingProxies(workingProxies, PROXY_FILE);
    } else {
        console.log(`Not saving to input file (disabled in configuration)`);
    }
}

main().catch((error) => {
    console.error("Error executing the program:", error);
});
