'use strict'

var Q = require('q'),
		path = require('path');
		
const readline = require('readline'),
			fs = require('fs');

var conf = function(file_path){
	var deferred = Q.defer();
	var dir = path.dirname(file_path);
	
	const rl = readline.createInterface({
		input: fs.createReadStream(file_path)
	});

	var comment = null;
	var key = null;
	var config = {};
	
	rl.on('line', function(line) {
		line = line.clean();
		//var key = null;
		
			
		if(line.indexOf('#') == 0){//comment
			comment = (comment == null) ? line : comment + "\n"+line;
			line = null;
		}
		else if(line.indexOf('#') > 0){//comment after line
			comment = line.slice(line.indexOf('#'), line.length -1);
			line = line.slice(0, line.indexOf('#') - 1);
			
		}
		
		if(line == null || line == ''){//reset key
			key = null;
		}
		
		if(line != null && line != ''){//avoid null lines
			
			if(line.indexOf(':') == line.length - 1){//if line ends with ':' starts a multiline section
				key = line.slice(0, line.indexOf(':')).clean();
				config[key] = [];
			}
			else if(line.indexOf(':') > 0){//section : value
				var tmp = line.split(':');
				key = tmp[0].clean();
				
				if(key == 'config' ||
					key == 'file-exclude' ||
					key == 'password-file' ||
					key == 'client'){//include config file
						
					var tmp_key = key;//save key, as it gets overiden on the async call
					var include_file = tmp[1].clean();
					
					if(!path.isAbsolute(include_file)){//if file path is not absolute, make an array of possible path
						var vault_dir = '';//get vault dir
						var files = [
							vault_dir+'/'+include_file,
							vault_dir+'/'+include_file+'.conf',
							dir+'/'+include_file,
							dir+'/'+include_file+'.conf'
						];
					}
					
					config[tmp_key] = include_file;//set it as value, if no file could be included, will keep this one
					
					files.each(function(file, index){
						//var file_path = path.join(__dirname, file);
						var file_path = file;
						
						try{	
							fs.accessSync(file_path, fs.R_OK);

							conf(file_path)
							.then(function(cfg){
								config[tmp_key] = {};
								config[tmp_key][include_file] = cfg;
								
								//console.log('config[key]'+key);
								//console.log(config);
								
							}.bind(this))
							.done();

							throw new Error('Read: '+ file_path);//break the each loop
						}
						catch(e){
							console.log(e);
						}
					
					}.bind(this));
					
				}
				else{
					config[key] = tmp[1].clean();
				}
				
				key = null;
			}
			else if(/SET|UNSET|RESET/.test(line)){//the onlye 3 options that don't use colons <:>

				var tmp = line.split(' ');
				//console.log(tmp);
				key = tmp[0].clean();
				config[key] = [];
				
				for(var i = 1; i < tmp.length; i++){
					config[key].push(tmp[i].clean());
				}
				key = null;
			}
			else if(key == null){//only know case: 'password-file'
				config = line.clean();
			}
			else{//value of a multiline section
				config[key].push(line.clean());
			}
			
			//console.log('Comment from file:', comment);
			//console.log('Line from file:', line);
			
		}
	}.bind(this));
	
	rl.on('close', function(){
			//console.log('dirvish config');
			//console.log(config);
			
			deferred.resolve(config);
	});
	
	return deferred.promise;
};

var exports = module.exports = {};
exports.conf = conf;
