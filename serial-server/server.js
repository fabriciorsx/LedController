const express = require('express');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuração da porta serial
//const SERIAL_PORT = '/dev/ttyUSB3'; // Linux/Mac - ajuste conforme necessário
const SERIAL_PORT = 'COM3'; // Windows - ajuste conforme necessário
const BAUD_RATE = 9600;

let serialPort = null;
let isConnected = false;

// Conectar ao Arduino
function connectArduino() {
    try {
        serialPort = new SerialPort({
            path: SERIAL_PORT,
            baudRate: BAUD_RATE,
        });

        const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

        serialPort.on('open', () => {
            console.log('✓ Conectado ao Arduino na porta:', SERIAL_PORT);
            isConnected = true;
        });

        serialPort.on('error', (err) => {
            console.error('Erro na porta serial:', err.message);
            isConnected = false;
        });

        serialPort.on('close', () => {
            console.log('Conexão serial fechada');
            isConnected = false;
        });

        // Receber dados do Arduino
        parser.on('data', (data) => {
            console.log('Arduino:', data.trim());
        });

    } catch (error) {
        console.error('Erro ao conectar:', error.message);
        isConnected = false;
    }
}

// Enviar comando para o Arduino
function sendToArduino(command) {
    if (!isConnected || !serialPort) {
        throw new Error('Arduino não conectado');
    }
    
    serialPort.write(command + '\n');
    console.log('Enviado para Arduino:', command);
}

// Rotas da API

// Status da conexão
app.get('/api/status', (req, res) => {
    res.json({ 
        connected: isConnected,
        port: SERIAL_PORT 
    });
});

// Definir cor estática
app.post('/api/color', (req, res) => {
    try {
        const { r, g, b, brightness = 255 } = req.body;
        
        // Validar valores
        if (![r, g, b].every(val => val >= 0 && val <= 255)) {
            return res.status(400).json({ error: 'Valores RGB devem estar entre 0 e 255' });
        }
        
        if (brightness < 1 || brightness > 255) {
            return res.status(400).json({ error: 'Brilho deve estar entre 1 e 255' });
        }

        const command = `<${r}, ${g}, ${b}, ${brightness}>`;
        sendToArduino(command);
        
        res.json({ 
            success: true, 
            command: command,
            color: { r, g, b, brightness }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Definir efeito
app.post('/api/effect', (req, res) => {
    try {
        const { effect, brightness = 255 } = req.body;
        
        // Validar efeito (0-3 conforme código Arduino)
        if (effect < 0 || effect > 3) {
            return res.status(400).json({ error: 'Efeito deve estar entre 0 e 3' });
        }
        
        if (brightness < 1 || brightness > 255) {
            return res.status(400).json({ error: 'Brilho deve estar entre 1 e 255' });
        }

        const command = `<effect=${effect}, ${brightness}>`;
        sendToArduino(command);
        
        const effectNames = ['Estático', 'Rainbow', 'Fade', 'Color Cycle'];
        
        res.json({ 
            success: true, 
            command: command,
            effect: effect,
            effectName: effectNames[effect],
            brightness: brightness
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Salvar configurações na EEPROM
app.post('/api/save', (req, res) => {
    try {
        sendToArduino('<save>');
        res.json({ success: true, message: 'Configurações salvas' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reset para valores padrão
app.post('/api/reset', (req, res) => {
    try {
        sendToArduino('<reset>');
        res.json({ success: true, message: 'Configurações resetadas' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obter status atual
app.get('/api/arduino-status', (req, res) => {
    try {
        sendToArduino('<status>');
        res.json({ success: true, message: 'Status solicitado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reconectar ao Arduino
app.post('/api/reconnect', (req, res) => {
    try {
        if (serialPort && isConnected) {
            serialPort.close();
        }
        setTimeout(() => {
            connectArduino();
        }, 1000);
        
        res.json({ success: true, message: 'Tentando reconectar...' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando em http://0.0.0.0:${PORT}`);
    console.log(`📡 Acesse de qualquer dispositivo na rede local`);
    console.log(`🔧 Tentando conectar ao Arduino...`);
    connectArduino();
});

// Tratar fechamento gracioso
process.on('SIGINT', () => {
    console.log('\n🛑 Fechando servidor...');
    if (serialPort && isConnected) {
        serialPort.close();
    }
    process.exit(0);
});