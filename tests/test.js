var assert = require('assert')
describe('modverify', function() {
  describe('fileWithNameExists', function() {
    var dir = __dirname
      , path = require('path')
      , files = ['test1', 'test2', 'test3', 'test4', 'test5', 'test6']
      , files2 = ['tes1', 'tes2', 'tes3', 'tes4', 'tes5', 'tes6']
      , verify = require('../verify')
    files.forEach(function(file) {
      var fn = path.join(dir, 'testfiles', file)
      var res = verify.fileWithNameExists(fn)
      it('Should exist', function() {
        assert.equal(res, true)
      })
    })
    files2.forEach(function(file) {
      var fn = path.join(dir, 'testfiles', file)
      var res = verify.fileWithNameExists(fn)
      it('Should not exist', function() {
        assert.equal(res, false)
      })
    })
  })

  describe('processForDir', function() {
    var dir = process.cwd()
      , verify = require('../verify')
    it('Should not throw an error', function(done) {
      verify.processForDir(dir, function(err, res) {
        assert.ifError(err)
        assert.equal(res.hasOwnProperty('modules'), true)
        assert.equal(res.hasOwnProperty('relativeModules'), true)
        done()
      })
    })
  })
})
