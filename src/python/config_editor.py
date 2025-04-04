import json
import os
import argparse

DEFAULT_CONFIG_FILE = os.path.join("config", "config.json")


def get_project_root():
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def get_file_path(relative_path):
    return os.path.join(get_project_root(), relative_path)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Configuration editor for Proxy Checker"
    )
    parser.add_argument(
        "-c",
        "--config",
        default=DEFAULT_CONFIG_FILE,
        help=f"Path to the configuration file (default: {DEFAULT_CONFIG_FILE})",
    )
    return parser.parse_args()


def load_config(config_file):
    try:
        config_path = get_file_path(config_file)
        with open(config_path, "r") as file:
            return json.load(file)
    except Exception as e:
        print(f"Error loading config file: {e}")
        return {
            "proxy_url": "https://raw.githubusercontent.com/monosans/proxy-list/refs/heads/main/proxies/all.txt",
            "proxy_file": os.path.join("data", "proxy.txt"),
            "output_file": os.path.join("data", "working_proxies.txt"),
            "test_urls": [
                "https://www.google.com",
                "https://www.cloudflare.com",
                "https://www.microsoft.com",
                "https://www.amazon.com",
                "https://www.github.com",
            ],
            "timeout": 5,
            "concurrent_checks": 20,
            "save_to_input_file": False,
            "retry_count": 1,
            "speed_filter": {"enabled": False, "max_speed": 1000, "min_speed": 0},
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


def display_config(config):
    print("\nCurrent configuration:")
    print("-" * 30)
    for key, value in config.items():
        print(f"{key}: {value}")
    print("-" * 30)


def edit_config(config_file):
    config = load_config(config_file)
    display_config(config)

    print("\nEditing configuration:")
    print("Leave the field empty to keep the current value")

    config["proxy_url"] = input(
        f"Proxy URL [{config.get('proxy_url', '')}]: "
    ) or config.get("proxy_url", "")
    config["proxy_file"] = (
        input(f"Proxy file [{config['proxy_file']}]: ") or config["proxy_file"]
    )
    config["output_file"] = (
        input(f"Output file [{config['output_file']}]: ") or config["output_file"]
    )

    test_urls_input = input(
        f"Test URLs (comma-separated) [{', '.join(config.get('test_urls', []))}]: "
    )
    if test_urls_input:
        config["test_urls"] = [url.strip() for url in test_urls_input.split(",")]

    try:
        timeout_input = input(f"Timeout in seconds [{config['timeout']}]: ")
        if timeout_input:
            config["timeout"] = int(timeout_input)
    except ValueError:
        print("Invalid timeout format. Using the previous value.")

    try:
        concurrent_input = input(
            f"Number of concurrent checks [{config['concurrent_checks']}]: "
        )
        if concurrent_input:
            config["concurrent_checks"] = int(concurrent_input)
    except ValueError:
        print("Invalid number format. Using the previous value.")

    try:
        retry_input = input(
            f"Number of retries for failed proxies [{config.get('retry_count', 1)}]: "
        )
        if retry_input:
            config["retry_count"] = int(retry_input)
    except ValueError:
        print("Invalid number format. Using the previous value.")

    save_to_input_file = config.get("save_to_input_file", False)
    save_input = input(
        f"Save working proxies to input file (y/n) [{('y' if save_to_input_file else 'n')}]: "
    )
    if save_input.lower() in ["y", "yes"]:
        config["save_to_input_file"] = True
    elif save_input.lower() in ["n", "no"]:
        config["save_to_input_file"] = False

    if "speed_filter" not in config:
        config["speed_filter"] = {"enabled": False, "max_speed": 1000, "min_speed": 0}

    speed_filter = config["speed_filter"]
    print("\nSpeed Filter Configuration:")

    enable_filter = input(
        f"Enable speed filter (y/n) [{('y' if speed_filter.get('enabled', False) else 'n')}]: "
    )
    if enable_filter.lower() in ["y", "yes"]:
        speed_filter["enabled"] = True

        try:
            min_speed = input(
                f"Minimum acceptable speed in ms [{speed_filter.get('min_speed', 0)}]: "
            )
            if min_speed:
                speed_filter["min_speed"] = int(min_speed)
        except ValueError:
            print("Invalid speed format. Using the previous value.")

        try:
            max_speed = input(
                f"Maximum acceptable speed in ms [{speed_filter.get('max_speed', 1000)}]: "
            )
            if max_speed:
                speed_filter["max_speed"] = int(max_speed)
        except ValueError:
            print("Invalid speed format. Using the previous value.")
    elif enable_filter.lower() in ["n", "no"]:
        speed_filter["enabled"] = False

    config["speed_filter"] = speed_filter

    if save_config(config, config_file):
        print("Configuration successfully updated!")
        display_config(config)


if __name__ == "__main__":
    args = parse_args()
    config_file = args.config

    if not os.path.exists(config_file):
        default_config = load_config(config_file)
        save_config(default_config, config_file)
        print(f"Created default configuration file: {config_file}")

    edit_config(config_file)
