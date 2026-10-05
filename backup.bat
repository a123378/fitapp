@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === 備份到 GitHub ===
git add .
git commit -m "Update via Claude"
git push
echo === 完成 ===
pause
