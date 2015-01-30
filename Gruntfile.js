'use strict';

module.exports = function(grunt) {
    var banner = '/*! project:<%= pkg.name %>, version:<%= pkg.version %>, update:<%= grunt.template.today("yyyy-mm-dd HH:MM:ss") %> */';

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        connect: {
            server: {
                options: {
                    port: 8008,
                    base: './'
                }
            }
        },

        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            beforeconcat: ['Gruntfile.js', 'app/scripts/**/*.js', 'test/scripts/**/*.js'],
            afterconcat: ['dest/scripts/**/*.js']
        },

        watch: {
            script: {
                files: ['Gruntfile.js', 'app/scripts/**/*.js', 'test/scripts/**/*.js'],
                tasks: ['build-js']
            },
            style: {
                files: ['app/i/**', 'app/styles/_c/**', 'app/styles/_p/**'],
                tasks: ['build-css']
            }
        },

        clean: {
            all: ['dest/'],
            scripts: ['dest/scripts/'],
            scripts_min: ['dest/scripts/min/'],
            styles: ['dest/styles/'],
            images: ['dest/images/'],
            app_styles_b64: ['app/styles/b64/'],
            app_styles: ['app/styles/c/', 'app/styles/p/']
        },

        less: {
            all: {
                options: {
                    compress: false
                },
                files: {
                    'app/styles/c/g.css': 'app/styles/_c/g.less'
                }
            }
        },

        cssmin: {
            combine: {
                options: {
                    keepBreaks: true,
                    keepSpecialComments: '*',
                    noAdvanced: false
                },
                files: {
                    'dest/styles/c/g.css': 'app/styles/c/g.css'
                }
            },
            base64: {
                options: {
                    banner: banner
                },
                files: {
                    'dest/styles/c/g.css': 'app/styles/b64/g.css'
                }
            }
        },

        concat: {
            options: {
                separator: '\n\n',
                stripBanners: true
            },
            home_js: {
                src: [
                    'app/node_modules/local-libs/lib/zepto-1.0.0.js',
                    'app/node_modules/local-libs/lib/artTemplate-2.0.1.js',
                    //'app/node_modules/local-libs/lib/iscroll-lite-5.0.5revised.js',
                    'app/node_modules/local-commons/lib/klass.js',
                    'app/node_modules/local-commons/lib/widget/imitatefixed.js',
                    'app/node_modules/local-commons/lib/widget/slide.js',
                    'app/node_modules/local-commons/lib/statistics.js',
                    'app/scripts/exposureStatis.js',
                    'app/scripts/_initSohuMobilePlayer.js',
                    'app/scripts/fin-gallery.js',
                    'app/scripts/nativeAjax.js',
                    'app/scripts/home.js',
                    'app/scripts/final.js'
                ],
                dest: 'dest/scripts/pkg/home.js'
            }
        },

        uglify: {
            options: {
                banner: banner
            },
            home_js: {
                options: {
                    sourceMap: true,
                    sourceMapName: 'dest/scripts/min/home_js.map'
                },
                files: {
                    'dest/scripts/min/home.js': 'dest/scripts/pkg/home.js'
                }
            },
            final_bak_js: {
                options: {
                    sourceMap: true,
                    sourceMapName: 'dest/scripts/min/final_bak_js.map'
                },
                files: {
                    'dest/scripts/min/final.bak.js': 'dest/scripts/pkg/final.bak.js'
                }
            },
            final_js: {
                options: {
                    sourceMap: true,
                    sourceMapName: 'dest/scripts/min/final_js.map'
                },
                files: {
                    'dest/scripts/min/final.js': 'dest/scripts/pkg/final.js'
                }
            }
        },

        unicode: {
            all: {
                files: [{
                    expand: true,
                    cwd: 'dest/scripts/min/',
                    src: '**/*.js',
                    dest: 'dest/scripts/'
                }]
            }
        },

        copy: {
            source_map: {
                options: {
                    process: function(content) {
                        return content.replace(/\.\.\/pkg\//g, 'pkg/');
                    }
                },
                files: [
                    {
                        expand: true,
                        cwd: 'dest/scripts/min/',
                        src: ['**/*.map'],
                        dest: 'dest/scripts/'
                    }
                ]
            },
            scripts_pkg: {
                files: [
                    {
                        expand: true,
                        cwd: 'dest/scripts/pkg/',
                        src: ['**'],
                        dest: 'dest/scripts/'
                    }
                ]
            },
            app_pages: {
                options: {
                    process: function(content) {
                        content = content.replace(/<link\s.*href="([^"]+)\/_c\/([^"]+).less".*>/g, function(g, s1, s2) {
                            return '<link rel="stylesheet" type="text/css" href="' + s1 + '/c/' + s2 + '.css">';
                        });
                        content = content.replace(/<script\s.*src="[^"]+\/node_modules\/less\/dist\/less.*">\s*<\/script>/g, function(g) {
                            return '';
                        });
                        return content;
                    }
                },
                files: [
                    {
                        expand: true,
                        cwd: 'app/styles/_p/',
                        src: ['**/*.{html,shtml,ico}'],
                        dest: 'app/styles/p/'
                    }
                ]
            },
            styles: {
                files: [
                    {
                        expand: true,
                        cwd: 'app/styles/',
                        src: ['c/**/*.css', 'p/**/*.{html,shtml,ico}'],
                        dest: 'dest/styles/'
                    }
                ]
            },
            styles_pages: {
                files: [
                    {
                        expand: true,
                        cwd: 'app/styles/',
                        src: ['p/**/*.{html,shtml,ico}'],
                        dest: 'dest/styles/'
                    }
                ]
            },
            styles_b64: {
                files: [
                    {
                        expand: true,
                        cwd: 'app/styles/c/',
                        src: ['**/*.css'],
                        dest: 'app/styles/b64/'
                    }
                ]
            },
            images: {
                files: [
                    {
                        expand: true,
                        cwd: 'app/i/',
                        src: ['**/*.{png,jpg,jpeg,gif,ico}'],
                        dest: 'dest/images/'
                    }
                ]
            }
        },

        imagemin: {
            options: {
                optimizationLevel: 3
            },
            images: {
                files: [
                    {
                        expand: true,
                        cwd: 'app/i/',
                        src: ['**/*.{png,jpg,jpeg,gif,ico}'],
                        dest: 'dest/images/'
                    }
                ]
            }
        },

        base64image: {
            css: {
                styles: 'app/styles/c/',
                images:'app/i/',
                dest: 'app/styles/b64/'
            }
        },

        gitcommit: {
            dest: {
                options: {
                    message: 'release auto commit, project: <%= pkg.name%>, version: <%= pkg.version %>'
                },
                files: {
                    src: ['Gruntfile.js', 'package.json', 'app/i/**', 'app/scripts/**', 'app/styles/**', 'dest/**']
                }
            }
        },

        gittag: {
            tag: {
                options: {
                    tag: '<%= pkg.version %>',
                    message: 'release auto tag, project: <%= pkg.name%>, version: <%= pkg.version %>'
                }
            }
        },

        gitpush: {
            dest: {
                options: {}
            },
            tag: {
                options: {
                    tags: true
                }
            }
        }
    });

    require('load-grunt-tasks')(grunt);

    grunt.registerTask('default', ['jshint:beforeconcat']);
    grunt.registerTask('server', ['connect:server:keepalive']);

    grunt.registerTask('build-js-base', ['jshint:beforeconcat', 'clean:scripts', 'concat']);
    grunt.registerTask('build-js', ['build-js-base', 'copy:scripts_pkg']);
    grunt.registerTask('build-css-base', ['clean:app_styles', 'less', 'copy:app_pages']);
    grunt.registerTask('build-css', ['build-css-base', 'cssmin:combine', 'copy:styles_pages', 'copy:images']);
    grunt.registerTask('build', ['build-js', 'build-css']);

    // 注意：正常情况下，release命令必须在master下使用。除此之外，一些特殊情况下，允许在分支中使用release。
    // 参见：http://wiki.m.sohuno.com/pages/viewpage.action?pageId=6226158#Git使用规范
    grunt.registerTask('release', ['clean:all', 'build-js-base', 'uglify', 'unicode', 'copy:source_map', 'clean:scripts_min', 'build-css-base', 'base64image', 'cssmin:base64', 'clean:app_styles_b64', 'copy:styles_pages', 'imagemin']);
    // release-tag命令，完成项目打包，并自动打tag提交到代码仓库
    grunt.registerTask('release-tag', ['release', 'gitcommit', 'gittag', 'gitpush']);

};