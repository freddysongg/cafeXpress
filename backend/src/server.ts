import buildApp from './app.js';
import clc from 'cli-color';

const PORT = parseInt(process.env.PORT || '8000', 10);

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
    const app = await buildApp();

    app.log.info('🚀 Starting server...');

    await app.listen({
      port: PORT,
      host: '0.0.0.0'
    });

    const addresses = app.addresses();
    console.log(`
        ${clc.blueBright(asciiArt)}
        ${clc.green('Server Status:')} ${clc.greenBright('Running')}
        ${clc.yellow('Address:')} ${addresses[0].address}
        ${clc.yellow('Port:')} ${addresses[0].port}
        ${clc.cyan('Environment:')} ${process.env.NODE_ENV || 'development'}
    `);
  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
};

start();
