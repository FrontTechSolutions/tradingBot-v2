module.exports = {
  apps: [
    {
      name: 'tbv2-dev',
      script: 'app.js',
      interpreter: 'tsx',
      env: {
        NODE_ENV: 'development',
        ENVIRONMENT: 'DEV' // Ajout crucial pour le ConfigService
      }
    },
    {
      name: 'tbv2-prod',
      script: 'app.js',
      interpreter: 'tsx',
      env: {
        NODE_ENV: 'production',
        ENVIRONMENT: 'PROD' // Ajout crucial pour le ConfigService
      }
    },    
  ],
};