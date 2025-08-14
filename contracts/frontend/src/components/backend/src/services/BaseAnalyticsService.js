package.json
{
  "name": "base-defi-analytics",
  "version": "1.0.0",
  "description": "Advanced DeFi analytics platform for Base blockchain with real-time data visualization and yield optimization",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "build": "webpack --mode production",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "deploy:contracts": "hardhat run scripts/deploy.js --network base",
    "compile": "hardhat compile",
    "verify": "hardhat verify --network base"
  },
  "keywords": [
    "base",
    "blockchain",
    "defi",
    "analytics",
    "yield-farming",
    "arbitrage",
    "ethereum",
    "web3",
    "smart-contracts",
    "dapp",
    "base-builder-rewards"
  ],
  "author": "davidsebil",
  "license": "MIT",
  "dependencies": {
    "@openzeppelin/contracts": "^4.9.3",
    "@uniswap/v3-sdk": "^3.10.0",
    "@uniswap/sdk-core": "^4.0.7",
    "ethers": "^6.7.1",
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "web3": "^4.1.1",
    "axios": "^1.5.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0",
    "redis": "^4.6.8",
    "mongoose": "^7.5.0",
    "node-cron": "^3.0.2",
    "winston": "^3.10.0",
    "joi": "^17.9.2",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "rate-limiter-flexible": "^2.4.2"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^3.0.2",
    "@types/node": "^20.5.9",
    "@typescript-eslint/eslint-plugin": "^6.5.0",
    "@typescript-eslint/parser": "^6.5.0",
    "eslint": "^8.48.0",
    "hardhat": "^2.17.1",
    "jest": "^29.6.4",
    "nodemon": "^3.0.1",
    "supertest": "^6.3.3",
    "typescript": "^5.2.2",
    "webpack": "^5.88.2",
    "webpack-cli": "^5.1.4"
  },
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/wearedood/base-defi-analytics.git"
  },
  "bugs": {
    "url": "https://github.com/wearedood/base-defi-analytics/issues"
  },
  "homepage": "https://github.com/wearedood/base-defi-analytics#readme"
}
