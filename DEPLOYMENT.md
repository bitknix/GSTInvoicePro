# Deployment Guide for GSTInvoicePro

This document provides guidance on deploying GSTInvoicePro in a production environment.

## Production Checklist

Before deploying to production, ensure you've completed the following:

1. Set `DEBUG=false` in your backend `.env` file
2. Use a strong, randomly generated `JWT_SECRET_KEY`
3. Configure proper database credentials with limited permissions
4. Set appropriate `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` (recommended: 15-60 minutes)
5. Configure CORS settings properly with your exact frontend domain

## Deployment Options

### Option 1: VPS/Dedicated Server

#### Backend Deployment

1. Clone the repository on your server
2. Set up a virtual environment and install dependencies:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Create a `.env` file with production settings
4. Set up a PostgreSQL database
5. Run database migrations and initialization:
   ```bash
   python init_db.py
   ```
6. Set up Gunicorn as a production WSGI server:
   ```bash
   pip install gunicorn
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app
   ```
7. Configure Nginx as a reverse proxy to Gunicorn
8. Set up SSL with Let's Encrypt
9. Create a systemd service for automatic startup and management

#### Frontend Deployment

1. Build the frontend for production:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
2. Serve the static files using Nginx
3. Configure proper caching headers
4. Set up SSL with Let's Encrypt

### Option 2: Docker Deployment

We recommend using Docker Compose for easy deployment:

1. Create a `docker-compose.yml` file in the project root:
   ```yaml
   version: '3.8'
   
   services:
     db:
       image: postgres:13
       volumes:
         - postgres_data:/var/lib/postgresql/data
       env_file:
         - ./backend/.env
       ports:
         - "5432:5432"
       environment:
         - POSTGRES_PASSWORD=${DB_PASSWORD}
         - POSTGRES_USER=${DB_USER}
         - POSTGRES_DB=${DB_NAME}
       restart: always
   
     backend:
       build: ./backend
       depends_on:
         - db
       env_file:
         - ./backend/.env
       ports:
         - "8000:8000"
       restart: always
   
     frontend:
       build: ./frontend
       ports:
         - "3000:3000"
       depends_on:
         - backend
       restart: always
   
   volumes:
     postgres_data:
   ```

2. Create a `Dockerfile` in the backend directory:
   ```Dockerfile
   FROM python:3.10-slim
   
   WORKDIR /app
   
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   
   COPY . .
   
   CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000", "app.main:app"]
   ```

3. Create a `Dockerfile` in the frontend directory:
   ```Dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm install
   
   COPY . .
   
   RUN npm run build
   
   CMD ["npm", "start"]
   ```

4. Deploy with Docker Compose:
   ```bash
   docker-compose up -d
   ```

### Option 3: Cloud Deployment

#### AWS Deployment

1. Backend: Use AWS Elastic Beanstalk or ECS
2. Frontend: Use AWS Amplify or S3 + CloudFront
3. Database: Use RDS for PostgreSQL

#### Azure Deployment

1. Backend: Use Azure App Service
2. Frontend: Use Azure Static Web Apps
3. Database: Use Azure Database for PostgreSQL

## Security Considerations

1. Always use HTTPS in production
2. Implement rate limiting for API endpoints
3. Regularly update dependencies
4. Set up proper database backups
5. Monitor application logs
6. Consider implementing IP-based access controls for admin functions
7. Use a Web Application Firewall (WAF) for additional protection

## Performance Optimization

1. Enable database query caching
2. Implement Redis for session storage and caching
3. Configure proper HTTP caching headers
4. Use a CDN for static assets
5. Enable GZIP/Brotli compression for API responses
6. Implement database connection pooling

## Monitoring and Logging

1. Set up application monitoring with Prometheus, Grafana, or a cloud service
2. Configure centralized logging with the ELK stack or a cloud service
3. Set up alerts for critical errors and performance issues

## Backup Strategy

1. Daily automated database backups
2. Store backups in a separate location
3. Test backup restoration regularly
4. Implement point-in-time recovery for the database 