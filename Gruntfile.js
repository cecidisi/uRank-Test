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
    app: '.',
    libs: './libs',
    htmlFile: './index.html'
  };

  // Define the configuration for all the tasks
  grunt.initConfig({

    // Project settings
    config: config,

    // Automatically inject Bower components into the HTML file
    wiredep: {
      urank: {
        src: ['<%= config.htmlFile %>'],
        overrides: {
            hint: {
                main: "dist/hint.min.css"
            },
            'jquery-ui': {
                main: [
                    "jquery-ui.min.js",
                    "themes/base/jquery-ui.min.css"
                ]
            }
        }
      }
    },


    bowercopy: {
        options: {
            srcPrefix: 'bower_components',
            clean: false,
            ignore: ['*bower.json']
        },
        urank: {
            src: 'urank',
            dest: '<%= config.libs %>/urank'
        },
        urank_dep: {
            options: {
                destPrefix: '<%= config.libs %>/urank/dependencies'
            },
            files: {
                'colorbrewer.js': 'colorbrewer/colorbrewer.js',
                'd3.min.js': 'd3/d3.min.js',
                'd3pie.min.js': 'd3pie/d3pie/d3pie.min.js',
                'hint.min.css': 'hint/dist/hint.min.css',
                'jquery.min.js': 'jquery/dist/jquery.min.js',
                'jquery-ui.min.js': 'jquery-ui/jquery-ui.min.js',
                'theme/jquery-ui.min.css': 'jquery-ui/themes/base/jquery-ui.min.css',
                'theme/images': 'jquery-ui/themes/base/images',
                'underscore.min.js': 'underscore/underscore-min.js'
            }
        }
    },

    injector: {
        options: {
            min: true
        },
        urank: {
            files: {
                '<%= config.htmlFile %>': ['<%= config.libs %>/urank/**/*.js',
                                                 '<%= config.libs %>/urank/**/*.css',
                                                 '!<%= config.libs %>/urank/dependencies/**/*.js',
                                                 '!<%= config.libs %>/urank/dependencies/**/*.css']
            }
        },
        urank_all: {
            files: {
                '<%= config.htmlFile %>': ['<%= config.libs %>/urank/**/*.js', '<%= config.libs %>/urank/**/*.css']
            }
        }
    }

  });


//  Register urank tasks

  grunt.registerTask('urank-wiredep', [
      'wiredep:urank'
  ]);


  grunt.registerTask('urank-load', [
      'bowercopy:urank',
      'injector:urank'
  ]);


  grunt.registerTask('urank-load-all', [
      'bowercopy:urank',
      'bowercopy:urank_dep',
      'injector:urank_all'
  ]);

  grunt.registerTask('urank-copy', [
      'bowercopy:urank',
  ]);

  grunt.registerTask('urank-copy-all', [
      'bowercopy:urank',
      'bowercopy:urank_dep',
  ]);

};
