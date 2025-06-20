# Deployment Guide for GSTInvoicePro

This document provides guidance on deploying GSTInvoicePro using free cloud services.

## Free Hosting Options

We'll be using the following free services:
- **Database**: Neon (PostgreSQL)
- **Backend**: Render
- **Frontend**: Vercel

## Pre-deployment Checklist

Before deploying to production, ensure you've completed the following:

1. Set up accounts on Neon, Render, and Vercel
2. Use a strong, randomly generated `JWT_SECRET_KEY`
3. Configure proper database credentials with limited permissions
4. Set appropriate `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` (recommended: 15-60 minutes)
5. Configure CORS settings properly with your exact frontend domain

## Deployment Steps

### 1. Database Setup - Neon

1. Sign up for a free account at [Neon](https://neon.tech)
2. Create a new project
3. Get your database connection string from the dashboard
4. Note down the connection string - you'll need it for both backend and frontend deployment

### 2. Backend Deployment - Render

1. Sign up for a free account at [Render](https://render.com)
2. Connect your GitHub repository
3. Create a new Web Service with these settings:
   - **Build Command**: 
     ```bash
     cd backend && pip install -r requirements.txt
     ```
   - **Start Command**: 
     ```bash
     cd backend && python run.py
     ```
   - **Environment Variables**:
     ```
     DATABASE_URL=your-neon-database-url
     JWT_SECRET_KEY=your-secret-key
     FRONTEND_ORIGIN=https://your-app-name.vercel.app
     DEBUG=False
     ```
4. Deploy your service
5. Note down your Render service URL for frontend configuration

### 3. Frontend Deployment - Vercel

1. Sign up for a free account at [Vercel](https://vercel.com)
2. Import your GitHub repository
3. Configure environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-render-service-url
   ```
4. Deploy your frontend application

## Post-deployment Tasks

1. **Database Initialization**:
   - Run migrations through Render's shell:
     ```bash
     cd backend
     python init_db.py
     ```

2. **Verify CORS Settings**:
   - Ensure `FRONTEND_ORIGIN` in backend matches your Vercel URL
   - Test API connectivity from frontend

3. **Monitor Resource Usage**:
   - Keep track of Neon's free tier database limits
   - Monitor Render and Vercel usage metrics

4. **SSL/HTTPS**:
   - Verify SSL certificates (automatically handled by Render and Vercel)
   - Ensure all API calls use HTTPS
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