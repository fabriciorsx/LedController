const { SerialPort } = require('serialport');

const port = new SerialPort({ path: 'COM3', baudRate: 9600 });

port.on('open', () => {
  console.log('Porta serial aberta!');
  port.write('<255, 0, 0, 255>');
});

port.on('error', (err) => {
  console.error('Erro na porta serial: ', err.message);
});