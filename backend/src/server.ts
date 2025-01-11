import app from './app';
import clc from 'cli-color';

const PORT = parseInt(process.env.PORT || '3000');

const asciiArt = `
░▒▓██████▓▒░  
░▒▓█▓▒░░▒▓█▓▒░ 
░▒▓█▓▒░                Welcome to cafeXpress
░▒▓█▓▒░                
░▒▓█▓▒░        
░▒▓█▓▒░░▒▓█▓▒░ 
 ░▒▓██████▓▒░  
  `;

const start = async () => {
  try {
    await app.listen({
      port: PORT,
      host: '0.0.0.0'
    });
    console.log(`
        ${clc.blueBright(asciiArt)}
      Address: ${app.addresses()[0].address}
      Port: ${app.addresses()[0].port}
      `);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

start();
