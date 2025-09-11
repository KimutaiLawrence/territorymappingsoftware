# Deployment Guide

## Vercel Deployment

### Prerequisites
- Vercel account
- GitHub repository connected to Vercel

### Steps

1. **Environment Variables**
   Set the following environment variable in Vercel:
   ```
   NEXT_PUBLIC_API_URL=https://territorymapperbackend.onrender.com
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

- `NEXT_PUBLIC_API_URL`: Backend API URL (default: https://territorymapperbackend.onrender.com)

## Backend Integration

The frontend is configured to communicate with the backend API at:
- **Production**: https://territorymapperbackend.onrender.com
- **API Documentation**: https://territorymapperbackend.onrender.com/docs

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
