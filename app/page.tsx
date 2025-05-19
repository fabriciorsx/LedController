"use client";

import { useState, useEffect, useRef } from 'react';

export default function ColorPicker() {
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [brightness, setBrightness] = useState(255);
  const [red, setRed] = useState(255);
  const [green, setGreen] = useState(0);
  const [blue, setBlue] = useState(0);
  const [hexColor, setHexColor] = useState('#ff0000');
  const [isConnected, setIsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  const colorPanelRef = useRef(null);
  const hueSliderRef = useRef(null);
  const serialPort = useRef(null);
  
  const hsbToRgb = (h, s, b) => {
    h = h % 360;
    s = s / 100;
    b = b / 255; 
    
    let c = b * s;
    let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    let m = b - c;
    
    let r, g, bl;
    
    if (h >= 0 && h < 60) {
      r = c; g = x; bl = 0;
    } else if (h >= 60 && h < 120) {
      r = x; g = c; bl = 0;
    } else if (h >= 120 && h < 180) {
      r = 0; g = c; bl = x;
    } else if (h >= 180 && h < 240) {
      r = 0; g = x; bl = c;
    } else if (h >= 240 && h < 300) {
      r = x; g = 0; bl = c;
    } else {
      r = c; g = 0; bl = x;
    }
    
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((bl + m) * 255)
    };
  };

  useEffect(() => {
    const rgb = hsbToRgb(hue, saturation, brightness);
    setRed(rgb.r);
    setGreen(rgb.g);
    setBlue(rgb.b);
    
    const hexValue = '#' + 
      rgb.r.toString(16).padStart(2, '0') + 
      rgb.g.toString(16).padStart(2, '0') + 
      rgb.b.toString(16).padStart(2, '0');
    
    setHexColor(hexValue);
    
    if (isConnected && serialPort.current) {
      sendToSerial();
    }
  }, [hue, saturation, brightness, isConnected]);
  
  const handleColorPanelClick = (e) => {
    if (!colorPanelRef.current) return;
    
    const rect = colorPanelRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    setSaturation(Math.round(x * 100));
    setBrightness(Math.round((1 - y) * 255));
  };
  

  const handleHueSliderClick = (e) => {
    if (!hueSliderRef.current) return;
    
    const rect = hueSliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHue(Math.round(x * 360));
  };
  
  const connectToSerial = async () => {
    try {
      serialPort.current = await navigator.serial.requestPort();
      
      await serialPort.current.open({ 
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });
      
      setIsConnected(true);
      setStatusMessage('Conectado à porta serial');
      
      sendToSerial();
    } catch (error) {
      console.error('Erro ao conectar à porta serial:', error);
      setStatusMessage(`Erro: ${error.message}`);
    }
  };
  
  const disconnectFromSerial = async () => {
    if (serialPort.current && serialPort.current.readable) {
      try {
        await serialPort.current.close();
        serialPort.current = null;
        setIsConnected(false);
        setStatusMessage('Desconectado da porta serial');
      } catch (error) {
        console.error('Erro ao desconectar da porta serial:', error);
        setStatusMessage(`Erro: ${error.message}`);
      }
    }
  };
  
  const sendToSerial = async () => {
    if (!serialPort.current || !serialPort.current.writable) {
      return;
    }
    
    try {
      // Format the data string as <RED, GREEN, BLUE, BRIGHTNESS>
      const dataString = `<${red}, ${green}, ${blue}, ${brightness}>\n`;
      
      const writer = serialPort.current.writable.getWriter();
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(dataString));
      
      writer.releaseLock();
      
      setStatusMessage(`Enviado: ${dataString.trim()}`);
    } catch (error) {
      console.error('Erro ao enviar para porta serial:', error);
      setStatusMessage(`Erro: ${error.message}`);
    }
  };

  const hueGradient = 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)';
  const satBrightGradient = `
    linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%)),
    linear-gradient(to bottom, rgba(0,0,0,0), #000)
  `;
  
  return (
    <div className="p-4 max-w-lg mx-auto bg-neutral-900 rounded-xl shadow-lg text-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-medium">Seletor de cores</h2>
        <button className="text-gray-300 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      <div className="relative mb-4" style={{ height: '200px' }}>
        <div
          ref={colorPanelRef}
          onClick={handleColorPanelClick}
          onMouseDown={(e) => {
            const handleMove = (moveEvent) => handleColorPanelClick(moveEvent);
            const handleUp = () => {
              document.removeEventListener('mousemove', handleMove);
              document.removeEventListener('mouseup', handleUp);
            };
            document.addEventListener('mousemove', handleMove);
            document.addEventListener('mouseup', handleUp);
            handleColorPanelClick(e);
          }}
          className="absolute inset-0 cursor-crosshair"
          style={{
            background: satBrightGradient,
            backgroundBlendMode: 'multiply'
          }}
        ></div>
        
        <div
          className="absolute w-4 h-4 border-2 border-white rounded-full -ml-2 -mt-2 pointer-events-none"
          style={{
            left: `${saturation}%`,
            top: `${100 - (brightness / 255 * 100)}%`,
            backgroundColor: hexColor
          }}
        ></div>
      </div>
      
      <div className="relative h-6 mb-6">
        <div
          ref={hueSliderRef}
          onClick={handleHueSliderClick}
          onMouseDown={(e) => {
            const handleMove = (moveEvent) => handleHueSliderClick(moveEvent);
            const handleUp = () => {
              document.removeEventListener('mousemove', handleMove);
              document.removeEventListener('mouseup', handleUp);
            };
            document.addEventListener('mousemove', handleMove);
            document.addEventListener('mouseup', handleUp);
            handleHueSliderClick(e);
          }}
          className="absolute inset-0 rounded-full cursor-pointer"
          style={{ background: hueGradient }}
        ></div>
        
        <div
          className="absolute top-0 w-6 h-6 border-2 border-white rounded-full -ml-3 pointer-events-none"
          style={{
            left: `${(hue / 360) * 100}%`,
            backgroundColor: `hsl(${hue}, 100%, 50%)`
          }}
        ></div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-neutral-800 p-2 rounded">
          <div className="text-xs uppercase tracking-wider mb-1 text-center">RGB</div>
          <div className="font-mono text-center">{red}, {green}, {blue}</div>
        </div>
        <div className="bg-neutral-800 p-2 rounded">
          <div className="text-xs uppercase tracking-wider mb-1 text-center">HEX</div>
          <div className="font-mono text-center">{hexColor}</div>
        </div>
      </div>
      
      <div className="mt-6 border-t border-neutral-700 pt-4">
        <div className="flex justify-between">
          <button 
            onClick={connectToSerial}
            disabled={isConnected}
            className={`px-4 py-2 rounded font-medium ${isConnected 
              ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            Conectar Serial
          </button>
          
          <button 
            onClick={disconnectFromSerial}
            disabled={!isConnected}
            className={`px-4 py-2 rounded font-medium ${!isConnected 
              ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed' 
              : 'bg-red-600 hover:bg-red-700 text-white'}`}
          >
            Desconectar
          </button>

          <button 
            onClick={sendToSerial}
            disabled={!isConnected}
            className={`px-4 py-2 rounded font-medium ${!isConnected 
              ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700 text-white'}`}
          >
            Enviar Valores
          </button>
        </div>
        
        <div className="mt-4 p-2 border border-neutral-700 rounded bg-neutral-800">
          <p className="text-white font-mono text-sm">
            Status: {statusMessage || 'Não conectado'}
          </p>
          <p className="text-neutral-400 text-xs mt-1">
            Formato: &lt;RED, GREEN, BLUE, BRIGHTNESS&gt;
          </p>
        </div>
      </div>
    </div>
  );
}