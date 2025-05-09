#!/bin/bash
set -e

echo "==================================="
echo "GSTInvoicePro Setup Script"
echo "==================================="
echo

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed or not in PATH."
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    echo
    echo "Proceeding with manual setup..."
    DOCKER_INSTALLED=false
else
    echo "Docker is installed. Checking Docker service..."
    if ! docker info &> /dev/null; then
        echo "Docker service is not running."
        echo "Please start Docker and try again."
        exit 1
    fi
    DOCKER_INSTALLED=true
fi

if [ "$DOCKER_INSTALLED" = true ]; then
    read -p "Would you like to set up using Docker? (y/n): " use_docker
    use_docker=$(echo "$use_docker" | tr '[:upper:]' '[:lower:]')
    
    if [ "$use_docker" = "y" ] || [ "$use_docker" = "yes" ]; then
        docker_setup
    else
        manual_setup
    fi
else
    manual_setup
fi

function docker_setup() {
    echo
    echo "Setting up GSTInvoicePro with Docker..."
    echo

    # Copy environment files
    echo "Setting up environment files..."
    if [ ! -f backend/.env ]; then
        cp backend/.env.example backend/.env
    fi

    if [ ! -f frontend/.env.local ]; then
        echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > frontend/.env.local
    fi

    # Build and start Docker containers
    echo "Building and starting Docker containers..."
    docker-compose build
    docker-compose up -d

    echo
    echo "Setup complete! GSTInvoicePro is now running at:"
    echo "- Frontend: http://localhost:3000"
    echo "- Backend API: http://localhost:8000"
    echo "- API Documentation: http://localhost:8000/docs"
    echo
    echo "Use these demo credentials to log in:"
    echo "- Email: demo@example.com"
    echo "- Password: demopassword"
    echo
    echo "To stop the application, run: docker-compose down"
}

function manual_setup() {
    echo
    echo "Setting up for manual development..."
    echo

    echo "1. Setting up backend..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt

    if [ ! -f .env ]; then
        cp .env.example .env
        echo "Please update the database credentials in backend/.env file"
    fi

    echo
    echo "2. Setting up frontend..."
    cd ../frontend
    npm install

    if [ ! -f .env.local ]; then
        echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
    fi

    echo
    echo "Setup complete! To start the application:"
    echo
    echo "1. Start the backend:"
    echo "   cd backend"
    echo "   source venv/bin/activate"
    echo "   python run.py"
    echo
    echo "2. Start the frontend (in a new terminal):"
    echo "   cd frontend"
    echo "   npm run dev"
    echo
    echo "Then visit: http://localhost:3000"
}

# Make the script executable
chmod +x setup.sh

# End of script 