# Proxy Checker

A tool for checking proxy server performance.

## Description

This program checks the list of proxy servers for functionality and saves working proxies to a separate file. It supports HTTP, HTTPS, SOCKS4 and SOCKS5 proxies with and without authentication.

## Versions

The program is available in two versions:

-   Python (proxy_checker.py)
-   JavaScript (proxy_checker.js)

Both versions use the same configuration file `config.json`.

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

-   Node.js 12+
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

Default configuration (`config.json`):

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
python config_editor.py
```

or for the JavaScript version:

```bash
node config_editor.js
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

```
python config_editor.py
```

or for the JavaScript version:

```
node config_editor.js
```

### Manual Start

To run the proxy check manually, execute:

```bash
python proxy_checker.py
```

or for the JavaScript version:

```bash
node proxy_checker.js
```

You can also specify the path to the configuration file:

```bash
python proxy_checker.py -c my_config.json
```

or

```bash
node proxy_checker.js -c my_config.json
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
-   `config_editor.py` - utility for editing the configuration (Python version)
-   `config_editor.js` - utility for editing the configuration (JavaScript version)
-   `config.json` - configuration file
-   `proxy.txt` - file with proxies for checking
-   `working_proxies.txt` - file with working proxies (result of the program)
-   `requirements.txt` - file with dependencies for Python version
-   `package.json` - file with dependencies for JavaScript version
-   `run.bat` - startup script for Windows
-   `run.sh` - startup script for Linux/MacOS
