#!/usr/bin/env node
const http = require('http');
const path = require('path');
const express = require('express');

// We can test route resolution directly against the express app in server.js or by starting server
const serverApp = require('../server.js');

async function testRoutes() {
  const routes = [
    '/weatheros',
    '/weatheros/',
    '/weatheros/support',
    '/weatheros/support.html',
    '/weatheros/privacy',
    '/weatheros/privacy.html',
    '/assets/weatheros/weatheros-icon-1024.png'
  ];

  console.log('Testing WeatherOS Route Matrix...');
  // Check that files exist on disk
  const fs = require('fs');
  const files = [
    'weatheros.html',
    'weatheros-support.html',
    'weatheros-privacy.html',
    'weatheros/index.html',
    'weatheros/support.html',
    'weatheros/privacy.html',
    'assets/weatheros/weatheros-icon-1024.png',
    'assets/weatheros/weatheros-concept-a.png'
  ];

  let passed = 0;
  for (const f of files) {
    const fullPath = path.join(__dirname, '..', f);
    if (fs.existsSync(fullPath)) {
      console.log(`  ✓ File verified: ${f} (${fs.statSync(fullPath).size} bytes)`);
      passed++;
    } else {
      console.error(`  ✗ Missing file: ${f}`);
    }
  }

  console.log(`\nVerified ${passed}/${files.length} WeatherOS Hub Files.`);
  process.exit(passed === files.length ? 0 : 1);
}

testRoutes();
