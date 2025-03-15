const fs = require("fs");
const http = require("http");
const https = require("https");
const { SocksClient } = require("socks");
const { URL } = require("url");
const path = require("path");

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

async function checkHttpProxy(proxyUrl) {
    return new Promise((resolve) => {
        try {
            const url = new URL(proxyUrl);
            const options = {
                host: url.hostname,
                port: url.port,
                path: TEST_URL,
                method: "HEAD",
                timeout: TIMEOUT,
            };

            const req = http.request(options, (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });

            req.on("error", () => {
                resolve(false);
            });

            req.on("timeout", () => {
                req.destroy();
                resolve(false);
            });

            req.end();
        } catch (error) {
            resolve(false);
        }
    });
}

async function checkSocksProxy(proxyUrl) {
    return new Promise((resolve) => {
        try {
            const url = new URL(proxyUrl);
            const socksVersion = proxyUrl.startsWith("socks5://") ? 5 : 4;

            const options = {
                proxy: {
                    host: url.hostname,
                    port: parseInt(url.port),
                    type: socksVersion,
                },
                command: "connect",
                destination: {
                    host: new URL(TEST_URL).hostname,
                    port: 80,
                },
                timeout: TIMEOUT,
            };

            SocksClient.createConnection(options)
                .then(() => {
                    resolve(true);
                })
                .catch(() => {
                    resolve(false);
                });
        } catch (error) {
            resolve(false);
        }
    });
}

async function checkProxy(proxyUrl) {
    try {
        if (proxyUrl.startsWith("http://") || proxyUrl.startsWith("https://")) {
            return await checkHttpProxy(proxyUrl);
        } else if (proxyUrl.startsWith("socks4://") || proxyUrl.startsWith("socks5://")) {
            return await checkSocksProxy(proxyUrl);
        } else {
            return await checkHttpProxy("http://" + proxyUrl);
        }
        return false;
    } catch (error) {
        return false;
    }
}

async function processProxiesInBatches(proxies) {
    const workingProxies = [];
    const totalProxies = proxies.length;
    let processedCount = 0;

    console.log(`Starting check of ${totalProxies} proxies...`);

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
                console.log(`✅ It works.: ${proxy}`);
                workingProxies.push(proxy);
            } else {
                console.log(`❌ Not working: ${proxy}`);
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
