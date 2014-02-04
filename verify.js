var fs          = require('fs')
  , cwd         = process.cwd()
  , readdirp    = require('readdirp')
  , colors      = require('colors')
  , regex       = /(.*)require\(([\'\"])([^\.\'\"]+)([\'\"])(.*)/
  , regex2      = /(.*)require\(([\'\"])([^\'\"]+)([\'\"])(.*)/
  , regex3      = /(.*)grunt\.loadNpmTasks\(([\'\"])([^\'\"]+)([\'\"])(.*)/
  , _           = require('underscore')
  , async       = require('async')
  , path        = require('path')
  , verify      = exports

defaultModules = [
    'child_process'
  , 'assert'
  , 'cluster'
  , 'crypto'
  , 'dns'
  , 'domain'
  , 'events'
  , 'fs'
  , 'http'
  , 'https'
  , 'net'
  , 'os'
  , 'path'
  , 'querystring'
  , 'repl'
  , 'readline'
  , 'stream'
  , 'tls'
  , 'punycode'
  , 'string_decoder'
  , 'dgram'
  , 'url'
  , 'util'
  , 'vm'
  , 'zlib'
]

nodeModules = []
relativeModules = {}

verify.log = require('npmlog')
verify.log.heading = 'modverify'

verify.processFile = function(f, cb) {
  f = f.fullPath
  var e = fs.createReadStream(f)
  var withinComment = false
    , commentStart = {}
  verify.log.verbose('processFile', 'checking', '`'+f+'`')
  e.on('data', function(chunk) {
    chunk = chunk.toString()
    var lines = chunk.split("\n")
    lines.forEach(function(line, idx) {
      if (line === "" || !line) return
      if (~line.substr(0, 10).indexOf('//')) return
      if (~line.indexOf('/*')) {
        withinComment = true
        commentStart.character = line.indexOf('/*')
        commentStart.line = idx
      }

      if (~line.indexOf('*/')) {
        withinComment = false
        commentStart = {};
      }

      if (matches = line.match(regex)) {
        var req = matches[3]
        if (withinComment) {
          return
        }
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

      if (matches3 = line.match(regex3)) {
        var r = matches3[3]
        nodeModules.push(r)
      }
    })
  })
  e.on('end', function() {
    return cb && cb()
  })
}

verify.readFiles = function(opts, cb) {
  var self = this
  if ('function' === typeof opts) {
    cb = opts
    opts = {
        directoryFilter: ['!.git', '!node_modules',
          '!components', '!bower_components']
      , fileFilter: ['*.js']
    };
  }
  readdirp(opts, function(err, res) {
    if (err) {
      err.forEach(function(e) {
        self.log.error('Error: ', e)
      })
      return cb && cb(err)
    } else {
      var processFile = self.processFile
      async.each(res.files, processFile, function(err) {
        if (err) {
          self.log.error('Error processing files: ', err)
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


verify.processForDir = function(dir, opts, cb) {
  var self = this
  if ('function' === typeof opts) {
    cb = opts
    opts = {
        directoryFilter: ['!.git', '!node_modules',
          '!components', '!bower_components']
      , fileFilter: ['*.js']
    };
  }
  if (!opts.fileFilter) {
    opts.fileFilter = ['*.js']
  }
  if (!opts.directoryFilter) {
    opts.directoryFilter = ['!.git', '!node_modules',
      '!components', '!bower_components']
  }
  fs.exists(path.join(dir, 'package.json'), function(e) {
    if (!e) {
      self.log.error('Unable to find package.json')
      process.exit(1)
    } else {
      self.readFiles(opts, function(err, modules, relativeModules) {
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
