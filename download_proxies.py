import requests
import asyncio
import sys
import json
import argparse

DEFAULT_CONFIG_FILE = "config.json"


def parse_args():
    parser = argparse.ArgumentParser(description="Download and check proxies")
    parser.add_argument(
        "-c",
        "--config",
        default=DEFAULT_CONFIG_FILE,
        help=f"Path to the configuration file (default: {DEFAULT_CONFIG_FILE})",
    )
    return parser.parse_args()


def load_config(config_file):
    try:
        with open(config_file, "r") as file:
            config = json.load(file)
            return config
    except Exception as e:
        print(f"Error loading config file: {e}")
        return {
            "proxy_url": "https://raw.githubusercontent.com/monosans/proxy-list/refs/heads/main/proxies/all.txt",
            "proxy_file": "proxy.txt",
            "output_file": "working_proxies.txt",
            "test_url": "http://httpbin.org/status/200",
            "timeout": 3,
            "concurrent_checks": 50,
            "save_to_input_file": True,
        }


def download_and_save_proxies(config):
    try:
        response = requests.get(config["proxy_url"])
        response.raise_for_status()
        proxies = response.text.strip().split("\n")

        with open(config["proxy_file"], "w") as f:
            f.write("\n".join(proxies))

        print(
            f"✅ Successfully downloaded {len(proxies)} proxies to {config['proxy_file']}"
        )
        return True
    except Exception as e:
        print(f"❌ Error downloading proxies: {e}")
        return False


def run_proxy_checker():
    if sys.platform.startswith("win"):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    try:
        from proxy_checker import main

        asyncio.run(main())
    except Exception as e:
        print(f"❌ Error running proxy checker: {e}")


if __name__ == "__main__":
    args = parse_args()
    config = load_config(args.config)

    print(f"Using configuration from: {args.config}")
    print(f"Proxy URL: {config['proxy_url']}")
    print(f"Proxy file: {config['proxy_file']}")

    if download_and_save_proxies(config):
        print("\nStarting the proxy check...")
        run_proxy_checker()
