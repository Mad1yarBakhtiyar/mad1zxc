@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if not errorlevel 1 (
  node scripts\preview-static.mjs
  goto end
)
set "SKAS_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%SKAS_NODE%" (
  "%SKAS_NODE%" scripts\preview-static.mjs
  goto end
)
echo Node.js is required. Install Node.js, then run START.cmd again.
:end
pause
