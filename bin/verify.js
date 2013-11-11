#!/usr/bin/env node
var cwd    = process.cwd()
  , fs     = require('fs')
  , verify = require('../verify')
  , path   = require('path')

verify.log.level = 'verbose'

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
      , modules = results.modules
      , relativeModules = results.relativeModules
    verify.log.info('processing', 'Checking dependencies')
    modules.forEach(function(mod) {
      if (deps.hasOwnProperty(mod)) {
        verify.log.info('dependency', mod.cyan, 'is registered as a dependency')
      } else if (devDeps.hasOwnProperty(mod)) {
        verify.log.info('dependency', mod.magenta, 'is registered as a dev dependency')
      } else {
        verify.log.error('dependency', mod.red, 'IS NOT registered as a dependency')
      }
    })
    
    verify.log.info('Checking relative dependencies')
    var keys = Object.keys(relativeModules)
    keys.forEach(function(key) {
      if (!verify.fileWithNameExists(key)) {
        console.log(key.red, 'does not exist')
        console.log('It is referenced from the following files:')
        var refs = relativeModules[key]
        refs.forEach(function(r, index) {
          console.log(' - ', index, ' ', r)
        })
      }
    })
  }
})