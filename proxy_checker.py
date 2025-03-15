import os
import sys
import time
import asyncio
import aiohttp
import aiofiles
import json
import argparse
from urllib.parse import urlparse
from aiohttp_socks import ProxyConnector, ProxyType

DEFAULT_CONFIG_FILE = 'config.json'

def parse_args():
    parser = argparse.ArgumentParser(description='Proxy Checker - checking the proxy')
    parser.add_argument('-c', '--config', default=DEFAULT_CONFIG_FILE, 
                        help=f'Path to the configuration file (default: {DEFAULT_CONFIG_FILE})')
    return parser.parse_args()

def load_config(config_file):
    try:
        with open(config_file, 'r') as file:
            return json.load(file)
    except Exception as e:
        print(f"Error loading config file: {e}")
        return {
            "proxy_file": "proxy.txt",
            "output_file": "working_proxies.txt",
            "test_url": "http://www.google.com",
            "timeout": 5,
            "concurrent_checks": 20,
            "save_to_input_file": False
        }

def save_config(config_data, config_file):
    try:
        with open(config_file, 'w') as file:
            json.dump(config_data, file, indent=4)
        print(f"Configuration saved to {config_file}")
        return True
    except Exception as e:
        print(f"Error saving config file: {e}")
        return False

args = parse_args()
CONFIG_FILE = args.config

config = load_config(CONFIG_FILE)
PROXY_FILE = config["proxy_file"]
OUTPUT_FILE = config["output_file"]
TEST_URL = config["test_url"]
TIMEOUT = config["timeout"]
CONCURRENT_CHECKS = config["concurrent_checks"]
SAVE_TO_INPUT_FILE = config.get("save_to_input_file", False)

def read_proxies_from_file(file_path):
    try:
        with open(file_path, 'r') as file:
            return [line.strip() for line in file if line.strip()]
    except Exception as e:
        print(f"Error reading file: {e}")
        return []

async def check_proxy(proxy_url):
    try:
        parsed = urlparse(proxy_url)
        proxy_type = parsed.scheme
        host = parsed.hostname
        port = parsed.port
        
        if proxy_type == 'http' or proxy_type == 'https':
            connector = ProxyConnector.from_url(proxy_url)
        elif proxy_type == 'socks4':
            connector = ProxyConnector(
                proxy_type=ProxyType.SOCKS4,
                host=host,
                port=port
            )
        elif proxy_type == 'socks5':
            connector = ProxyConnector(
                proxy_type=ProxyType.SOCKS5,
                host=host,
                port=port
            )
        else:
            connector = ProxyConnector.from_url("http://" + proxy_url)
        
        timeout = aiohttp.ClientTimeout(total=TIMEOUT)
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            async with session.get(TEST_URL) as response:
                return response.status >= 200 and response.status < 300
    except:
        return False

async def process_proxies(proxies):
    working_proxies = []
    total_proxies = len(proxies)
    processed_count = 0
    
    print(f"Starting proxy check of {total_proxies} proxies...")
    
    for i in range(0, total_proxies, CONCURRENT_CHECKS):
        batch = proxies[i:i + CONCURRENT_CHECKS]
        tasks = [check_proxy(proxy) for proxy in batch]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for j, result in enumerate(results):
            proxy = batch[j]
            is_working = isinstance(result, bool) and result
            
            processed_count += 1
            
            if processed_count % 10 == 0 or processed_count == total_proxies:
                print(f"Progress: {processed_count}/{total_proxies} ({round(processed_count/total_proxies*100)}%)")
            
            if is_working:
                print(f"✅ It works: {proxy}")
                working_proxies.append(proxy)
            else:
                print(f"❌ Not working: {proxy}")
    
    return working_proxies

async def save_working_proxies(proxies, file_path):
    try:
        async with aiofiles.open(file_path, 'w') as file:
            await file.write('\n'.join(proxies))
        print(f"Saved {len(proxies)} working proxies to file {file_path}")
    except Exception as e:
        print(f"Error saving file: {e}")

async def main():
    print('Starting proxy check...')
    print(f'Using configuration from {CONFIG_FILE}')
    print(f'Proxy file: {PROXY_FILE}')
    print(f'Output file: {OUTPUT_FILE}')
    print(f'Test URL: {TEST_URL}')
    print(f'Timeout: {TIMEOUT} seconds')
    print(f'Concurrent checks: {CONCURRENT_CHECKS}')
    print(f'Save to input file: {SAVE_TO_INPUT_FILE}')
    
    proxies = read_proxies_from_file(PROXY_FILE)
    print(f"Loaded {len(proxies)} proxies from file {PROXY_FILE}")
    
    if not proxies:
        print('No proxies found for checking.')
        return
    
    working_proxies = await process_proxies(proxies)
    
    print(f"\nResults of the check:")
    print(f"Total proxies: {len(proxies)}")
    print(f"Working proxies: {len(working_proxies)}")
    print(f"Not working proxies: {len(proxies) - len(working_proxies)}")
    
    await save_working_proxies(working_proxies, OUTPUT_FILE)
    
    if SAVE_TO_INPUT_FILE:
        print(f"Saving working proxies back to input file {PROXY_FILE}")
        await save_working_proxies(working_proxies, PROXY_FILE)
    else:
        print(f"Not saving to input file (disabled in config)")

if __name__ == "__main__":
    if sys.platform.startswith('win'):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main()) 