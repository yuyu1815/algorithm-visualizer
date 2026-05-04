'use strict';

const Module = require('module');
const path = require('path');

const modernSassLoaderPath = path.join(__dirname, 'sass-modern-loader.js');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  // CRA 3 does not expose sass-loader options, so route its loader lookup here.
  if (request === 'sass-loader') {
    return modernSassLoaderPath;
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};
