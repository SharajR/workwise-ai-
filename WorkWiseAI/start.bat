@echo off
title WorkWise AI - Assessment Module Server
echo ========================================================
echo   WorkWise AI - Workplace Assessment Module (Member 2)
echo ========================================================
echo.

:: Check for node or agy-node
where agy-node >nul 2>nul
if %errorlevel% equ 0 (
    echo Starting server with agy-node...
    echo Web Application URL: http://localhost:3000
    echo History Dashboard:  http://localhost:3000/history
    echo.
    agy-node server.js
    goto end
)

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo Starting server with node...
    echo Web Application URL: http://localhost:3000
    echo History Dashboard:  http://localhost:3000/history
    echo.
    node server.js
    goto end
)

echo [ERROR] Neither 'agy-node' nor 'node' was found in your PATH.
echo Please ensure Node.js is installed or Antigravity runtime is available.
pause

:end
