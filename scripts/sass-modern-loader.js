'use strict';

const fs = require('fs');
const path = require('path');
const { fileURLToPath, pathToFileURL } = require('url');
const { getOptions } = require('loader-utils');
const sass = require('sass');

const SASS_EXTENSIONS = ['.scss', '.sass', '.css'];

function isProductionLikeMode(loaderContext) {
  return loaderContext.mode === 'production' || !loaderContext.mode;
}

function getSyntax(resourcePath) {
  return path.extname(resourcePath).toLowerCase() === '.sass' ? 'indented' : 'scss';
}

function getBaseUrl(rootContext) {
  try {
    const jsConfig = JSON.parse(
      fs.readFileSync(path.join(rootContext, 'jsconfig.json'), 'utf8'),
    );

    return jsConfig.compilerOptions && jsConfig.compilerOptions.baseUrl;
  } catch (error) {
    return null;
  }
}

function getLoadPaths(rootContext) {
  const paths = [rootContext, path.join(rootContext, 'node_modules')];
  const baseUrl = getBaseUrl(rootContext);

  if (baseUrl) {
    paths.push(path.resolve(rootContext, baseUrl));
  }

  if (process.env.SASS_PATH) {
    paths.push(...process.env.SASS_PATH.split(path.delimiter).filter(Boolean));
  }

  return [...new Set(paths)];
}

function resolveExistingFile(requestPath) {
  if (fs.existsSync(requestPath) && fs.statSync(requestPath).isFile()) {
    return requestPath;
  }

  const extension = path.extname(requestPath);
  const directory = path.dirname(requestPath);
  const basename = path.basename(requestPath, extension);
  const extensions = extension ? [''] : SASS_EXTENSIONS;
  const candidates = [];

  for (const ext of extensions) {
    candidates.push(path.join(directory, `_${basename}${ext}`));
    candidates.push(path.join(directory, `${basename}${ext}`));
  }

  for (const ext of SASS_EXTENSIONS) {
    candidates.push(path.join(requestPath, `_index${ext}`));
    candidates.push(path.join(requestPath, `index${ext}`));
  }

  return candidates.find(candidate => (
    fs.existsSync(candidate) && fs.statSync(candidate).isFile()
  ));
}

function createWebpackLikeImporter(rootContext) {
  const loadPaths = getLoadPaths(rootContext);

  return {
    findFileUrl(url) {
      if (url.startsWith('sass:')) {
        return null;
      }

      const request = url.startsWith('~') ? url.slice(1) : url;

      if (request.startsWith('.') || path.isAbsolute(request)) {
        return null;
      }

      for (const loadPath of loadPaths) {
        const resolved = resolveExistingFile(path.join(loadPath, request));

        if (resolved) {
          return pathToFileURL(resolved);
        }
      }

      return null;
    },
  };
}

function getSassOptions(loaderContext, loaderOptions) {
  if (typeof loaderOptions.sassOptions === 'function') {
    return loaderOptions.sassOptions(loaderContext) || {};
  }

  return loaderOptions.sassOptions || {};
}

async function getContent(content, loaderContext, loaderOptions) {
  if (!loaderOptions.additionalData) {
    return content;
  }

  if (typeof loaderOptions.additionalData === 'function') {
    return loaderOptions.additionalData(content, loaderContext);
  }

  return `${loaderOptions.additionalData}\n${content}`;
}

function normalizeSourceMap(sourceMap, rootContext) {
  if (!sourceMap) {
    return null;
  }

  return {
    ...sourceMap,
    file: undefined,
    sourceRoot: '',
    sources: sourceMap.sources.map(source => {
      try {
        return path.normalize(fileURLToPath(source));
      } catch (error) {
        return path.resolve(rootContext, path.normalize(source));
      }
    }),
  };
}

module.exports = function modernSassLoader(content) {
  const callback = this.async();
  const options = getOptions(this) || {};
  const sassOptions = getSassOptions(this, options);
  const {
    includePaths = [],
    outputStyle,
    ...modernSassOptions
  } = sassOptions;
  const useSourceMap = typeof options.sourceMap === 'boolean'
    ? options.sourceMap
    : this.sourceMap;
  const rootContext = this.rootContext || process.cwd();

  getContent(content, this, options).then(data => sass.compileStringAsync(data, {
    ...modernSassOptions,
    url: modernSassOptions.url || pathToFileURL(this.resourcePath),
    syntax: modernSassOptions.syntax || getSyntax(this.resourcePath),
    style: modernSassOptions.style
      || outputStyle
      || (isProductionLikeMode(this) ? 'compressed' : 'expanded'),
    sourceMap: modernSassOptions.sourceMap ?? useSourceMap,
    sourceMapIncludeSources: modernSassOptions.sourceMapIncludeSources ?? true,
    loadPaths: [
      ...getLoadPaths(rootContext),
      ...(modernSassOptions.loadPaths || []),
      ...includePaths,
    ],
    importers: [
      createWebpackLikeImporter(rootContext),
      ...(modernSassOptions.importers || []),
    ],
  })).then(result => {
    result.loadedUrls.forEach(url => {
      if (url.protocol === 'file:') {
        this.addDependency(fileURLToPath(url));
      }
    });

    callback(null, result.css, normalizeSourceMap(result.sourceMap, rootContext));
  }).catch(error => {
    callback(error);
  });
};
