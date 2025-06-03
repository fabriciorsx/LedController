'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Palette, Zap, Save, RotateCcw, Wifi, WifiOff, Edit3 } from 'lucide-react';

// Type definitions
interface Color {
  r: number;
  g: number;
  b: number;
}

interface HSB {
  h: number;
  s: number;
  b: number;
}

interface Effect {
  id: number;
  name: string;
  description: string;
}

interface PresetColor extends Color {
  name: string;
}

interface ApiResponse {
  success: boolean;
  connected: boolean;
  error?: string;
  effectName?: string;
}

type EditableFieldType = 'r' | 'g' | 'b' | 'h' | 's' | 'v' | 'hex';

interface EditableFieldProps {
  label: string;
  value: string | number;
  field: EditableFieldType;
  suffix?: string;
  max?: number;
}

const LEDController = () => {
  
  const [color, setColor] = useState<Color>({ r: 255, g: 0, b: 0 });
  const [brightness, setBrightness] = useState<number>(255);
  const [effect, setEffect] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  
  // Estados para edição
  const [editingField, setEditingField] = useState<EditableFieldType | null>(null);
  const [tempValues, setTempValues] = useState<Record<string, string>>({});
  
  const colorPanelRef = useRef<HTMLDivElement>(null);
  const hueSliderRef = useRef<HTMLDivElement>(null);

  // URL da API
  const API_URL = '/api/';

  const effects: Effect[] = [
    { id: 0, name: 'Estático', description: 'Cor fixa' },
    { id: 1, name: 'Rainbow', description: 'Arco-íris giratório' },
    { id: 2, name: 'Fade', description: 'Esmaecimento' },
    { id: 3, name: 'Color Cycle', description: 'Mudança gradual' }
  ];

  // Funções de conversão
  const rgbToHsb = useCallback((r: number, g: number, b: number): HSB => {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    
    let h = 0;
    if (diff !== 0) {
      if (max === r) {
        h = ((g - b) / diff) % 6;
      } else if (max === g) {
        h = (b - r) / diff + 2;
      } else {
        h = (r - g) / diff + 4;
      }
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    
    const s = max === 0 ? 0 : Math.round((diff / max) * 100);
    const brightness = Math.round(max * 255);
    
    return { h, s, b: brightness };
  }, []);

  const hsbToRgb = useCallback((h: number, s: number, b: number): Color => {
    h = h % 360;
    s = s / 100;
    b = b / 255; 
    
    const c = b * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = b - c;
    
    let r: number, g: number, bl: number;
    
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
  }, []);

  const rgbToHex = useCallback((r: number, g: number, b: number): string => {
    return '#' + 
      r.toString(16).padStart(2, '0') + 
      g.toString(16).padStart(2, '0') + 
      b.toString(16).padStart(2, '0');
  }, []);

  const hexToRgb = useCallback((hex: string): Color | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }, []);

  // Valores derivados do estado principal
  const hsb = rgbToHsb(color.r, color.g, color.b);
  const hexColor = rgbToHex(color.r, color.g, color.b);

  // Manipuladores do color picker
  const handleColorPanelClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!colorPanelRef.current) return;
    
    const rect = colorPanelRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    const newSaturation = Math.round(x * 100);
    const newBrightness = Math.round((1 - y) * 255);
    
    const newRgb = hsbToRgb(hsb.h, newSaturation, newBrightness);
    setColor(newRgb);
  }, [hsb.h, hsbToRgb]);

  const handleHueSliderClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!hueSliderRef.current) return;
    
    const rect = hueSliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newHue = Math.round(x * 360);
    
    const newRgb = hsbToRgb(newHue, hsb.s, hsb.b);
    setColor(newRgb);
  }, [hsb.s, hsb.b, hsbToRgb]);

  // Funções de edição
  const startEditing = (field: EditableFieldType, currentValue: string | number) => {
    setEditingField(field);
    setTempValues({ ...tempValues, [field]: currentValue.toString() });
  };

  const handleEditChange = (field: EditableFieldType, value: string) => {
    setTempValues({ ...tempValues, [field]: value });
  };

  const finishEditing = (field: EditableFieldType) => {
    const value = tempValues[field];
    let newColor = { ...color };
    
    switch (field) {
      case 'r':
        const r = Math.max(0, Math.min(255, parseInt(value) || 0));
        newColor.r = r;
        break;
      case 'g':
        const g = Math.max(0, Math.min(255, parseInt(value) || 0));
        newColor.g = g;
        break;
      case 'b':
        const b = Math.max(0, Math.min(255, parseInt(value) || 0));
        newColor.b = b;
        break;
      case 'h':
        const h = Math.max(0, Math.min(360, parseInt(value) || 0));
        const rgbFromH = hsbToRgb(h, hsb.s, hsb.b);
        newColor = rgbFromH;
        break;
      case 's':
        const s = Math.max(0, Math.min(100, parseInt(value) || 0));
        const rgbFromS = hsbToRgb(hsb.h, s, hsb.b);
        newColor = rgbFromS;
        break;
      case 'v':
        const v = Math.max(0, Math.min(255, parseInt(value) || 0));
        const rgbFromV = hsbToRgb(hsb.h, hsb.s, v);
        newColor = rgbFromV;
        break;
      case 'hex':
        const hexRgb = hexToRgb(value);
        if (hexRgb) newColor = hexRgb;
        break;
    }
    
    setColor(newColor);
    setEditingField(null);
    setTempValues({});
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempValues({});
  };

  // Verificar status da conexão
  const checkConnection = async () => {
    try {
      const response = await fetch(`${API_URL}`);
      const data: ApiResponse = await response.json();
      setIsConnected(data.connected);
    } catch {
      setIsConnected(false);
    }
  };

  const showMessage = (msg: string, duration = 3000) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), duration);
  };

  // Enviar cor para o Arduino
  const sendColor = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'color',
          r: color.r,
          g: color.g,
          b: color.b,
          brightness: brightness
        })
      });

      const data: ApiResponse = await response.json();
      if (data.success) {
        showMessage('✓ Cor aplicada!');
      } else {
        showMessage('❌ Erro: ' + data.error);
      }
    } catch {
      showMessage('❌ Erro de conexão');
    }
    setLoading(false);
  };

  // Enviar efeito para o Arduino
  const sendEffect = async (effectId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'effect',
          effect: effectId,
          brightness: brightness
        })
      });

      const data: ApiResponse = await response.json();
      if (data.success) {
        setEffect(effectId);
        showMessage(`✓ Efeito ${data.effectName} ativado!`);
      } else {
        showMessage('❌ Erro: ' + data.error);
      }
    } catch {
      showMessage('❌ Erro de conexão');
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save' })
      });

      const data: ApiResponse = await response.json();
      if (data.success) {
        showMessage('✓ Configurações salvas!');
      } else {
        showMessage('❌ Erro ao salvar');
      }
    } catch {
      showMessage('❌ Erro de conexão');
    }
    setLoading(false);
  };

  const resetConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });

      const data: ApiResponse = await response.json();
      if (data.success) {
        showMessage('✓ Configurações resetadas!');
        setColor({ r: 255, g: 0, b: 0 });
        setBrightness(255);
        setEffect(0);
      } else {
        showMessage('❌ Erro ao resetar');
      }
    } catch {
      showMessage('❌ Erro de conexão');
    }
    setLoading(false);
  };

  const reconnect = async () => {
    setLoading(true);
    try {
      await fetch(`${API_URL}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reconnect' })
      });
      setTimeout(checkConnection, 2000);
      showMessage('🔄 Tentando reconectar...');
    } catch {
      showMessage('❌ Erro ao reconectar');
    }
    setLoading(false);
  };

  // Cores predefinidas
  const presetColors: PresetColor[] = [
    { name: 'Vermelho', r: 255, g: 0, b: 0 },
    { name: 'Verde', r: 0, g: 255, b: 0 },
    { name: 'Azul', r: 0, g: 0, b: 255 },
    { name: 'Amarelo', r: 255, g: 255, b: 0 },
    { name: 'Magenta', r: 255, g: 0, b: 255 },
    { name: 'Ciano', r: 0, g: 255, b: 255 },
    { name: 'Branco', r: 255, g: 255, b: 255 },
    { name: 'Laranja', r: 255, g: 165, b: 0 }
  ];

  // Verificar conexão periodicamente
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  // Gradientes para o picker
  const hueGradient = 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)';
  const satBrightGradient = `linear-gradient(to right, #fff, hsl(${hsb.h}, 100%, 50%)), linear-gradient(to bottom, rgba(0,0,0,0), #000)`;

  // Componente de campo editável
  const EditableField = ({ label, value, field, suffix = '' }: EditableFieldProps) => (
    <div className="bg-white/10 p-3 rounded-lg">
      <div className="text-xs uppercase tracking-wider mb-1 text-center text-white/70 flex items-center justify-center gap-1">
        {label}
        <Edit3 className="w-3 h-3" />
      </div>
      {editingField === field ? (
        <input
          type="text"
          value={tempValues[field] || ''}
          onChange={(e) => handleEditChange(field, e.target.value)}
          onBlur={() => finishEditing(field)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') finishEditing(field);
            if (e.key === 'Escape') cancelEditing();
          }}
          className="w-full bg-white/20 text-white text-center font-mono rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
          autoFocus
        />
      ) : (
        <div
          onClick={() => startEditing(field, value)}
          className="font-mono text-center text-white cursor-pointer hover:bg-white/10 rounded px-2 py-1 transition-colors"
        >
          {value}{suffix}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Palette className="w-10 h-10" />
            Controlador LED
          </h1>
          <div className="flex items-center justify-center gap-2">
            {isConnected ? (
              <><Wifi className="w-5 h-5 text-green-400" /><span className="text-green-400">Conectado</span></>
            ) : (
              <><WifiOff className="w-5 h-5 text-red-400" /><span className="text-red-400">Desconectado</span></>
            )}
          </div>
        </div>

        {/* Mensagem de status */}
        {message && (
          <div className="bg-black/30 backdrop-blur border border-white/20 rounded-lg p-3 mb-6 text-center text-white">
            {message}
          </div>
        )}

        {/* Controles principais */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Color Picker Visual */}
          <div className="bg-black/30 backdrop-blur border border-white/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Seletor de Cores
            </h2>
            
            {/* Painel de cor */}
            <div className="relative mb-4" style={{ height: '200px' }}>
              <div
                ref={colorPanelRef}
                onClick={handleColorPanelClick}
                onMouseDown={(e) => {
                  const handleMove = (moveEvent: MouseEvent) => handleColorPanelClick(moveEvent as unknown as React.MouseEvent<HTMLDivElement>);
                  const handleUp = () => {
                    document.removeEventListener('mousemove', handleMove);
                    document.removeEventListener('mouseup', handleUp);
                  };
                  document.addEventListener('mousemove', handleMove);
                  document.addEventListener('mouseup', handleUp);
                  handleColorPanelClick(e);
                }}
                className="absolute inset-0 cursor-crosshair rounded-lg"
                style={{
                  background: satBrightGradient,
                  backgroundBlendMode: 'multiply'
                }}
              ></div>
              
              <div
                className="absolute w-4 h-4 border-2 border-white rounded-full -ml-2 -mt-2 pointer-events-none shadow-lg"
                style={{
                  left: `${hsb.s}%`,
                  top: `${100 - (hsb.b / 255 * 100)}%`,
                  backgroundColor: hexColor,
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.3)'
                }}
              ></div>
            </div>
            
            {/* Slider de matiz */}
            <div className="relative h-6 mb-6">
              <div
                ref={hueSliderRef}
                onClick={handleHueSliderClick}
                onMouseDown={(e) => {
                  const handleMove = (moveEvent: MouseEvent) => handleHueSliderClick(moveEvent as unknown as React.MouseEvent<HTMLDivElement>);
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
                className="absolute top-0 w-6 h-6 border-2 border-white rounded-full -ml-3 pointer-events-none shadow-lg"
                style={{
                  left: `${(hsb.h / 360) * 100}%`,
                  backgroundColor: `hsl(${hsb.h}, 100%, 50%)`,
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.3)'
                }}
              ></div>
            </div>
            
            {/* Campos editáveis de cor */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <EditableField label="R" value={color.r} field="r" />
              <EditableField label="G" value={color.g} field="g" />
              <EditableField label="B" value={color.b} field="b" />
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <EditableField label="H" value={hsb.h} field="h" suffix="°" />
              <EditableField label="S" value={hsb.s} field="s" suffix="%" />
              <EditableField label="V" value={hsb.b} field="v" />
            </div>

            <div className="mb-4">
              <EditableField label="HEX" value={hexColor} field="hex" />
            </div>

            {/* Cores predefinidas */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {presetColors.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => setColor({ r: preset.r, g: preset.g, b: preset.b })}
                  className="aspect-square rounded-lg border-2 border-white/30 hover:border-white/60 transition-colors hover:scale-105 transform"
                  style={{ backgroundColor: `rgb(${preset.r}, ${preset.g}, ${preset.b})` }}
                  title={preset.name}
                />
              ))}
            </div>

            <button
              onClick={sendColor}
              disabled={loading || !isConnected}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-[1.02]"
            >
              {loading ? 'Enviando...' : 'Aplicar Cor'}
            </button>
          </div>

          {/* Controle de efeitos */}
          <div className="bg-black/30 backdrop-blur border border-white/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Efeitos
            </h2>

            <div className="space-y-3 mb-4">
              {effects.map((eff) => (
                <button
                  key={eff.id}
                  onClick={() => sendEffect(eff.id)}
                  disabled={loading || !isConnected}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left transform hover:scale-[1.02] ${
                    effect === eff.id
                      ? 'border-cyan-400 bg-cyan-400/20 text-cyan-100 shadow-lg shadow-cyan-400/20'
                      : 'border-white/30 hover:border-white/60 text-white hover:bg-white/5'
                  }`}
                >
                  <div className="font-semibold">{eff.name}</div>
                  <div className="text-sm opacity-70">{eff.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Controles de brilho e sistema */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Brilho */}
          <div className="bg-black/30 backdrop-blur border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Brilho: {brightness}</h3>
            <input
              type="range"
              min="1"
              max="255"
              value={brightness}
              onChange={(e) => setBrightness(parseInt(e.target.value))}
              className="w-full h-2 bg-yellow-200 rounded-lg appearance-none cursor-pointer mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setBrightness(50)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Baixo
              </button>
              <button
                onClick={() => setBrightness(128)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Médio
              </button>
              <button
                onClick={() => setBrightness(255)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Alto
              </button>
            </div>
          </div>

          {/* Controles do sistema */}
          <div className="bg-black/30 backdrop-blur border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Sistema</h3>
            <div className="space-y-3">
              <button
                onClick={saveConfig}
                disabled={loading || !isConnected}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
              >
                <Save className="w-4 h-4" />
                Salvar na Memória
              </button>
              <button
                onClick={resetConfig}
                disabled={loading || !isConnected}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Padrão
              </button>
              <button
                onClick={reconnect}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
              >
                <Wifi className="w-4 h-4" />
                Reconectar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LEDController;