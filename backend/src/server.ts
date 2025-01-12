import app from './app';
import clc from 'cli-color';

const PORT = parseInt(process.env.PORT || '3000', 10);

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

    const addresses = app.addresses();
    console.log(`
        ${clc.blueBright(asciiArt)}
        Address: ${addresses[0].address}
        Port: ${addresses[0].port}
    `);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

start();
