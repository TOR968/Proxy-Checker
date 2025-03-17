import json
import shutil
import os


def get_project_root():
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def get_file_path(relative_path):
    return os.path.join(get_project_root(), relative_path)


def copy_proxies():
    print("Copying proxies between projects...")

    config_path = get_file_path(os.path.join("config", "proxy_config.json"))
    if not os.path.exists(config_path):
        print("Error: File proxy_config.json not found!")
        return False

    with open(config_path, "r") as config_file:
        config = json.load(config_file)

    source_proxy = get_file_path(config.get("source_proxy"))

    if not os.path.exists(source_proxy):
        print(f"Error: File {source_proxy} not found!")
        return False

    for project_path in config.get("project_paths", []):
        target_path = get_file_path(project_path)
        if os.path.exists(target_path):
            print(f"Copying to {target_path}...")
            shutil.copy2(source_proxy, target_path)
            print(f"Successfully copied to {target_path}")
        else:
            print(f"Skipping {target_path} (path does not exist)")

    print("\nCopying completed!")
    return True


if __name__ == "__main__":
    copy_proxies()
    input("Press Enter to exit...")
