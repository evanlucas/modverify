#!/usr/bin/env node
var cwd     = process.cwd()
  , fs      = require('fs')
  , verify  = require('../verify')
  , path    = require('path')
  , pkg     = require('../package')
  , nopt    = require('nopt')
  , knownOpts = { loglevel: ['silly', 'verbose', 'info', 'warn', 'error', 'silent']
                , version: Boolean
                , help: Boolean
                , directory: Array
                , file: Array
                , exclude: Array
                , package: path
                }
  , shortHand = { verbose: ['--loglevel', 'verbose']
                , silly: ['--loglevel', 'silly']
                , quiet: ['--loglevel', 'silent']
                , v: ['--version']
                , h: ['--help']
                , H: ['--help']
                , f: ['--file']
                , d: ['--directory']
                , e: ['--exclude']
                , p: ['--package']
                }
  , parsed = nopt(knownOpts, shortHand)

if (parsed.loglevel) verify.log.level = parsed.loglevel

if (parsed.version) {
  console.log('modverify', 'v'+pkg.version)
  process.exit()
}

if (parsed.help) {
  return help()
}

var opts = {
  directoryFilter: ['!.git', '!components', '!bower_components', '!node_modules'],
  fileFilter: ['*.js'],
  excludes: []
}

opts.root = parsed.argv.remain.length
  ? path.resolve(cwd, parsed.argv.remain[0])
  : cwd

if (parsed.directory) {
  opts.directoryFilter = parsed.directory
}

if (parsed.file) {
  opts.fileFilter = parsed.file
}

if (parsed.exclude) {
  opts.excludes = parsed.exclude.map(function(f) {
    return path.resolve(opts.root, f)
  })
}

opts.package = parsed.package || path.join(opts.root, 'package.json')

verify.processForDir(opts, function(err, results) {
  if (err) {
    verify.log.error('processing', 'Error scanning files:', err)
    process.exit(1)
  } else {
    var pkg = require(path.join(cwd, 'package.json'))
      , deps = pkg.dependencies || {}
      , devDeps = pkg.devDependencies || {}
      , optDeps = pkg.optionalDependencies || {}
      , modules = results.modules
      , relativeModules = results.relativeModules
    verify.log.info('Checking dependencies')
    modules.forEach(function(mod) {
      if (deps.hasOwnProperty(mod)) {
        verify.log.info('dependency', 'registered    ', mod.cyan)
      } else if (devDeps.hasOwnProperty(mod)) {
        verify.log.info('dependency', 'registered    ', mod.yellow)
      } else if (optDeps.hasOwnProperty(mod)) {
        verify.log.info('dependency', 'registered    ', mod.grey)
      } else {
        verify.log.error('dependency', 'not registered', mod.red)
      }
    })

    verify.log.info('Checking relative dependencies')
    var keys = Object.keys(relativeModules)
    keys.forEach(function(key) {
      if (!verify.fileWithNameExists(key)) {
        verify.log.error('dependency', 'not registered    ', key.red)
        verify.log.error('dependency', 'It is referenced from the following files:')
        var refs = relativeModules[key]
        refs.forEach(function(r, index) {
          verify.log.error('dependency', ' - ', index, ' ', r)
        })
      }
    })
  }
})

function help() {
  console.log()
  console.log(' Usage: modverify [options] [top directory]')
  console.log()
  console.log(' Options:')
  console.log()
  console.log('   -h, --help', '              ', 'show help and usage')
  console.log('   -v, --version', '           ', 'show version')
  console.log('   -f, --file <filter>', '     ', 'specify file filter')
  console.log('   -d, --directory <filter>', '', 'specify directory filter')
  console.log('   -e, --exclude <file>', '    ', 'exclude the given file(s)')
  console.log('   -p, --package <file>', '    ', 'specify package.json')
  console.log()
  process.exit()
}
