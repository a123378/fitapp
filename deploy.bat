@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在上傳健身 App...
call firebase deploy --only hosting
echo.
pause
