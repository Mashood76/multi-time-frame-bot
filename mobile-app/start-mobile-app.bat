@echo off
echo Installing Expo CLI globally (if not already installed)...
call npm install -g expo-cli

echo.
echo Starting KIROBOT Mobile App...
call expo start

pause
