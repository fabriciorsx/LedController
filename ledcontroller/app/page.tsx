'use client'
import React, { useState, useEffect, useRef } from 'react';
import { Palette, Zap, Save, RotateCcw, Wifi, WifiOff } from 'lucide-react';

const LEDController = () => {
  const [color, setColor] = useState({ r: 255, g: 0, b: 0 });
  const [brightness, setBrightness] = useState(255);
  const [effect, setEffect] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Estados para o color picker
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [pickerBrightness, setPickerBrightness] = useState(255);
  const [hexColor, setHexColor] = useState('#ff0000');
  
  const colorPanelRef = useRef(null);
  const hueSliderRef = useRef(null);

  // URL da API
  const API_URL = '/api/';

  const effects = [
    { id: 0, name: 'Estático', description: 'Cor fixa' },
    { id: 1, name: 'Rainbow', description: 'Arco-íris giratório' },
    { id: 2, name: 'Fade', description: 'Esmaecimento' },
    { id: 3, name: 'Color Cycle', description: 'Mudança gradual' }
  ];

  // Função para converter HSB para RGB
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

  // Função para converter RGB para HSB
  const rgbToHsb = (r, g, b) => {
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
  };

  // Atualizar cor quando picker mudar
  useEffect(() => {
    const rgb = hsbToRgb(hue, saturation, pickerBrightness);
    setColor({ r: rgb.r, g: rgb.g, b: rgb.b });
    
    const hexValue = '#' + 
      rgb.r.toString(16).padStart(2, '0') + 
      rgb.g.toString(16).padStart(2, '0') + 
      rgb.b.toString(16).padStart(2, '0');
    
    setHexColor(hexValue);
  }, [hue, saturation, pickerBrightness]);

  // Atualizar picker quando cor RGB mudar
  useEffect(() => {
    const hsb = rgbToHsb(color.r, color.g, color.b);
    setHue(hsb.h);
    setSaturation(hsb.s);
    setPickerBrightness(hsb.b);
  }, [color.r, color.g, color.b]);

  // Manipuladores do color picker
  const handleColorPanelClick = (e) => {
    if (!colorPanelRef.current) return;
    
    const rect = colorPanelRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    setSaturation(Math.round(x * 100));
    setPickerBrightness(Math.round((1 - y) * 255));
  };

  const handleHueSliderClick = (e) => {
    if (!hueSliderRef.current) return;
    
    const rect = hueSliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHue(Math.round(x * 360));
  };

  // Verificar status da conexão
  const checkConnection = async () => {
    try {
      const response = await fetch(`${API_URL}`);
      const data = await response.json();
      setIsConnected(data.connected);
    } catch (error) {
      setIsConnected(false);
    }
  };

  const showMessage = (msg, duration = 3000) => {
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

      const data = await response.json();
      if (data.success) {
        showMessage('✓ Cor aplicada!');
      } else {
        showMessage('❌ Erro: ' + data.error);
      }
    } catch (error) {
      showMessage('❌ Erro de conexão');
    }
    setLoading(false);
  };

  // Enviar efeito para o Arduino
  const sendEffect = async (effectId) => {
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

      const data = await response.json();
      if (data.success) {
        setEffect(effectId);
        showMessage(`✓ Efeito ${data.effectName} ativado!`);
      } else {
        showMessage('❌ Erro: ' + data.error);
      }
    } catch (error) {
      showMessage('❌ Erro de conexão');
    }
    setLoading(false);
  };

  // Salvar configurações
  const saveConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save' })
      });

      const data = await response.json();
      if (data.success) {
        showMessage('✓ Configurações salvas!');
      } else {
        showMessage('❌ Erro ao salvar');
      }
    } catch (error) {
      showMessage('❌ Erro de conexão');
    }
    setLoading(false);
  };

  // Reset configurações
  const resetConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });

      const data = await response.json();
      if (data.success) {
        showMessage('✓ Configurações resetadas!');
        setColor({ r: 255, g: 0, b: 0 });
        setBrightness(255);
        setEffect(0);
      } else {
        showMessage('❌ Erro ao resetar');
      }
    } catch (error) {
      showMessage('❌ Erro de conexão');
    }
    setLoading(false);
  };

  // Reconectar
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
    } catch (error) {
      showMessage('❌ Erro ao reconectar');
    }
    setLoading(false);
  };

  // Cores predefinidas
  const presetColors = [
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
  const satBrightGradient = `
    linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%)),
    linear-gradient(to bottom, rgba(0,0,0,0), #000)
  `;

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
                  const handleMove = (moveEvent) => handleColorPanelClick(moveEvent);
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
                className="absolute w-4 h-4 border-2 border-white rounded-full -ml-2 -mt-2 pointer-events-none"
                style={{
                  left: `${saturation}%`,
                  top: `${100 - (pickerBrightness / 255 * 100)}%`,
                  backgroundColor: hexColor
                }}
              ></div>
            </div>
            
            {/* Slider de matiz */}
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
            
            {/* Valores de cor e cores predefinidas */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white/10 p-3 rounded-lg">
                <div className="text-xs uppercase tracking-wider mb-1 text-center text-white/70">RGB</div>
                <div className="font-mono text-center text-white">{color.r}, {color.g}, {color.b}</div>
              </div>
              <div className="bg-white/10 p-3 rounded-lg">
                <div className="text-xs uppercase tracking-wider mb-1 text-center text-white/70">HEX</div>
                <div className="font-mono text-center text-white">{hexColor}</div>
              </div>
            </div>

            {/* Cores predefinidas */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {presetColors.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => setColor({ r: preset.r, g: preset.g, b: preset.b })}
                  className="aspect-square rounded-lg border-2 border-white/30 hover:border-white/60 transition-colors"
                  style={{ backgroundColor: `rgb(${preset.r}, ${preset.g}, ${preset.b})` }}
                  title={preset.name}
                />
              ))}
            </div>

            <button
              onClick={sendColor}
              disabled={loading || !isConnected}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
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
                  className={`w-full p-3 rounded-lg border-2 transition-colors text-left ${
                    effect === eff.id
                      ? 'border-cyan-400 bg-cyan-400/20 text-cyan-100'
                      : 'border-white/30 hover:border-white/60 text-white'
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
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
              >
                Baixo
              </button>
              <button
                onClick={() => setBrightness(128)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
              >
                Médio
              </button>
              <button
                onClick={() => setBrightness(255)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
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
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar na Memória
              </button>
              <button
                onClick={resetConfig}
                disabled={loading || !isConnected}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Padrão
              </button>
              <button
                onClick={reconnect}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
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