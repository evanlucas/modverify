#!/usr/bin/env node
var logger = require('loggerjs')('Verify')
  , cwd = process.cwd()
  , fs = require('fs')
  , verify = require('../verify')
  , path = require('path')


verify.processForDir(cwd, function(err, results) {
  if (err) {
    logger.error('Error scanning files:', err)
    process.exit(1)
  } else {
    var pkg = require(path.join(cwd, 'package.json'))
      , deps = pkg.dependencies
      , devDeps = pkg.devDependencies || {}
      , modules = results.modules
      , relativeModules = results.relativeModules
    console.log()
    logger.info('Checking dependencies')
    modules.forEach(function(mod) {
      if (deps.hasOwnProperty(mod)) {
        console.log(mod.cyan, 'is registered as a dependency')
      } else if (devDeps.hasOwnProperty(mod)) {
        console.log(mod.magenta, 'is registered as a dev dependency')
      } else {
        console.log(mod.red, 'IS NOT registered as a dependency')
      }
    })
    
    console.log()
    logger.info('Checking relative dependencies')
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