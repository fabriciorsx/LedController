import { NextRequest, NextResponse } from 'next/server';

const SERIAL_SERVER_URL = 'http://localhost:3001'; // Servidor serial local

// Função para fazer requisições ao servidor serial
async function forwardToSerialServer(endpoint: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${SERIAL_SERVER_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Serial server error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error communicating with serial server:', error);
    throw error;
  }
}

// GET - Status da conexão
export async function GET() {
  try {
    const data = await forwardToSerialServer('/api/status');
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to connect to Arduino server' },
      { status: 500 }
    );
  }
}

// POST - Comandos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    let endpoint = '';
    let requestBody = {};

    switch (action) {
      case 'color':
        endpoint = '/api/color';
        requestBody = {
          r: params.r,
          g: params.g,
          b: params.b,
          brightness: params.brightness || 255
        };
        break;

      case 'effect':
        endpoint = '/api/effect';
        requestBody = {
          effect: params.effect,
          brightness: params.brightness || 255
        };
        break;

      case 'save':
        endpoint = '/api/save';
        break;

      case 'reset':
        endpoint = '/api/reset';
        break;

      case 'reconnect':
        endpoint = '/api/reconnect';
        break;

      case 'status':
        endpoint = '/api/arduino-status';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const data = await forwardToSerialServer(endpoint, {
      method: 'POST',
      body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined,
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to execute command' },
      { status: 500 }
    );
  }
}