# Territory Mapper Frontend

A modern GIS mapping application built with Next.js, TypeScript, and MapLibre GL.

## Features

- **Interactive Maps**: Built with MapLibre GL for high-performance mapping
- **Territory Management**: Create, edit, and manage territories
- **Location Tracking**: Track current and potential locations
- **Data Visualization**: Display US states, rivers, roads, and custom data layers
- **Export & Print**: Export maps as PDF and print functionality
- **Authentication**: JWT-based authentication with role-based access control
- **Responsive Design**: Mobile-friendly interface

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Maps**: MapLibre GL
- **UI Components**: Custom components with Radix UI
- **State Management**: React Context + Custom Hooks
- **HTTP Client**: Axios

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/KimutaiLawrence/territorymappingsoftware.git
cd territorymappingsoftware/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set the environment variable `NEXT_PUBLIC_API_URL` to your backend URL
3. Deploy automatically on every push to main branch

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm run start
```

## API Integration

The frontend communicates with the backend API at `https://territorymapperbackend.onrender.com`. The API provides:

- Authentication endpoints
- Territory management
- Location tracking
- Geographic data (states, rivers, roads)
- Statistics and analytics

## Project Structure

```
frontend/
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # React components
│   │   ├── auth/           # Authentication components
│   │   ├── common/         # Shared components
│   │   ├── layout/         # Layout components
│   │   ├── map/            # Map-related components
│   │   └── ui/             # UI components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utility functions
│   └── types/              # TypeScript type definitions
├── public/                 # Static assets
└── ...config files
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.