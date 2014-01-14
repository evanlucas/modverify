#!/usr/bin/env node
var cwd     = process.cwd()
  , fs      = require('fs')
  , verify  = require('../verify')
  , path    = require('path')
  , pkg     = require('../package')
  , nopt    = require('nopt')
  , knownOpts = { loglevel: ['silly', 'verbose', 'info', 'warn', 'error', 'silent']
                , version: Boolean
                }
  , shortHand = { verbose: ['--loglevel', 'verbose']
                , silly: ['--loglevel', 'silly']
                , quiet: ['--loglevel', 'silent']
                , v: ['--version']
                }
  , parsed = nopt(knownOpts, shortHand)

if (parsed.loglevel) verify.log.level = parsed.loglevel

if (parsed.version) {
  console.log('modverify', 'v'+pkg.version)
  process.exit()
}

verify.processForDir(cwd, {
    directoryFilter: ['!.git', '!components',
      '!bower_components', '!node_modules']
  , fileFilter: ['*.js']
}, function(err, results) {
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
    var keys = Object.keys(modules)
    keys.forEach(function(mod) {
      if (deps.hasOwnProperty(mod)) {
        verify.log.info('dependency', 'registered    ', mod.cyan)
      } else if (devDeps.hasOwnProperty(mod)) {
        verify.log.info('dependency', 'registered    ', mod.yellow)
      } else if (optDeps.hasOwnProperty(mod)) {
        verify.log.info('dependency', 'registered    ', mod.grey)
      } else {
        verify.log.error('dependency', 'not registered', mod.red)
        verify.log.error('dependency', 'It is referenced from the following files:')
        var refs = modules[mod]
        refs.forEach(function(r, idx) {
          verify.log.error('dependency', ' - ', idx, ' ', r)
        })
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
