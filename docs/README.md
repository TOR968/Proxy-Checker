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
-   Implements timeout control (3 seconds by default)
-   Uses lightweight test URL (httpbin.org/status/200)
-   Includes detailed status logging for each proxy

## Configuration Settings

Default configuration (`config/config.json`):

```json
{
    "proxy_file": "proxy.txt",
    "output_file": "working_proxies.txt",
    "test_url": "http://httpbin.org/status/200",
    "timeout": 3,
    "concurrent_checks": 50,
    "save_to_input_file": false
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

## Status Indicators

The program uses the following indicators:

-   ✅ Working: Proxy is working
-   ❌ Failed: Proxy is not working
-   ❌ Timeout: Proxy did not respond in time
-   Progress percentage is shown every 10 proxies

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
