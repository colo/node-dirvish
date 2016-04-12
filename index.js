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

var vaults = function(file_path){
	//var deferred = Q.defer();
	
	var dir = path.join(path.dirname(file_path)+'/../../');
	
	return conf(file_path)
	.then(function(config){

		//console.log('this.vaults - this.config');
		//console.log(config.bank);
		
		var banks = config.bank;
		var vaults = {};
		
		banks.each(function(bank, index){
				//console.log('bank'+dir);
				//console.log(bank);
				
				var bank_path = path.join(dir, bank);
				
				try{
					fs.accessSync(bank_path, fs.R_OK);
					
					fs.readdirSync(bank_path).forEach(function(vault) {

						var full_path = path.join(bank_path, vault);
						
						//console.log('full vault path: '+full_path);
						
						if(! (vault.charAt(0) == '.')){//ommit 'hiden' files
							
							if(fs.statSync(full_path).isDirectory() == true){//vaults are dirs inside a bank
								console.log('possible vault: '+full_path);
								console.log('possible vault name: '+vault);
								var conf_file = path.join(full_path, '/dirvish/default.conf');
								
								try{
									fs.accessSync(conf_file, fs.R_OK);
									
									conf(conf_file)
									.then(function(config){
										vaults[vault] = config;
									})
									.done();
									
								}
								catch(e){
									console.log('accesing dirvish/default.conf');
									console.log(e);
								}
								
							}
						
						}
						
					});
				}
				catch(e){
					console.log(e);
				}
			
			
		});
			
		//deferred.resolve(vaults);
		return vaults;
		
	}.bind(this));
	
	
	
	
	
	
	//conf(file_path)
	//.then()
	//.done();
	
	//return deferred.promise;
};

var exports = module.exports = {};
exports.conf = conf;
exports.vaults = vaults;
