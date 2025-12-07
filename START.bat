@echo off
echo ========================================
echo KIROBOT Trading Signals System
echo ========================================
echo.
echo Starting all components...
echo.

echo [1/2] Starting Backend Server...
start cmd /k "cd backend-server && npm install && npm start"
timeout /t 3 /nobreak > nul

echo [2/2] Starting Mobile App...
start cmd /k "cd mobile-app && npm install && npm start"
timeout /t 3 /nobreak > nul

echo.
echo ========================================
echo All services started!
echo ========================================
echo.
echo Next steps:
echo 1. Open index.html in your browser
echo 2. Install Expo Go on your phone
echo 3. Scan the QR code to load mobile app
echo.
echo Check the guides:
echo - SETUP_GUIDE.md (English)
echo - URDU_GUIDE.md (Urdu/Hindi)
echo - DEPLOYMENT_GUIDE.md (Advanced)
echo.
pause
