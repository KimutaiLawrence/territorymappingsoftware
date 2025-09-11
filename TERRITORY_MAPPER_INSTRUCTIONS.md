# Territory Mapper Frontend Development Instructions

## Project Overview
Create a modern Next.js 15 frontend application that replicates the functionality from the original HTML file at https://territory-mapper-gis.netlify.app/gis-mapping-tool.html but with improved UI/UX using shadcn/ui components and integration with the live backend API.

## Backend API Details
- **Base URL**: https://territorymapperbackend.onrender.com/
- **Swagger Docs**: https://territorymapperbackend.onrender.com/docs/#/
- **Working Credentials**: 
  - Email: testuser_b8cdd458@example.com
  - Password: TestPassword123!
  - Role: Editor

## Tech Stack Requirements
- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Mapping**: MapLibre GL JS (extracted from original HTML)
- **State Management**: React hooks + Context API
- **HTTP Client**: Axios or fetch
- **Authentication**: JWT token-based

## Key Features to Implement
1. **Authentication System**
   - Login/logout functionality
   - JWT token management
   - Role-based access control (Editor, Admin, Viewer)

2. **Map Interface**
   - MapLibre GL JS integration
   - Interactive territory mapping
   - Layer management (current locations, potential locations, territories)
   - Drawing tools for territory boundaries
   - Search and filtering

3. **Data Management**
   - Fetch data from backend API endpoints
   - Real-time updates
   - CRUD operations for locations and territories

4. **UI Components** (using shadcn/ui)
   - Modern dashboard layout
   - Sidebar navigation
   - Data tables
   - Forms and modals
   - Charts and statistics

## Implementation Steps
1. Initialize Next.js project with TypeScript and Tailwind
2. Install and configure shadcn/ui
3. Set up MapLibre GL JS
4. Create authentication context and hooks
5. Build map component with territory mapping functionality
6. Implement data fetching from backend API
7. Create responsive UI components
8. Add role-based access control
9. Test and optimize

## Original HTML Analysis
The original HTML file contains:
- MapLibre GL JS implementation
- Territory drawing and editing tools
- Layer management system
- Hardcoded JSON data (to be replaced with API calls)
- Custom styling (to be converted to Tailwind + shadcn)

## API Endpoints to Integrate
- POST /api/auth/login - User authentication
- GET /api/current-locations/ - Current locations data
- GET /api/potential-locations/ - Potential locations data
- GET /api/territories/ - Territories data
- GET /api/datasets/ - Available datasets
- POST /api/territories/ - Create new territory
- PUT /api/territories/{id} - Update territory
- DELETE /api/territories/{id} - Delete territory

## Expected Outcome
A modern, responsive territory mapping application with:
- Clean, professional UI using shadcn components
- Full integration with backend API
- Role-based authentication
- Interactive map with territory management
- Real-time data updates
- Mobile-responsive design
