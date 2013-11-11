#!/usr/bin/env node
var cwd     = process.cwd()
  , fs      = require('fs')
  , verify  = require('../verify')
  , path    = require('path')
  , program = require('commander')
  , pkg     = require('../package')

program
  .version(pkg.version)
  .option('-v, --verbose', 'Increase verbosity')
  .parse(process.argv)

if (program.verbose) verify.log.level = 'verbose'

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
      , deps = pkg.dependencies
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