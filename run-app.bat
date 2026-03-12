@echo off
echo ==========================================
echo   Starting VenueVisor All-in-One
echo ==========================================

:: 1. Start MySQL Database (Hidden Window / Background)
echo [1/3] Starting Database...
start "VenueVisor Database" /MIN "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqld.exe" --defaults-file="C:\laragon\bin\mysql\mysql-8.4.3-winx64\my.ini" --console

:: Wait a moment for DB to initialize
timeout /t 5 /nobreak >nul

:: 2. Start Laravel Backend
echo [2/3] Starting Backend Server...
start "VenueVisor Backend" /MIN "C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe" -c "C:\laragon\www\VenueVisor\php.ini" -S localhost:8000 -t public

:: 3. Start Frontend (Vite)
echo [3/3] Starting Frontend...
start "VenueVisor Frontend" cmd /c "npm run dev"

echo.
echo ==========================================
echo   All services started!
echo   App: http://localhost:8000
echo ==========================================
echo.
pause
