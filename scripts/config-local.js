#!/usr/bin/env node

/**
 * 🔧 Vérification Configuration LOCAL
 */

process.env.ENVIRONMENT = 'LOCAL';
process.env.NODE_ENV = 'LOCAL';

const ConfigService = require('../src/config/ConfigService');
new ConfigService().displayConfigSummary();