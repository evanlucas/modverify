module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    
    cafemocha: {
      main: {
        src: 'tests/test.js',
        options: {
          ui: 'bdd',
          reporter: grunt.option('reporter') || 'nyan',
          colors: true
        }
      }
    }
  })
  
  grunt.loadNpmTasks('grunt-cafe-mocha')
  
  grunt.registerTask('default', ['cafemocha'])
}