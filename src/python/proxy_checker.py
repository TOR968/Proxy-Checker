import sys
import asyncio
import aiohttp
import aiofiles
import json
import argparse
import os
from aiohttp_socks import ProxyConnector, ProxyType
from asyncio import Semaphore

DEFAULT_CONFIG_FILE = os.path.join("config", "config.json")


def parse_args():
    parser = argparse.ArgumentParser(description="Proxy Checker - checking the proxy")
    parser.add_argument(
        "-c",
        "--config",
        default=DEFAULT_CONFIG_FILE,
        help=f"Path to the configuration file (default: {DEFAULT_CONFIG_FILE})",
    )
    return parser.parse_args()


def get_project_root():
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def get_file_path(relative_path):
    return os.path.join(get_project_root(), relative_path)


def load_config(config_file):
    try:
        config_path = get_file_path(config_file)
        with open(config_path, "r") as file:
            return json.load(file)
    except Exception as e:
        print(f"Error loading config file: {e}")
        return {
            "proxy_file": os.path.join("data", "proxy.txt"),
            "output_file": os.path.join("data", "working_proxies.txt"),
            "test_url": "http://httpbin.org/status/200",
            "timeout": 3,
            "concurrent_checks": 50,
            "save_to_input_file": False,
        }


def save_config(config_data, config_file):
    try:
        config_path = get_file_path(config_file)
        with open(config_path, "w") as file:
            json.dump(config_data, file, indent=4)
        print(f"Configuration saved to {config_file}")
        return True
    except Exception as e:
        print(f"Error saving config file: {e}")
        return False


args = parse_args()
CONFIG_FILE = args.config

config = load_config(CONFIG_FILE)
PROXY_FILE = os.path.join("data", os.path.basename(config["proxy_file"]))
OUTPUT_FILE = os.path.join("data", os.path.basename(config["output_file"]))
TEST_URL = config["test_url"]
TIMEOUT = config["timeout"]
CONCURRENT_CHECKS = config["concurrent_checks"]
SAVE_TO_INPUT_FILE = config.get("save_to_input_file", False)

data_dir = os.path.join(get_project_root(), "data")
if not os.path.exists(data_dir):
    os.makedirs(data_dir)


def read_proxies_from_file(file_path):
    try:
        full_path = get_file_path(file_path)
        with open(full_path, "r") as file:
            return [line.strip() for line in file if line.strip()]
    except Exception as e:
        print(f"Error reading file: {e}")
        return []


def parse_proxy_string(proxy_str):
    """Parse proxy string in different formats"""
    protocol = "http"
    username = None
    password = None
    host = None
    port = None

    if "://" in proxy_str:
        protocol, proxy_str = proxy_str.split("://", 1)

    if "@" in proxy_str:
        auth, hostport = proxy_str.rsplit("@", 1)
        username, password = auth.split(":", 1)
        host, port = hostport.split(":", 1)
    else:
        parts = proxy_str.split(":")
        if len(parts) == 4:
            host, port, username, password = parts
        else:
            host, port = parts[0:2]

    return {
        "protocol": protocol.lower(),
        "host": host,
        "port": int(port),
        "username": username,
        "password": password,
    }


async def check_proxy(proxy_str):
    try:
        proxy_info = parse_proxy_string(proxy_str)
        protocol = proxy_info["protocol"]
        host = proxy_info["host"]
        port = proxy_info["port"]
        username = proxy_info["username"]
        password = proxy_info["password"]

        proxy_auth = f"{username}:{password}@" if username and password else ""
        proxy_url = f"{protocol}://{proxy_auth}{host}:{port}"

        if protocol in ["http", "https"]:
            connector = ProxyConnector.from_url(proxy_url)
        elif protocol == "socks4":
            connector = ProxyConnector(
                proxy_type=ProxyType.SOCKS4,
                host=host,
                port=port,
                username=username,
                password=password,
            )
        elif protocol == "socks5":
            connector = ProxyConnector(
                proxy_type=ProxyType.SOCKS5,
                host=host,
                port=port,
                username=username,
                password=password,
            )
        else:
            return False

        timeout = aiohttp.ClientTimeout(total=TIMEOUT)
        async with aiohttp.ClientSession(
            connector=connector, timeout=timeout
        ) as session:
            async with session.head(TEST_URL) as response:
                return response.status >= 200 and response.status < 300

    except Exception as e:
        return False


async def process_proxies(proxies):
    sem = Semaphore(CONCURRENT_CHECKS)
    working_proxies = []
    total_proxies = len(proxies)
    processed_count = 0

    async def check_with_sem(proxy):
        async with sem:
            try:
                result = await asyncio.wait_for(check_proxy(proxy), timeout=TIMEOUT * 2)
                return result
            except asyncio.TimeoutError:
                return "timeout"
            except Exception:
                return False

    print(f"Starting proxy check of {total_proxies} proxies...")

    tasks = [check_with_sem(proxy) for proxy in proxies]

    batch_size = CONCURRENT_CHECKS * 2
    for i in range(0, len(tasks), batch_size):
        batch = tasks[i : i + batch_size]
        results = await asyncio.gather(*batch, return_exceptions=True)

        for j, result in enumerate(results):
            proxy = proxies[i + j]
            processed_count += 1

            if processed_count % 10 == 0 or processed_count == total_proxies:
                print(
                    f"Progress: {processed_count}/{total_proxies} ({round(processed_count / total_proxies * 100)}%)"
                )

            if isinstance(result, bool) and result:
                print(f"✅ Working: {proxy}")
                working_proxies.append(proxy)
            elif result == "timeout":
                print(f"❌ Timeout: {proxy}")
            else:
                print(f"❌ Failed: {proxy}")

    return working_proxies


async def save_working_proxies(proxies, file_path):
    try:
        full_path = get_file_path(file_path)
        async with aiofiles.open(full_path, "w") as file:
            await file.write("\n".join(proxies))
        print(f"Saved {len(proxies)} working proxies to file {file_path}")
    except Exception as e:
        print(f"Error saving file: {e}")


async def main():
    print("Starting proxy check...")
    print(f"Using configuration from {CONFIG_FILE}")
    print(f"Proxy file: {PROXY_FILE}")
    print(f"Output file: {OUTPUT_FILE}")
    print(f"Test URL: {TEST_URL}")
    print(f"Timeout: {TIMEOUT} seconds")
    print(f"Concurrent checks: {CONCURRENT_CHECKS}")
    print(f"Save to input file: {SAVE_TO_INPUT_FILE}")

    proxies = read_proxies_from_file(PROXY_FILE)
    print(f"Loaded {len(proxies)} proxies from file {PROXY_FILE}")

    if not proxies:
        print("No proxies found for checking.")
        return

    working_proxies = await process_proxies(proxies)

    print("\nResults of the check:")
    print(f"Total proxies: {len(proxies)}")
    print(f"Working proxies: {len(working_proxies)}")
    print(f"Not working proxies: {len(proxies) - len(working_proxies)}")

    if SAVE_TO_INPUT_FILE:
        print(f"Saving working proxies back to input file {PROXY_FILE}")
        await save_working_proxies(working_proxies, PROXY_FILE)
    else:
        print("Not saving to input file (disabled in config)")
        await save_working_proxies(working_proxies, OUTPUT_FILE)


if __name__ == "__main__":
    if sys.platform.startswith("win"):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
