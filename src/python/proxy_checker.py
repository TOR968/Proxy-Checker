import sys
import asyncio
import aiohttp
import aiofiles
import json
import argparse
import os
import random
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
            "test_urls": [
                "https://www.google.com",
                "https://www.cloudflare.com",
                "https://www.microsoft.com",
                "https://www.amazon.com",
                "https://www.github.com",
            ],
            "timeout": 3,
            "concurrent_checks": 50,
            "save_to_input_file": False,
            "retry_count": 1,
            "speed_filter": {
                "enabled": False,
                "max_speed": 1000,
                "min_speed": 0,
            },
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
TEST_URLS = config.get("test_urls", ["https://www.google.com"])
TIMEOUT = config["timeout"]
CONCURRENT_CHECKS = config["concurrent_checks"]
SAVE_TO_INPUT_FILE = config.get("save_to_input_file", False)
RETRY_COUNT = config.get("retry_count", 1)
SPEED_FILTER = config.get(
    "speed_filter", {"enabled": False, "max_speed": 1000, "min_speed": 0}
)

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


def validate_proxy_string(proxy_str):
    """Validate proxy string format"""
    try:
        if "://" in proxy_str:
            protocol, rest = proxy_str.split("://", 1)
            if protocol.lower() not in ["http", "https", "socks4", "socks5"]:
                return False

        parts = proxy_str.split(":")
        if "@" in proxy_str:
            if proxy_str.count(":") < 2 or proxy_str.count("@") != 1:
                return False
        else:
            if len(parts) < 2:
                return False

            try:
                port = int(parts[-1].split("@")[0] if "@" in parts[-1] else parts[-1])
                if not (0 < port < 65536):
                    return False
            except ValueError:
                return False

        return True
    except Exception:
        return False


async def check_proxy(proxy_str):
    try:
        if not validate_proxy_string(proxy_str):
            print(f"❌ Invalid format: {proxy_str}")
            return {
                "working": False,
                "success_rate": 0,
                "speed": None,
                "proxy": proxy_str,
            }

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
            print(f"❌ Failed: {proxy_str} (Unsupported protocol: {protocol})")
            return {
                "working": False,
                "success_rate": 0,
                "speed": None,
                "proxy": proxy_str,
            }

        test_url = random.choice(TEST_URLS)

        timeout_obj = aiohttp.ClientTimeout(total=TIMEOUT)

        try:
            start_time = asyncio.get_event_loop().time()
            async with aiohttp.ClientSession(
                connector=connector, timeout=timeout_obj
            ) as session:
                async with session.head(test_url) as response:
                    end_time = asyncio.get_event_loop().time()
                    response_time = (end_time - start_time) * 1000

                    working = 200 <= response.status < 300

                    return {
                        "working": working,
                        "success_rate": 1.0 if working else 0.0,
                        "speed": int(response_time) if working else None,
                        "proxy": proxy_str,
                    }
        except Exception as e:
            return {
                "working": False,
                "success_rate": 0,
                "speed": None,
                "proxy": proxy_str,
            }

    except asyncio.TimeoutError:
        return {"working": False, "success_rate": 0, "speed": None, "proxy": proxy_str}
    except Exception as e:
        return {
            "working": False,
            "success_rate": 0,
            "speed": None,
            "proxy": proxy_str,
            "error": str(e),
        }


def categorize_speed(speed):
    """Categorize proxy by speed"""
    if speed is None:
        return "unknown"
    if speed < 500:
        return "fast"
    if speed < 1000:
        return "medium"
    return "slow"


async def process_proxies(proxies):
    sem = Semaphore(CONCURRENT_CHECKS)
    working_proxies = []
    total_proxies = len(proxies)
    processed_count = 0
    MAX_RETRIES = RETRY_COUNT

    retry_map = {}

    def draw_progress_bar(current, total, bar_length=30):
        progress = int(round(bar_length * current / total))
        bar = "█" * progress + "░" * (bar_length - progress)
        percent = round((current / total) * 100)
        return f"[{bar}] {current}/{total} ({percent}%)"

    async def check_with_sem(proxy, retry_count=0):
        nonlocal processed_count

        async with sem:
            try:
                result = await asyncio.wait_for(check_proxy(proxy), timeout=TIMEOUT * 2)

                processed_count += 1
                if processed_count % 5 == 0 or processed_count == total_proxies:
                    progress_bar = draw_progress_bar(processed_count, total_proxies)
                    print(progress_bar)

                if result["working"]:
                    if SPEED_FILTER["enabled"] and result["speed"] is not None:
                        if (
                            result["speed"] < SPEED_FILTER["min_speed"]
                            or result["speed"] > SPEED_FILTER["max_speed"]
                        ):
                            print(
                                f"❌ Filtered: {proxy} | Speed: {result['speed']}ms (outside range {SPEED_FILTER['min_speed']}-{SPEED_FILTER['max_speed']}ms)"
                            )
                            return False

                    speed = result.get("speed")
                    category = categorize_speed(speed)
                    success_percent = round(result["success_rate"] * 100)

                    print(
                        f"✅ Working: {proxy} | Speed: {speed or 'N/A'}ms ({category}) | Success: {success_percent}%"
                    )

                    result["category"] = category
                    working_proxies.append(result)
                    return True
                elif retry_count < MAX_RETRIES:
                    print(f"⚠️ Retry ({retry_count + 1}/{MAX_RETRIES}): {proxy}")
                    retry_map[proxy] = retry_count + 1
                    return False
                else:
                    print(f"❌ Failed: {proxy}")
                    return False

            except asyncio.TimeoutError:
                processed_count += 1
                print(f"❌ Timeout: {proxy}")
                return False
            except Exception as e:
                processed_count += 1
                print(f"❌ Error: {proxy} - {e}")
                return False

    print(f"Starting proxy check of {total_proxies} proxies...")

    batch_size = CONCURRENT_CHECKS * 2
    for i in range(0, len(proxies), batch_size):
        batch = proxies[i : i + batch_size]
        tasks = [check_with_sem(proxy) for proxy in batch]
        await asyncio.gather(*tasks, return_exceptions=True)

    retry_proxies = [
        proxy for proxy, count in retry_map.items() if count <= MAX_RETRIES
    ]

    if retry_proxies:
        print(f"\nRetrying {len(retry_proxies)} proxies...")
        retry_tasks = [
            check_with_sem(proxy, retry_map[proxy]) for proxy in retry_proxies
        ]
        await asyncio.gather(*retry_tasks, return_exceptions=True)

    return {
        "proxy_strings": [p["proxy"] for p in working_proxies],
        "proxy_objects": working_proxies,
    }


async def save_working_proxies(proxies, file_path):
    try:
        full_path = get_file_path(file_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        async with aiofiles.open(full_path, "w") as file:
            await file.write("\n".join(proxies["proxy_strings"]))

        json_path = os.path.splitext(full_path)[0] + ".json"
        async with aiofiles.open(json_path, "w") as json_file:
            await json_file.write(json.dumps(proxies["proxy_objects"], indent=2))

        print(
            f"✅ Saved {len(proxies['proxy_strings'])} working proxies to {file_path}"
        )
        print(f"✅ Saved detailed proxy data to {os.path.basename(json_path)}")
    except Exception as e:
        print(f"Error saving file: {e}")


async def main():
    print("Starting proxy check...")
    print(f"Using configuration from {CONFIG_FILE}")
    print(f"Proxy file: {PROXY_FILE}")
    print(f"Output file: {OUTPUT_FILE}")
    print(f"Test URLs: {', '.join(TEST_URLS)}")
    print(f"Timeout: {TIMEOUT} seconds")
    print(f"Concurrent checks: {CONCURRENT_CHECKS}")
    print(f"Save to input file: {SAVE_TO_INPUT_FILE}")
    print(f"Retry count: {RETRY_COUNT}")

    if SPEED_FILTER["enabled"]:
        print(
            f"Speed filter: Enabled ({SPEED_FILTER['min_speed']}ms - {SPEED_FILTER['max_speed']}ms)"
        )
    else:
        print(f"Speed filter: Disabled")

    proxies = read_proxies_from_file(PROXY_FILE)
    print(f"Loaded {len(proxies)} proxies from file {PROXY_FILE}")

    if not proxies:
        print("No proxies found for checking.")
        return

    working_proxies = await process_proxies(proxies)

    print("\nResults of the check:")
    print(f"Total proxies: {len(proxies)}")
    print(f"Working proxies: {len(working_proxies['proxy_strings'])}")
    print(
        f"Not working proxies: {len(proxies) - len(working_proxies['proxy_strings'])}"
    )

    categories = {}
    for proxy in working_proxies["proxy_objects"]:
        category = proxy.get("category", "unknown")
        categories[category] = categories.get(category, 0) + 1

    print("\nProxy Speed Categories:")
    for category, count in categories.items():
        print(f"- {category}: {count} proxies")

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
