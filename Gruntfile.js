/****************************************************************************************************************************************************
*
*   Use this Gruntfile for automating uRank loading tasks in you project. Make sure you have npm installed
*   1. Copy to you project root
*   2. Set the appropriate paths for "app" and "libs"
*   2. Install npm devDependencies: npm install
*   3. Include urank files and depencies in you HTML file. There are 3 options:
*       a) To include urank and dependencies directly from your bower_components folder run: grunt wiredep:urank
*       b) To copy ONLY uRank files into a folder in your project and include these files in your HTML run: grunt urank-load
*       c) To copy BOTH uRank files AND dependencies into a folder in your project and include ALL files in your HTML run: grunt urank-load-all
*
****************************************************************************************************************************************************/


'use strict';


module.exports = function (grunt) {

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);

  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // Configurable paths
  var config = {
    app: 'app',
    libs: 'app/libs',
    htmlFile: 'app/index.html'
  };

  // Define the configuration for all the tasks
  grunt.initConfig({

    // Project settings
    config: config,


   'bower-install-simple': {
       options: {
           forceLatest: true
       },
       urank: {}
   },

    bowercopy: {
        options: {
            runBower: false,
            clean: true      // to clean bower_components folder after moving necessary files, change this flag to true
        },
        urank: {
            src: 'urank',
            dest: '<%= config.libs %>/urank'
        },
        urank_dep: {
            options: {
                destPrefix: '<%= config.libs %>'
            },
            files: {
                'colorbrewer': 'colorbrewer',
                'd3': 'd3',
                'd3pie': 'd3pie',
                'hint.css': 'hint.css',
                'jquery': 'jquery',
                'jquery-ui': 'jquery-ui',
                'underscore': 'underscore'
            }
        }

    },
    // Automatically inject Bower components into the HTML file
    wiredep: {
        options: {
            overrides: {
                'jquery-ui': {
                    main: [ "jquery-ui.min.js", "themes/base/jquery-ui.min.css" ]
                }
            }
        },
        direct: {
            src: ['<%= config.htmlFile %>'],
        },
        indirect: {
            directory: '<%= config.libs %>',
            src: ['<%= config.htmlFile %>']
          }
      },

      injector: {
          options: {
              min: true
          },
          urank: {
              files: {
                  '<%= config.htmlFile %>': ['<%= config.libs %>/urank/**/*.js', '<%= config.libs %>/urank/**/*.css']
              }
          }
      }

  });


//  Register urank tasks

  grunt.registerTask('urank-load-all', [
      'bower-install-simple:urank',
      'wiredep:direct'
  ]);


  grunt.registerTask('urank-copy-and-load-all', [
      'bower-install-simple:urank',
      'bowercopy:urank',
      'bowercopy:urank_dep',
      'wiredep:indirect'
  ]);


  grunt.registerTask('urank-copy-and-load', [
      'bower-install-simple',
      'bowercopy:urank',
      'injector:urank'
  ]);

  grunt.registerTask('urank-copy', [
      'bower-install-simple:urank',
      'bowercopy:urank',
  ]);

  grunt.registerTask('urank-copy-all', [
      'bower-install-simple:urank',
      'bowercopy:urank',
      'bowercopy:urank_dep',
  ]);

};
