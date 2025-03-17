#!/bin/bash

echo "Proxy Cleaner - Checking the proxy"
echo "=============================="
echo ""

# Перевірка наявності папки data і створення її, якщо вона не існує
if [ ! -d "data" ]; then
    echo "Creating data directory..."
    mkdir -p data
fi

# Вивід меню вибору дії
echo "Select an action:"
echo "1. Run proxy checker"
echo "2. Edit configuration"
echo "3. Download proxies"
echo "4. Copy proxies"
echo ""
read -p "Your choice (1-4): " action

echo ""
echo "Select a programming language:"
echo "1. JavaScript (Node.js)"
echo "2. Python"
echo ""
read -p "Your choice (1 or 2): " lang

echo ""

function proxy_checker() {
    if [ "$lang" = "1" ]; then
        proxy_checker_js
    elif [ "$lang" = "2" ]; then
        proxy_checker_py
    else
        echo "Wrong choice. Please select 1 or 2."
        exit 1
    fi
}

function config_editor() {
    if [ "$lang" = "1" ]; then
        config_editor_js
    elif [ "$lang" = "2" ]; then
        config_editor_py
    else
        echo "Wrong choice. Please select 1 or 2."
        exit 1
    fi
}

function download_proxies() {
    if [ "$lang" = "1" ]; then
        download_proxies_js
    elif [ "$lang" = "2" ]; then
        download_proxies_py
    else
        echo "Wrong choice. Please select 1 or 2."
        exit 1
    fi
}

function copy_proxies() {
    if [ "$lang" = "1" ]; then
        copy_proxies_js
    elif [ "$lang" = "2" ]; then
        copy_proxies_py
    else
        echo "Wrong choice. Please select 1 or 2."
        exit 1
    fi
}

function proxy_checker_js() {
    echo "Starting the proxy checker (JavaScript)..."
    cd deps
    npm install
    cd ..
    node src/javascript/proxy_checker.js
}

function proxy_checker_py() {
    echo "Starting the proxy checker (Python)..."
    cd deps
    pip install -r requirements.txt
    cd ..
    python3 src/python/proxy_checker.py
}

function config_editor_js() {
    echo "Starting the configuration editor (JavaScript)..."
    cd deps
    npm install
    cd ..
    node src/javascript/config_editor.js
}

function config_editor_py() {
    echo "Starting the configuration editor (Python)..."
    cd deps
    pip install -r requirements.txt
    cd ..
    python3 src/python/config_editor.py
}

function download_proxies_js() {
    echo "Starting the proxy downloader (JavaScript)..."
    cd deps
    npm install
    cd ..
    node src/javascript/download_proxies.js
}

function download_proxies_py() {
    echo "Starting the proxy downloader (Python)..."
    cd deps
    pip install -r requirements.txt
    cd ..
    python3 src/python/download_proxies.py
}

function copy_proxies_js() {
    echo "Starting the proxy copier (JavaScript)..."
    cd deps
    npm install
    cd ..
    node src/javascript/copy_proxies.js
}

function copy_proxies_py() {
    echo "Starting the proxy copier (Python)..."
    cd deps
    pip install -r requirements.txt
    cd ..
    python3 src/python/copy_proxies.py
}

# Вибір дії
if [ "$action" = "1" ]; then
    proxy_checker
elif [ "$action" = "2" ]; then
    config_editor
elif [ "$action" = "3" ]; then
    download_proxies
elif [ "$action" = "4" ]; then
    copy_proxies
else
    echo "Wrong choice. Please select a number from 1 to 4."
    exit 1
fi

echo ""
echo "Done!"

