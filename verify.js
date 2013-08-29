var fs = require('fs')
  , cwd = process.cwd()
  , readdirp = require('readdirp')
  , logger = require('loggerjs')('modverify')
  , regex = /(.*)require\(([\'\"])([^\.\'\"]+)([\'\"])(.*)/
  , regex2 = /(.*)require\(([\'\"])([^\'\"]+)([\'\"])(.*)/
  , _ = require('underscore')
  , defaultModules = ['child_process', 'assert', 'cluster', 'crypto', 'dns', 'domain', 'events', 'fs', 'http', 'https', 'net', 'os', 'path', 'querystring', 'repl', 'readline', 'stream', 'tls', 'punycode', 'string_decoder', 'dgram', 'url', 'util', 'vm', 'zlib']
  , async = require('async')
  , path = require('path')
  , verify = exports

var nodeModules = []
var relativeModules = {}

verify.processFile = function(f, cb) {
  f = f.fullPath
  var e = fs.createReadStream(f)
  e.on('data', function(chunk) {
    chunk = chunk.toString()
    var lines = chunk.split("\n")
    lines.forEach(function(line) {
      if (line === "" || !line) return
      if (matches = line.match(regex)) {
        var req = matches[3]
        nodeModules.push(req)
      }
      if (matches2 = line.match(regex2)) {
        var r = matches2[3]
        if (r.substr(0, 1) !== '.') return
        var p = path.join(path.dirname(f), r)
        if (!relativeModules.hasOwnProperty(p)) {
          relativeModules[p] = []
        }
        relativeModules[p].push(f)
      }
    })
  })
  e.on('end', function() {
    return cb && cb()
  })
}

verify.readFiles = function(cb) {
  var self = this
  readdirp({
      directoryFilter: ['!.git', '!node_modules', '!components']
    , fileFilter: ['*.js']  
  }, function(err, res) {
    if (err) {
      err.forEach(function(e) {
        logger.error('Error: ', e)
      })
      return cb && cb(err)
    } else {
      var processFile = self.processFile
      async.each(res.files, processFile, function(err) {
        if (err) {
          logger.error('Error processing files: ', err)
          return cb && cb(err)
        } else {
          nodeModules = _.difference(nodeModules, defaultModules)
          nodeModules = _.unique(nodeModules)
          return cb && cb(null, nodeModules, relativeModules)
        }
      })
    }
  })  
}

verify.fileWithNameExists = function(fp) {
  if (~fp.indexOf('.js')) {
    return fs.existsSync(fp)
  }
  var f = fp+'.js'
  if (fs.existsSync(f)) return true
  
  f = fp+'.json'
  if (fs.existsSync(f)) return true
  
  f = path.join(fp, 'index.js')
  if (fs.existsSync(f)) return true
  
  f = path.join(fp, 'lib', 'index.js')
  if (fs.existsSync(f)) return true
  
  return false
}


verify.processForDir = function(dir, cb) {
  var self = this
  fs.exists(path.join(dir, 'package.json'), function(e) {
    if (!e) {
      logger.error('Unable to find package.json')
      process.exit(1)
    } else {
      self.readFiles(function(err, modules, relativeModules) {
        if (err) return cb && cb(err)
        var pkg = require(path.join(cwd, 'package.json'))
        var deps = pkg.dependencies
          , devDeps = pkg.devDependencies || {}
        var output = {};
        output.modules = modules
        output.relativeModules = relativeModules
        return cb && cb(null, output)
      })  
    }
  })
}