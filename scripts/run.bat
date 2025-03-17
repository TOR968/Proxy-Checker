@echo off
echo Proxy Cleaner - Check proxy
echo ==============================
echo.

if not exist "data" mkdir data

echo Select an action:
echo 1. Run proxy checker
echo 2. Edit configuration
echo 3. Download proxies
echo 4. Copy proxies
echo.
set /p action=Your choice (1-4): 

echo.
echo Select a programming language:
echo 1. JavaScript (Node.js)
echo 2. Python
echo.
set /p lang=Your choice (1 or 2): 

echo.

if "%action%"=="1" goto proxy_checker
if "%action%"=="2" goto config_editor
if "%action%"=="3" goto download_proxies
if "%action%"=="4" goto copy_proxies
echo Incorrect choice. Please select a number from 1 to 4.
goto end

:proxy_checker
if "%lang%"=="1" goto proxy_checker_js
if "%lang%"=="2" goto proxy_checker_py
echo Incorrect language choice.
goto end

:config_editor
if "%lang%"=="1" goto config_editor_js
if "%lang%"=="2" goto config_editor_py
echo Incorrect language choice.
goto end

:download_proxies
if "%lang%"=="1" goto download_proxies_js
if "%lang%"=="2" goto download_proxies_py
echo Incorrect language choice.
goto end

:copy_proxies
if "%lang%"=="1" goto copy_proxies_js
if "%lang%"=="2" goto copy_proxies_py
echo Incorrect language choice.
goto end

:proxy_checker_js
echo Starting the proxy checker (JavaScript)...
cd deps
call npm install
cd ..
node src\javascript\proxy_checker.js
goto end

:proxy_checker_py
echo Starting the proxy checker (Python)...
cd deps
pip install -r requirements.txt
cd ..
python src\python\proxy_checker.py
goto end

:config_editor_js
echo Starting the configuration editor (JavaScript)...
cd deps
call npm install
cd ..
node src\javascript\config_editor.js
goto end

:config_editor_py
echo Starting the configuration editor (Python)...
cd deps
pip install -r requirements.txt
cd ..
python src\python\config_editor.py
goto end

:download_proxies_js
echo Starting the proxy downloader (JavaScript)...
cd deps
call npm install
cd ..
node src\javascript\download_proxies.js
goto end

:download_proxies_py
echo Starting the proxy downloader (Python)...
cd deps
pip install -r requirements.txt
cd ..
python src\python\download_proxies.py
goto end

:copy_proxies_js
echo Starting the proxy copier (JavaScript)...
cd deps
call npm install
cd ..
node src\javascript\copy_proxies.js
goto end

:copy_proxies_py
echo Starting the proxy copier (Python)...
cd deps
pip install -r requirements.txt
cd ..
python src\python\copy_proxies.py
goto end

:end
echo.
echo Done!
pause