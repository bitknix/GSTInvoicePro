# GSTInvoicePro

A full-stack web application for generating Indian GST-compliant invoices with features comparable to commercial invoicing software. Built for businesses and chartered accountants to manage invoices and export/import NIC-compliant JSON.

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.103.1-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.0.0-black.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0.0-blue.svg)

## Features

- 📝 GST-compliant invoice generation
- 🏢 Multi-business profile management
- 👥 Customer management with GSTIN validation
- 📦 Product catalog with HSN/SAC codes
- 💰 Automatic CGST/SGST/IGST calculation based on supply type
- 📤 Export/Import NIC-compliant JSON format
- 📊 Export to CSV/Excel for tax filing
- 📑 Professional PDF generation
- 📈 Dashboard with tax summary and visualizations
- 🔐 Secure JWT authentication

## Tech Stack

- **Backend**: FastAPI (Python 3.10+)
- **Frontend**: Next.js 15+ (React 19, TypeScript)
- **Database**: PostgreSQL
- **Styling**: Tailwind CSS 4
- **Authentication**: JWT-based authentication
- **PDF Generation**: WeasyPrint

## Quick Start with Docker (Recommended)

The easiest way to get started is using Docker:

```bash
# Clone the repository
git clone https://github.com/bitknix/GSTInvoicePro.git
cd GSTInvoicePro

# Setup environment files
make docker-setup

# Build and start the containers
make docker-up

# To stop all containers
make docker-down
```

This will start:
- PostgreSQL database at `localhost:5432`
- Backend API at `http://localhost:8000`
- Frontend at `http://localhost:3000`

## Manual Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 12+
- Git

### Backend Setup

1. Navigate to the backend directory and create a virtual environment:
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # On Windows
   # source venv/bin/activate  # On macOS/Linux
   ```

2. Install dependencies and set up the database:
   ```bash
   pip install -r requirements.txt
   copy .env.example .env  # On Windows
   # cp .env.example .env  # On macOS/Linux
   ```

3. Edit the `.env` file with your database credentials and create a PostgreSQL database:
   ```bash
   # Create the database (should have PostgreSQL installed and in PATH)
   createdb gstinvoicepro
   
   # Initialize the database
   python init_db.py
   
   # Start the backend server
   python run.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   ```

2. Create a `.env.local` file and start the development server:
   ```bash
   echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local
   npm run dev
   ```

## Makefile Commands

We provide a Makefile for common development tasks:

```bash
# View all available commands
make help

# Setup development environment
make setup-dev

# Run development servers
make dev-backend
make dev-frontend

# Clean up temporary files
make clean
```

See `DEPLOYMENT.md` for production deployment instructions.

## Usage

1. Register a new account or use the demo credentials:
   - Email: demo@example.com
   - Password: demopassword

2. Create a business profile with your company's GST details.

3. Add customers and products to your catalog.

4. Create GST-compliant invoices with automatic tax calculation.

5. Export invoices as PDF or JSON for GST portal upload.

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Documentation

- [Deployment Guide](DEPLOYMENT.md): Instructions for deploying to different environments
- [Contributing Guidelines](CONTRIBUTING.md): How to contribute to the project
- [Code of Conduct](CODE_OF_CONDUCT.md): Community guidelines
- [License](LICENSE): MIT License details

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For any questions or feedback, please open an issue on GitHub.

Project Link: [https://github.com/bitknix/GSTInvoicePro](https://github.com/bitknix/GSTInvoicePro) 