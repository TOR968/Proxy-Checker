#!/bin/bash

echo "Proxy Cleaner - Checking the proxy"
echo "=============================="
echo ""
echo "Select a programming language:"
echo "1. JavaScript (Node.js)"
echo "2. Python"
echo ""
read -p "Your choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "Running the JavaScript version..."
    echo ""
    npm install
    node proxy_checker.js
elif [ "$choice" = "2" ]; then
    echo ""
    echo "Starting the Python version..."
    echo ""
    pip install -r requirements.txt
    python3 proxy_checker.py
else
    echo ""
    echo "Wrong choice. Please select 1 or 2."
    exit 1
fi

echo ""
echo "Done!"

