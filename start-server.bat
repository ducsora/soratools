@echo off
title SoraTools Local Server
echo.
echo  ================================================
echo   SoraTools - Khoi dong Local Server
echo  ================================================
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo  [OK] Da tim thay Python
    echo  [>>] Dang khoi dong server tai http://localhost:3000
    echo  [>>] Mo trinh duyet va vao: http://localhost:3000/ads-automation.html
    echo.
    echo  Nhan Ctrl+C de dung server.
    echo.
    start "" "http://localhost:3000/ads-automation.html"
    python -m http.server 3000
    goto end
)

:: Fallback: Check Node.js
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo  [OK] Da tim thay Node.js
    echo  [>>] Dang cai npx serve...
    echo  [>>] Mo trinh duyet: http://localhost:3000/ads-automation.html
    echo.
    start "" "http://localhost:3000/ads-automation.html"
    npx -y serve -p 3000 .
    goto end
)

:: Nothing found
echo  [LOI] Khong tim thay Python hoac Node.js!
echo.
echo  Vui long cai dat mot trong hai:
echo   - Python: https://www.python.org/downloads/
echo   - Node.js: https://nodejs.org/
echo.
pause

:end
