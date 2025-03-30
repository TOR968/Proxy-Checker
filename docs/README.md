# Proxy Checker

A tool for checking proxy server performance and managing proxy files across multiple projects.

## Description

This program checks the list of proxy servers for functionality and saves working proxies to a separate file. It supports HTTP, HTTPS, SOCKS4 and SOCKS5 proxies with and without authentication. Additionally, it includes functionality to copy working proxies between different projects.

## Project Structure

```
.
├── src/
│   ├── python/
│   │   ├── proxy_checker.py
│   │   ├── copy_proxies.py
│   │   ├── download_proxies.py
│   │   └── config_editor.py
│   └── javascript/
│       ├── proxy_checker.js
│       ├── copy_proxies.js
│       ├── download_proxies.js
│       └── config_editor.js
├── config/
│   ├── proxy_config.json
│   └── config.json
├── data/
│   ├── proxy.txt
│   └── working_proxies.txt
├── deps/
│   ├── package.json
│   ├── package-lock.json
│   └── requirements.txt
├── scripts/
│   ├── run.sh
│   └── run.bat
└── docs/
    ├── README.md
    └── LICENSE
```

## Versions

The program is available in two versions:

-   Python (`src/python/proxy_checker.py`, `src/python/copy_proxies.py`)
-   JavaScript (`src/javascript/proxy_checker.js`, `src/javascript/copy_proxies.js`)

Both versions use the same configuration files: `config/config.json` for proxy checking and `config/proxy_config.json` for proxy copying.

## Requirements

### For the Python version:

-   Python 3.7+
-   Installed packages: aiohttp, aiofiles, aiohttp_socks

Installation of dependencies:

```bash
pip install aiohttp aiofiles aiohttp_socks requests
```

or

```bash
pip install -r requirements.txt
```

### For the JavaScript version:

-   Node.js 18+
-   Installed packages: node-fetch, https-proxy-agent, socks-proxy-agent

Installation of dependencies:

```bash
npm install
```

## Performance Optimizations

The program includes several optimizations for faster proxy checking:

-   Uses HEAD requests instead of GET
-   Supports up to 50 concurrent checks
-   Implements timeout control (configurable, 5 seconds by default)
-   Uses random testing URL from configurable list
-   Includes detailed status logging for each proxy
-   Measures proxy response speed and categorizes by performance
-   Filters proxies based on speed requirements
-   Implements retry mechanism for potentially working proxies (configurable)
-   Visual progress bar for better monitoring

## Configuration Settings

Default configuration (`config/config.json`):

```json
{
    "proxy_url": "https://raw.githubusercontent.com/monosans/proxy-list/refs/heads/main/proxies/all.txt",
    "proxy_file": "proxy.txt",
    "output_file": "working_proxies.txt",
    "test_urls": [
        "https://www.google.com",
        "https://www.cloudflare.com",
        "https://www.microsoft.com",
        "https://www.amazon.com",
        "https://www.github.com"
    ],
    "timeout": 5,
    "concurrent_checks": 10,
    "save_to_input_file": true,
    "retry_count": 1,
    "speed_filter": {
        "enabled": false,
        "max_speed": 1000,
        "min_speed": 0
    }
}
```

To edit the configuration, run:

```bash
python src/python/config_editor.py
```

or for the JavaScript version:

```bash
node src/javascript/config_editor.js
```

## Usage

### Quick Start

For easy startup, you can use the run scripts:

#### Windows

```bash
run.bat
```

or just double-click on `run.bat`

#### Linux/MacOS

```bash
chmod +x run.sh  # Only needed first time
./run.sh
```

#### Using npm scripts (JavaScript version only)

If you prefer using npm scripts, you can use the following commands:

```bash
cd deps
npm install
npm run start    # Run proxy checker
npm run config   # Edit configuration
npm run download # Download proxies
npm run copy     # Copy proxies between projects
```

These scripts will:

1. Ask you to choose between Python and JavaScript versions
2. Install all necessary dependencies
3. Run the selected version of the program

### Preparation of the proxy file

Create a file `proxy.txt` (or specify another file in the configuration) with proxies. The following formats are supported:

1. With protocol and authentication:

```
http://username:password@ip:port
https://username:password@ip:port
socks4://username:password@ip:port
socks5://username:password@ip:port
```

2. Without protocol, but with authentication:

```
username:password@ip:port
```

3. In the format IP:PORT:USERNAME:PASSWORD:

```
ip:port:username:password
```

4. Standard format without authentication:

```
http://ip:port
https://ip:port
socks4://ip:port
socks5://ip:port
```

### Configuration settings

To edit the configuration, run:

```bash
python src/python/config_editor.py
```

or for the JavaScript version:

```bash
node src/javascript/config_editor.js
```

### Manual Start

To run the proxy check manually, execute:

```bash
python src/python/proxy_checker.py
```

or for the JavaScript version:

```bash
node src/javascript/proxy_checker.js
```

You can also specify the path to the configuration file:

```bash
python src/python/proxy_checker.py -c config/my_config.json
```

or

```bash
node src/javascript/proxy_checker.js -c config/my_config.json
```

## Output and Status Indicators

The program uses the following indicators:

-   Working: `proxy_url | Speed: Xms (fast/medium/slow) | Success: X%`
-   Failed: Proxy is not working
-   Timeout: Proxy did not respond in time
-   Filtered: Proxy speed is outside configured range
-   Retry: Proxy will be retried once
-   Visual progress bar showing completion percentage

### Speed Categories

Proxies are automatically categorized by speed:
- Fast: < 500ms
- Medium: 500ms - 1000ms
- Slow: > 1000ms

### Output Files

The program generates two output files:
1. A text file with proxy strings (e.g., `working_proxies.txt`)
2. A JSON file with detailed information about each proxy including speed, success rate, and category (e.g., `working_proxies.json`)

## Retry Mechanism

You can configure how many times failed proxies should be retried using the `retry_count` parameter:

```json
"retry_count": 2
```

Setting this to:
- `0`: No retries, proxies that fail once are discarded
- `1`: Retry once (default)
- `2` or higher: Retry multiple times before discarding

This is useful for proxies that may fail due to temporary network issues.

## Speed Filtering

You can filter proxies based on their response speed by configuring the speed filter:

```json
"speed_filter": {
    "enabled": true,
    "max_speed": 800,
    "min_speed": 0
}
```

- `enabled`: Whether to filter by speed (true/false)
- `max_speed`: Maximum acceptable speed in milliseconds
- `min_speed`: Minimum acceptable speed in milliseconds

For example, to keep only fast proxies, set `max_speed` to 500.

## Project structure

-   `proxy_checker.py` - main script for checking proxies (Python version)
-   `proxy_checker.js` - main script for checking proxies (JavaScript version)
-   `copy_proxies.py` - script for copying proxies between projects (Python version)
-   `copy_proxies.js` - script for copying proxies between projects (JavaScript version)
-   `config_editor.py` - utility for editing the configuration (Python version)
-   `config_editor.js` - utility for editing the configuration (JavaScript version)
-   `config.json` - configuration file for proxy checking
-   `proxy_config.json` - configuration file for proxy copying
-   `proxy.txt` - file with proxies for checking
-   `working_proxies.txt` - file with working proxies (result of the program)
-   `requirements.txt` - file with dependencies for Python version
-   `package.json` - file with dependencies for JavaScript version
-   `run.bat` - startup script for Windows
-   `run.sh` - startup script for Linux/MacOS

## Proxy Copying Feature

The program includes functionality to copy proxy files between different projects. This is useful when you need to maintain the same proxy list across multiple projects.

### Configuration

Create a `proxy_config.json` file with the following structure:

```json
{
    "source_proxy": "path/to/source/proxy/file",
    "project_paths": ["path/to/project1/proxy.txt", "path/to/project2/proxy.txt", "path/to/project3/proxy.txt"]
}
```

### Usage

To copy proxies between projects, run:

```bash
python src/python/copy_proxies.py
```

or for the JavaScript version:

```bash
node src/javascript/copy_proxies.js
```

The script will:

1. Read the configuration from `proxy_config.json`
2. Check if the source proxy file exists
3. Copy the file to all specified project paths
4. Skip any non-existent paths
5. Provide detailed logging of the copying process
