import json
import os
import argparse

DEFAULT_CONFIG_FILE = "config.json"


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
        with open(config_file, "r") as file:
            return json.load(file)
    except Exception as e:
        print(f"Error loading config file: {e}")
        return {
            "proxy_url": "https://raw.githubusercontent.com/monosans/proxy-list/refs/heads/main/proxies/all.txt",
            "proxy_file": "proxy.txt",
            "output_file": "working_proxies.txt",
            "test_url": "http://www.google.com",
            "timeout": 5,
            "concurrent_checks": 20,
            "save_to_input_file": False,
        }


def save_config(config_data, config_file):
    try:
        with open(config_file, "w") as file:
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
    config["test_url"] = (
        input(f"Test URL [{config['test_url']}]: ") or config["test_url"]
    )

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

    save_to_input_file = config.get("save_to_input_file", False)
    save_input = input(
        f"Save working proxies to input file (y/n) [{('y' if save_to_input_file else 'n')}]: "
    )
    if save_input.lower() in ["y", "yes"]:
        config["save_to_input_file"] = True
    elif save_input.lower() in ["n", "no"]:
        config["save_to_input_file"] = False

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
