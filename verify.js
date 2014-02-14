var fs          = require('fs')
  , cwd         = process.cwd()
  , readdirp    = require('readdirp')
  , colors      = require('colors')
  , detective   = require('detective')
  , regex       = /(.*)require\(([\'\"])([^\.\'\"]+)([\'\"])(.*)/
  , regex2      = /(.*)require\(([\'\"])([^\'\"]+)([\'\"])(.*)/
  , regex3      = /(.*)grunt\.loadNpmTasks\(([\'\"])([^\'\"]+)([\'\"])(.*)/
  , _           = require('underscore')
  , async       = require('async')
  , path        = require('path')
  , verify      = exports

var detectiveOpts = {
  parse: {
    loc: true
  },
  nodes: false
}

defaultModules = [
    'child_process'
  , 'assert'
  , 'buffer'
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

verify.addDep = function(dep, file) {
  if (dep && dep.length) {
    if (dep[0] === '.' || dep[0] === '/') {
      // relative module
      var p = path.join(path.dirname(file), dep)
      if (!relativeModules.hasOwnProperty(p))
        relativeModules[p] = []

      relativeModules[p].push(dep)
    } else {
      // module
      if (~defaultModules.indexOf(dep)) return
      nodeModules.push(dep)
    }
  }
}

function isRequire(node) {
  var c = node.callee
  return c
    && node.type === 'CallExpression'
    && c.type === 'Identifier'
    && c.name === 'require'
}

verify.processFile = function(f, cb) {
  f = f.fullPath
  verify.log.verbose('processFile', 'checking', '`'+f+'`')
  var opts = verify.opts
  if (opts.excludes && ~opts.excludes.indexOf(f)) {
    verify.log.verbose('exclude', f)
    return cb()
  }
  fs.readFile(f, 'utf8', function(err, contents) {
    if (err) return cb && cb(err)
    var requires = detective.find(contents, detectiveOpts)
    //verify.log.info('requires', f, requires.strings)
    //verify.log.info('nodes', f, requires.nodes)
    requires.strings.forEach(function(m) {
      verify.addDep(m, f)
    })
    return cb && cb()
  })
}

verify.readFiles = function(cb) {
  var self = this
  var opts = verify.opts
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


verify.processForDir = function(opts, cb) {
  var self = this
  if ('function' === typeof opts) {
    cb = opts
    opts = {
        directoryFilter: ['!.git', '!node_modules',
          '!components', '!bower_components']
      , fileFilter: ['*.js']
      , excludes: []
    };
  }
  if (!opts.fileFilter) {
    opts.fileFilter = ['*.js']
  }
  if (!opts.directoryFilter) {
    opts.directoryFilter = ['!.git', '!node_modules',
      '!components', '!bower_components']
  }
  if (!opts.excludes) opts.excludes = []
  opts.root = opts.root || cwd
  opts.package = opts.package || path.join(opts.root, 'package.json')
  verify.opts = opts
  fs.exists(opts.package, function(e) {
    if (!e) {
      self.log.error('Unable to find package.json')
      process.exit(1)
    } else {
      self.readFiles(function(err, modules, relativeModules) {
        if (err) return cb && cb(err)
        var pkg = require(opts.package)
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
