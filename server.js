// Central Coalfields Limited - DVMS Production Entrypoint
// Forwards execution and starts backend/server.js
const { startServer } = require('./backend/server.js');
if (typeof startServer === 'function') {
  startServer();
}