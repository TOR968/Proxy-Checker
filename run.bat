@echo off
echo Proxy Cleaner - Check proxy
echo ==============================
echo.
echo Select a programming language:
echo 1. JavaScript (Node.js)
echo 2. Python
echo.
set /p choice="Your choice (1 or 2): "

if "%choice%"=="1" (
    echo.
    echo Starting the JavaScript version...
    echo.
    npm install
    node proxy_checker.js
) else if "%choice%"=="2" (
    echo.
    echo Starting the Python version...
    echo.
    pip install -r requirements.txt
    python proxy_checker.py
) else (
    echo.
    echo Incorrect choice. Please select 1 or 2.
    exit /b 1
)

echo.
echo Done!
pause