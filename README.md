# Proxy Checker

A tool for checking proxy server performance.

## Description.

This program checks the list of proxy servers for functionality and saves working proxies to a separate file. HTTP, HTTPS, SOCKS4 and SOCKS5 proxies are supported.

## Versions

The program is available in two versions:

- Python (proxy_checker.py)
- JavaScript (proxy_checker.js)

Both versions use the same configuration file `config.json`.

## Requirements

### For the Python version:

-   Python 3.7+
-   Installed packages: aiohttp, aiofiles, aiohttp_socks

Installation of dependencies:

```
pip install aiohttp aiofiles aiohttp_socks
```

or

```
pip install -r requirements.txt
```

### For the JavaScript version:

-   Node.js 12+
-   Installed packages: socks

Installation of dependencies:

```
npm install socks
```

## Usage

### Preparation of the proxy file

Create a file `proxy.txt` (or specify another file in the configuration) with proxies in the format:

```
http://ip:port
https://ip:port
socks4://ip:port
socks5://ip:port
```

### Configuration setup

To edit the configuration, run:

```
python config_editor.py
```

or for the JavaScript version:

```
node config_editor.js
```

You can also specify the path to the configuration file:

```
python config_editor.py -c my_config.json
```

or

```
node config_editor.js -c my_config.json
```

Configuration parameters:

-   `proxy_file` - path to the proxy file
-   `output_file` - path to the file for saving working proxies
-   `test_url` - URL for testing proxies
-   `timeout` - timeout in seconds for checking proxies
-   `concurrent_checks` - number of concurrent checks
-   `save_to_input_file` - whether to save working proxies back to the input file (true/false)

### Running proxy check

To run the proxy check, execute:

```
python proxy_checker.py
```

or for the JavaScript version:

```
node proxy_checker.js
```

You can also specify the path to the configuration file:

```
python proxy_checker.py -c my_config.json
```

or

```
node proxy_checker.js -c my_config.json
```

## Project structure

-   `proxy_checker.py` - main script for checking proxies (Python version)
-   `proxy_checker.js` - main script for checking proxies (JavaScript version)
-   `config_editor.py` - utility for editing the configuration (Python version)
-   `config_editor.js` - utility for editing the configuration (JavaScript version)
-   `config.json` - configuration file
-   `proxy.txt` - file with proxies for checking
-   `working_proxies.txt` - file with working proxies (result of the program)
-   `requirements.txt` - file with dependencies for the Python version
