# Deployment Guide

## Vercel Deployment

### Prerequisites
- Vercel account
- GitHub repository connected to Vercel

### Steps

1. **Environment Variables**
   Set the following environment variable in Vercel:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

2. **Build Settings**
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

3. **Deploy**
   - Connect your GitHub repository to Vercel
   - Vercel will automatically detect Next.js and configure settings
   - Deploy on every push to main branch

## Manual Deployment

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm run start
```

## Environment Configuration

The application uses the following environment variables:

- `NEXT_PUBLIC_API_URL`: Backend API URL (default: http://localhost:5000)

## Backend Integration

The frontend is configured to communicate with the backend API at:
- **Development**: http://localhost:5000
- **Production**: https://territorymapperbackend.onrender.com
- **API Documentation**: http://localhost:5000/docs (development) or https://territorymapperbackend.onrender.com/docs (production)

## Troubleshooting

### Common Issues

1. **API Connection Issues**
   - Verify `NEXT_PUBLIC_API_URL` is set correctly
   - Check if backend is running and accessible

2. **Build Failures**
   - Ensure all dependencies are installed
   - Check for TypeScript errors
   - Verify environment variables are set

3. **Map Not Loading**
   - Check browser console for errors
   - Verify MapLibre GL is properly configured
   - Ensure CORS is enabled on backend
