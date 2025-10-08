import { NextRequest, NextResponse } from 'next/server'

const FLASK_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export async function GET(request: NextRequest) {
  try {
    // Proxy the request to the Flask backend
    const response = await fetch(`${FLASK_BACKEND_URL}/api/urimpact/map-geojson`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Flask backend error:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to fetch data from backend' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error proxying to Flask backend:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
