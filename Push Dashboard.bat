@echo off
title Push Dashboard Changes
cd /d "C:\Users\nour0\OneDrive\Documents\Claude\Projects\ACES Compliance Systems\Dashboard"
git config user.name "Nour Alsharife"
git config user.email "nalsharife@acescompliancesystems.com"
git add -A
git commit -m "Dashboard update via Claude workspace"
if errorlevel 1 (
  echo.
  echo COMMIT FAILED - read the message above and tell Claude what it says.
  pause
  exit /b 1
)
git push origin main
if errorlevel 1 (
  echo.
  echo PUSH FAILED - likely a GitHub sign-in issue. Read the message above and tell Claude.
  pause
  exit /b 1
)
echo.
echo SUCCESS. Netlify will deploy in about a minute: https://aces-ops.netlify.app
pause
