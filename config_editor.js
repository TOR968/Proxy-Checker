const fs = require("fs");
const readline = require("readline");
const path = require("path");

const DEFAULT_CONFIG_FILE = "config.json";

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

function loadConfig(configPath) {
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

function saveConfig(config, configPath) {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
        console.log(`Configuration saved to file: ${configPath}`);
        return true;
    } catch (error) {
        console.error(`Error saving configuration: ${error.message}`);
        return false;
    }
}

function displayConfig(config) {
    console.log("\nCurrent configuration:");
    console.log("-".repeat(30));
    for (const [key, value] of Object.entries(config)) {
        console.log(`${key}: ${value}`);
    }
    console.log("-".repeat(30));
}

function createInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
}

function question(rl, query) {
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            resolve(answer);
        });
    });
}

async function editConfig(configPath) {
    const config = loadConfig(configPath);
    displayConfig(config);

    const rl = createInterface();

    console.log("\nEditing configuration:");
    console.log("Leave the field empty to keep the current value");

    const proxyFile = await question(rl, `Proxy file [${config.proxy_file}]: `);
    if (proxyFile) config.proxy_file = proxyFile;

    const outputFile = await question(rl, `Output file [${config.output_file}]: `);
    if (outputFile) config.output_file = outputFile;

    const testUrl = await question(rl, `Test URL [${config.test_url}]: `);
    if (testUrl) config.test_url = testUrl;

    const timeout = await question(rl, `Timeout in seconds [${config.timeout}]: `);
    if (timeout) {
        const timeoutNum = parseInt(timeout);
        if (!isNaN(timeoutNum)) {
            config.timeout = timeoutNum;
        } else {
            console.log("Invalid timeout format. Using the previous value.");
        }
    }

    const concurrentChecks = await question(rl, `Number of concurrent checks [${config.concurrent_checks}]: `);
    if (concurrentChecks) {
        const concurrentChecksNum = parseInt(concurrentChecks);
        if (!isNaN(concurrentChecksNum)) {
            config.concurrent_checks = concurrentChecksNum;
        } else {
            console.log("Invalid number format. Using the previous value.");
        }
    }

    const saveToInputFile = await question(
        rl,
        `Save working proxies to input file (y/n) [${config.save_to_input_file ? "y" : "n"}]: `
    );
    if (
        saveToInputFile.toLowerCase() === "y" ||
        saveToInputFile.toLowerCase() === "yes"
    ) {
        config.save_to_input_file = true;
    } else if (
        saveToInputFile.toLowerCase() === "n" ||
        saveToInputFile.toLowerCase() === "no"
    ) {
        config.save_to_input_file = false;
    }

    rl.close();

    if (saveConfig(config, configPath)) {
        console.log("Configuration successfully updated!");
        displayConfig(config);
    }
}

async function main() {
    const { configPath } = parseArgs();

    if (!fs.existsSync(configPath)) {
        const defaultConfig = loadConfig(configPath);
        saveConfig(defaultConfig, configPath);
        console.log(`Created default configuration file: ${configPath}`);
    }

    await editConfig(configPath);
}

main().catch((error) => {
    console.error("Error executing the program:", error);
});
