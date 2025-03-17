import json
import shutil
import os


def copy_proxies():
    print("Copying proxies between projects...")

    if not os.path.exists("proxy_config.json"):
        print("Error: File proxy_config.json not found!")
        return False

    with open("proxy_config.json", "r") as config_file:
        config = json.load(config_file)

    source_proxy = config.get("source_proxy")

    if not os.path.exists(source_proxy):
        print(f"Error: File {source_proxy} not found!")
        return False

    for project_path in config.get("project_paths", []):
        if os.path.exists(project_path):
            print(f"Copying to {project_path}...")
            shutil.copy2(source_proxy, project_path)
            print(f"Successfully copied to {project_path}")
        else:
            print(f"Skipping {project_path} (path does not exist)")

    print("\nCopying completed!")
    return True


if __name__ == "__main__":
    copy_proxies()
    input("Press Enter to exit...")
