var JSCN;
JSCN=function(){
	var self={
		classes:{},
		interfaces:{},
		patterns:{
			blockStart:/\r?\n\t*\{/g,
			carriageReturn:/\r?\n/,
			commentLine:/^\s*\/\//,
			commentStart:/^\s*\/\*/,
			commentEnd:/\*\/\s*$/,
			trimLeft:/^\s+/,
			trimRight:/\s+$/,
			classHead:/^(?:(final|abstract)\s+)?class\s+([A-Z][\w\d]*(?:_[A-Z][\w\d]*)*)(?:\s+extends\s+([A-Z][\w\d]*(?:_[A-Z][\w\d]*)*))?(?:\s+implements\s+((?:(?:[A-Z][\w\d]*(?:_[A-Z][\w\d]*)*)(?:\s*,\s*)?)+)?)?\s*\{?/,
			interfaceHead:/^interface\s+([A-Z][\w\d]*(?:_[A-Z][\w\d]*)*)(?:\s+extends\s+([A-Z][\w\d]*(?:_[A-Z][\w\d]*)*))?\s*\{?/,
			interfaceNames:/\s*,\s*/g,
			property:/^(?:([A-Z][\w\d\$_]*)\s+)?(?:\s*(public|protected|private))(?:\s+(static))?(?:\s+(const))?\s+([a-z][\w\d\$_]*)(?:\s*=\s*(.+?))?\s*;/,
			classMethod:/^(?:\s*([A-Z][\w\d\$_]*)\s+)?(?:\s*(final)\s+)?(?:\s*(public|protected|private))(?:\s+(static))?\s+function\s+([a-z][\w\d\$_]*)\s*\(\s*([^\)]*)\s*\)\s*\{?/,
			interfaceMethod:/^(?:\s*([A-Z][\w\d\$_]*)\s+)?\s*public(?:\s+(static))?\s+function\s+([a-z][\w\d\$_]*)\s*\(\s*([^\)]*)\s*\)\s*;/,
			token:/^(?:\s*[A-Z][\w\d\$_]*\s+)?(?:\s*final\s+)?(?:\s*public|protected|private)/,
			argStr:/\s*(?:(?:([A-Z][\w\d\$\._]*)*\s+([a-z_][\w\d\$_]*))|([a-z_][\w\d\$_]*))+?/g
		},
		getClass:function getClass(className){
			var classInfo;
			if(typeof self.classes[className]==='undefined'){
				classInfo=self.parse(className,'class',self.load(className+'.class'));
				if(typeof classInfo.parent!=='undefined'){
					self.getClass(classInfo.parent);
					if(self.classes[classInfo.parent].isFinal){
						throw new Error(/* todo */);
					}
				}
				self.createClass(self.describe(classInfo));
			}
			return function(){
				var args=[].slice.call(arguments);
				args.unshift('');
				return new(Function.prototype.bind.apply(window[className],args))();
			};
		},
		load:function load(sourceName){
			var xhr;
			xhr=new XMLHttpRequest();
			xhr.filePath=self.getPath(sourceName);
			xhr.open('GET',xhr.filePath,false);
			try{
				xhr.send(null);
			}
			catch(e){
				throw new ReferenceError('Source not found : '+xhr.filePath);
			}
			return xhr.responseText;
		},
		getPath:function getPath(sourceName){
			var pathParts,
				length;
			pathParts=sourceName.split('__');
			length=pathParts.length;
			if(length===2){
				pathParts[0]='http://'+pathParts[0].replace(/_/g,'.');
			}
			pathParts[length-1]=pathParts[length-1].replace(/_/g,'/');
			return pathParts.join('/')+'.jscn';
		},
		parse:function parse(name,type,source){
			var line,
				lines,
				iterator,
				length,
				matches,
				itemInfo,
				property,
				methodLines;
			lines=self.stripComments(source.replace(self.patterns.blockStart,'{').split(self.patterns.carriageReturn));
			iterator=0;
			length=lines.length-1;
			if(type==='class'&&(matches=lines[0].match(self.patterns.classHead))){
				itemInfo={
					type:type,
					source:source,
					ns:name.substring(name.lastIndexOf('_')+1),
					isFinal:matches[1]==='final',
					isAbstract:matches[1]==='abstract',
					name:matches[2],
					parent:matches[3],
					interfaces:typeof matches[4]!=='undefined'?matches[4].split(self.patterns.interfaceNames):null,
					properties:[],
					descriptorStrings:{
						self:[],
						selfRegistry:[],
						$this:[],
						$thisRegistry:[],
						instance:[]
					},
					descriptor:{}
				};
			}
			else if(type==='interface'&&(matches=lines[0].match(self.patterns.interfaceHead))){
				itemInfo={
					type:type,
					name:matches[1],
					ns:name.substring(name.lastIndexOf('_')+1),
					parent:typeof matches[2]!=='undefined'?matches[2]:null,
					properties:[]
				};
			}
			while((iterator+=1)<length){
				line=lines[iterator];
				property=[];
				if((matches=line.match(self.patterns.property))){
					property.name=matches[5];
					property.type=matches[1];
					property.visibility=matches[2];
					property.isStatic=!!matches[3];
					property.isConst=!!matches[4];
					property.value=matches[6];
				}
				else if(type==='class'&&(matches=line.match(self.patterns.classMethod))){
					methodLines=[];
					property.name=matches[5];
					property.returnType=matches[1];
					property.isFinal=!!matches[2];
					property.visibility=matches[3];
					property.isStatic=!!matches[4];
					property.argStr=matches[6];
					while(!('body' in property)){
						if(lines[iterator+2]!==void null&&!(self.patterns.token.test(lines[iterator+1]))){
							if(lines[iterator]!==line){
								methodLines.push(lines[iterator]);
							}
							iterator+=1;
						}
						else{
							property.body=methodLines.join('\n');
						}
					}
				}
				else if(type==='interface'&&(matches=line.match(self.patterns.interfaceMethod))){
					property.name=matches[3];
					property.returnType=matches[1];
					property.visibility='public';
					property.isStatic=!!matches[2];
					property.argStr=matches[4];
				}
				if(typeof property.name!=='undefined'){
					itemInfo.properties[property.name]=property;
				}
			}
			return itemInfo;
		},
		stripComments:function stripComments(lines){
			var line,
				length,
				patterns,
				newLines,
				iterator,
				level;
			newLines=[];
			iterator=-1;
			level=0;
			length=lines.length;
			while((iterator+=1)<length){
				line=lines[iterator];
				if(!(self.patterns.commentLine.test(line))){
					if(self.patterns.commentStart.test(line)){
						level+=1;
					}
					if(level===0){
						line=self.trim(line);
						if(line.length>0){
							newLines.push(line);
						}
					}
					else{
						if(self.patterns.commentEnd.test(line)){
							level-=1;
						}
					}
				}
			}
			return newLines;
		},
		trim:function trim(str){
			return str.replace(self.patterns.trimLeft,'').replace(self.patterns.trimRight,'');
		},
		describe:function describe(classInfo){
			var descriptor,
				property,
				element,
				parent;
			if(typeof classInfo.parent!=='undefined'){
				parent=self.classes[classInfo.parent];
			}
			for(property in classInfo.properties){
				if(typeof parent==='undefined'||typeof parent.properties[property]==='undefined'||!parent.properties[property].isFinal||(parent.properties[property].isStatic===classInfo.properties[property].isStatic&&parent.properties[property].visibility==='public')){
					if(property!=='construct'||!classInfo.isAbstract){
						self[typeof classInfo.properties[property].body!=='string'?'createProperty':'createMethod'].apply(classInfo,self.filter(classInfo.properties[property]));
					}
					else{
						throw new Error(/* todo */);
					}
				}
				else{
					throw new Error(/* todo */);
				}
			}
			for(element in classInfo.descriptorStrings){
				classInfo.descriptor[element]='{'+classInfo.descriptorStrings[element]+'}';
			}
			return classInfo;
		},
		filter:function filter(source){
			var result,
				key;
			result=[];
			for(key in source){
				result.push(source[key]);
			}
			return result;
		},
		createProperty:function createProperty(propertyName,type,visibility,isStatic,isConst,value){
			var classInfo,
				className,
				accessorName;
			classInfo=this;
			className=this.name;
			accessorName=isStatic?'self':'$this';
			classInfo.descriptorStrings[accessorName+'Registry'].push(
				propertyName+':{value:'+value+',writable:'+(!isConst||propertyName==='construct')+',configurable:'+(propertyName==='construct')+'}'
			);
			if(visibility!=='private'){
				classInfo.descriptorStrings.instance.push(
					propertyName+':{'+
						self.createGetter(propertyName,accessorName,className,visibility==='protected')+
						((isConst)?'':','+self.createSetter(propertyName,accessorName,className,visibility==='protected',type))+
					',enumerable:true}'
				);
			}
			classInfo.descriptorStrings[accessorName].push(
				propertyName+':{'+
					self.createGetter(propertyName,accessorName,className,false)+
					((!!isConst)?'':','+self.createSetter(propertyName,accessorName,className,false,type))+
				',enumerable:true}'
			);
		},
		createMethod:function createMethod(methodName,returnType,isFinal,visibility,isStatic,argStr,bodyStr){
			var classInfo,
				className,
				accessorName,
				argNames,
				bodyParts,
				value,
				cleanedArgStr,
				separator;
			classInfo=this;
			className=this.name;
			accessorName=isStatic?'self':'$this';
			argNames=[];
			bodyParts=[bodyStr];
			separator='';
			if(argStr!==''){
				argStr.replace(self.patterns.argStr,function(str,type,typedName,untypedName){
					if(typedName!==''){
						argNames.push(typedName);
						bodyParts.unshift(self.createArgumentController(className,methodName,type,typedName));
					}
					else{
						argNames.push(untypedName);
					}
				});
			}
			cleanedArgStr=argNames.join();
			value='function('+cleanedArgStr+'){var __METHOD__=\''+methodName+'\';'+bodyParts.join('');
			if(typeof returnType!=='undefined'){
				self.getClass(returnType);
				if(argNames.length!==0){
					separator=',';
				}
				value='function('+cleanedArgStr+'){return (function(func'+separator+cleanedArgStr+'){var returnValue=func('+
					cleanedArgStr+');if(!(returnValue instanceof('+returnType+'))){throw new TypeError(\''+className+'.'+methodName+
					'() must be an instance of '+returnType+'\');}else{return returnValue;}})('+value+separator+cleanedArgStr+'})';
			}
			self.createProperty.call(classInfo,methodName,'',visibility,isStatic,methodName!=='construct',value+'}');
		},
		createGetter:function createGetter(propertyName,accessorName,className,isProtected){
			var callerController='';
			if(isProtected){
				callerController='if(this instanceof '+className+'&&instance!==this){'+
					'throw new TypeError(\''+propertyName+' is undefined\',\''+className+'.class.jscn\');'+
				'}';
			}
			return 'get:function(){'+callerController+'return '+accessorName+'.'+propertyName+';}';
		},
		createSetter:function createSetter(propertyName,accessorName,className,isProtected,type){
			var callerController='',
				typeController='';
			if(isProtected){
				callerController='if(this instanceof '+className+'&&instance!==this){'+
					'throw new TypeError(\''+propertyName+' is undefined\',\''+className+'.class.jscn\');'+
				'}';
			}
			if(typeof type!=='undefined'){
				typeController='if(!(value instanceof window.'+type+')){'+
					'throw new TypeError(\''+propertyName+' must be an instance of '+type+'\',\''+className+'.class.jscn\');'+
				'}';
			}
			return 'set:function(value){'+callerController+typeController+'return '+accessorName+'.'+propertyName+'=value;}';
		},
		createProtectedController:function createProtectedController(className,property){
			return 'if(this instanceof '+className+'&&instance!==this){'+
				'throw new TypeError(\''+property+' is undefined\',\''+className+'.class.jscn\');'+
			'}';
		},
		createTypeController:function createTypeController(className,property,type){
			self.getClass(type);
			return 'if(!(value instanceof window.'+type+')){'+
				'throw new TypeError(\''+property+' must be an instance of '+type+'\',\''+className+'.class.jscn\');'+
			'}';
		},
		createArgumentController:function createArgumentController(className,property,type,argument){
			self.getClass(type);
			return 'if(!('+argument+' instanceof window.'+type+')){'+
				'throw new TypeError(\'Argument '+argument+' of '+property+'() must be an instance of '+type+'\',\''+className+'.class.jscn\');'+
			'}';
		},
		createClass:function createClass(classInfo){
			var Class,
				className,
				$self,
				selfRegistry,
				Parent,
				parentSelf,
				Constructor,
				descriptor,
				property,
				visibility;
			className=classInfo.name;
			descriptor=classInfo.descriptor;
			$self={};
			selfRegistry=Object.create({},(new Function('self','Class','var __CLASS__=\''+className+'\';return '+descriptor.selfRegistry+';'))($self,self.getClass));
			Object.defineProperties($self,(new Function('self','var __CLASS__=\''+className+'\';return '+descriptor.self+';'))(selfRegistry));
			Object.seal($self);
			Object.seal(selfRegistry);
			Constructor=(new Function('classInfo','$self','self','return function '+className+'(){var $thisRegistry,$this,parent,descriptor,construct;parent=Object.getPrototypeOf(this);$thisRegistry={};$this={};descriptor=classInfo.descriptor;Object.defineProperties($thisRegistry,(new Function(\'self\',\'$this\',\'parent\',\'Class\',\'var __CLASS__=\\\''+className+'\\\';return \'+descriptor.$thisRegistry+\';\'))($self,$this,parent,self.getClass));Object.defineProperties($this,(new Function(\'$this\',\'var __CLASS__=\\\''+className+'\\\';return \'+descriptor.$this+\';\'))($thisRegistry));Object.defineProperties(this,(new Function(\'self\',\'$this\',\'instance\',\'var __CLASS__=\\\''+className+'\\\';return \'+descriptor.instance+\';\'))($self,$this,this));if(this.hasOwnProperty(\'construct\')){construct=this.construct.bind();}if(!classInfo.isAbstract){Object.defineProperty(this,\'construct\',{value:function(){return self.getClass(\''+className+'\').apply({},arguments);},enumerable:true,writable:false,configurable:false});}Object.seal($this);Object.seal($thisRegistry);if(!!construct){construct.apply(this,arguments);}};Object.seal(this);'))(classInfo,$self,self);
			if(!!classInfo.parent){
				Parent=this.getClass(classInfo.parent);
				Constructor.prototype=new Parent();
				parentSelf=this.classes[classInfo.parent].self;
				for(property in parentSelf){
					if(parentSelf.hasOwnProperty(property)){
						if(this.classes[classInfo.parent].properties[property].visibility!=='private'){
							Object.defineProperty(Constructor,property,Object.getOwnPropertyDescriptor(parentSelf,property));
						}
					}
				}
			}
			for(property in $self){
				if($self.hasOwnProperty(property)&&classInfo.properties.hasOwnProperty(property)&&classInfo.properties[property].visibility==='public'||classInfo.methods.hasOwnProperty(property)&&classInfo.methods[property].visibility==='public'){
					Object.defineProperty(Constructor,property,Object.getOwnPropertyDescriptor($self,property));
				}
			}
			window[className]=Constructor;
			window[className].prototype.constructor=window[className];
			Object.seal(window[className]);
			Object.seal(window[className].prototype);
			classInfo.self=$self;
			self.classes[className]=classInfo;
		}
	};
	return self.getClass;
};
