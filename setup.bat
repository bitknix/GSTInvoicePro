@echo off
echo ===================================
echo GSTInvoicePro Setup Script
echo ===================================
echo.

REM Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Docker is not installed or not in PATH.
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    echo.
    goto :manual_setup
)

echo Docker is installed. Checking Docker service...
docker info >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Docker service is not running.
    echo Please start Docker Desktop and try again.
    exit /b 1
)

echo Docker is running. Would you like to set up using Docker? (y/n)
set /p use_docker=

if /i "%use_docker%"=="y" (
    goto :docker_setup
) else (
    goto :manual_setup
)

:docker_setup
echo.
echo Setting up GSTInvoicePro with Docker...
echo.

REM Copy environment files
echo Setting up environment files...
if not exist backend\.env (
    copy backend\.env.example backend\.env
)

if not exist frontend\.env.local (
    echo NEXT_PUBLIC_API_URL=http://localhost:8000 > frontend\.env.local
)

REM Build and start Docker containers
echo Building and starting Docker containers...
docker-compose build
docker-compose up -d

echo.
echo Setup complete! GSTInvoicePro is now running at:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:8000
echo - API Documentation: http://localhost:8000/docs
echo.
echo Use these demo credentials to log in:
echo - Email: demo@example.com
echo - Password: demopassword
echo.
echo To stop the application, run: docker-compose down
goto :EOF

:manual_setup
echo.
echo Setting up for manual development...
echo.

echo 1. Setting up backend...
cd backend
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt

if not exist .env (
    copy .env.example .env
    echo Please update the database credentials in backend\.env file
)

echo.
echo 2. Setting up frontend...
cd ..\frontend
call npm install

if not exist .env.local (
    echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local
)

echo.
echo Setup complete! To start the application:
echo.
echo 1. Start the backend:
echo    cd backend
echo    venv\Scripts\activate
echo    python run.py
echo.
echo 2. Start the frontend (in a new terminal):
echo    cd frontend
echo    npm run dev
echo.
echo Then visit: http://localhost:3000
goto :EOF 