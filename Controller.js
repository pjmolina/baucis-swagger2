// This is a Controller mixin to add methods for generating Swagger data.

// __Dependencies__
var mongoose = require('mongoose');
var utils = require('./utils');

// __Private Members__

// __Module Definition__
module.exports = function () {
  var controller = this;

  // __Private Instance Members__

  function getParamId() {
    return {
        name: 'id',
        in: 'path',
        description: 'The ID of a ' + controller.model().singular() +'.',
        type: 'string',
        required: true
      };
  }
  function getParamXBaucisUpdateOperator() {
    return {
        name: 'X-Baucis-Update-Operator',
        in: 'header',
        description: '**BYPASSES VALIDATION** May be used with PUT to update the document using $push, $pull, or $set.',
        type: 'string',
        required: false
      };
  }
  function getParamSkip() {
    return {
        name: 'skip',
        in: 'query',
        description: 'How many documents to skip.',
        type: 'integer',
        format: 'int32',
        required: false
      };
  }
  function getParamLimit() {
    return {
        name: 'limit',
        in: 'query',
        description: 'The maximum number of documents to send.',
        type: 'integer',
        format: 'int32',
        required: false
      };
  }
  function getParamCount() {
    return {
        name: 'count',
        in: 'query',
        description: 'Set to true to return count instead of documents.',
        type: 'boolean',
        required: false
      };
  }
  function getParamConditions() {
    return {
        name: 'conditions',
        in: 'query',
        description: 'Set the conditions used to find or remove the document(s).',
        type: 'string',
        required: false
      };
  }
  function getParamSort() {
    return {
        name: 'sort',
        in: 'query',
        description: 'Set the fields by which to sort.',
        type: 'string',
        required: false
      };
  }
  function getParamSelect() {
    return {
      name: 'select',
      in: 'query',
      description: 'Select which paths will be returned by the query.',
      type: 'string',
      required: false
    };
  }  
  function getParamPopulate() {
    return {
      name: 'populate',
      in: 'query',
      description: 'Specify which paths to populate.',
      type: 'string',
      required: false
    };
  }  
  function getParamDocument(isPost) {
    // TODO post body can be single or array
    return {
        name: 'document',
        in: 'body',
        description: (isPost) ?
           'Create a document by sending the paths to be updated in the request body.' :
           'Update a document by sending the paths to be updated in the request body.',
        schema: {
          $ref: '#/definitions/' + utils.capitalize(controller.model().singular()),
        }, 
        required: true
      };
  }    
  // Generate parameter list for operations
  function generateParameters(isInstance, verb) {
    var parameters = [];
    // Parameters available for singular and plural routes
    parameters.push(getParamSelect(), 
                    getParamPopulate());
    if (isInstance) {
      // Parameters available for singular routes
      parameters.push(getParamId(), 
                      getParamXBaucisUpdateOperator());
    }
    else {
      // Parameters available for plural routes
      parameters.push(getParamSkip(),
                      getParamLimit(),
                      getParamCount(),
                      getParamConditions(),
                      getParamSort());
    }
    if (verb === 'post') {
      parameters.push(getParamDocument(true));
    }
    if (verb === 'put') {
      parameters.push(getParamDocument(false));
    }
    return parameters;
  }

  function buildTags(resourceName) {
    return [ resourceName ];
  }

  function buildResponsesFor(isInstance, verb, resourceName, pluralName) {
    var responses = {};

    responses.default = {
      description: 'Unexpected error.',
      schema: {
        '$ref': '#/definitions/Error'
      }
    };
    responses['200'] = {
      description: 'Sucessful response.',
      schema: {
        '$ref': '#/definitions/' +  utils.capitalize(resourceName)
      }
    };
    // TODO other errors (400, 403, etc. )

    responses['404'] = {
      description: (isInstance) ?
                        'No ' + resourceName + ' was found with that ID.' :
                        'No ' + pluralName + ' matched that query.',
      schema: {
        '$ref': '#/definitions/Error'
      }
    };
    if (verb === 'put' || verb==='post' || verb==='patch') {
      responses['422'] = {
        description: 'Validation error.',
        schema: {
          '$ref': '#/definitions/Error'
        }
      };
    }
    return responses;
  }

  function buildSecurityFor() {	
    return null; //no security defined
  }
  function buildOperationInfo(res, operationId, summary, description) {
    res.operationId = operationId;
    res.summary = summary;
    res.description = description;
    return res;
  }
  function buildBaseOperation(mode, verb, resourceName, pluralName) {
    var isInstance = (mode === 'instance');
	var resourceKey = utils.capitalize(resourceName);
    var res = {
      //consumes: ['application/json'], //if used overrides global definition
      //produces: ['application/json'], //if used overrides global definition
      parameters: generateParameters(isInstance, verb),
      responses: buildResponsesFor(isInstance, verb, resourceName, pluralName)
    };
	var sec = buildSecurityFor();
	if (sec) {
		res.security = sec;
	}
    if (isInstance) {
      if ('get' === verb) {
		return buildOperationInfo(res, 
				   'get' + resourceKey + 'ById',
				   'Get a ' + resourceName + ' by its unique ID',
				   'Retrieve a ' + resourceName + ' by its ID' + '.');
      } 
      else if ('put' === verb) {
		return buildOperationInfo(res, 
				   'update' + resourceKey,
				   'Modify a ' + resourceName + ' by its unique ID',
				   'Update an existing ' + resourceName + ' by its ID' + '.');
      }    
      else if ('delete' === verb) {
		return buildOperationInfo(res, 
				   'delete' + resourceKey + 'ById',
				   'Delete a ' + resourceName + ' by its unique ID',
				   'Deletes an existing ' + resourceName + ' by its ID' + '.');
      }        
    } else {
      //collection
      if ('get' === verb) {
		return buildOperationInfo(res, 
				   'query' + resourceKey,
				   'Query some ' + pluralName,
				   'Query over ' + pluralName + '.');
      } 
      else if ('post' === verb) {
		return buildOperationInfo(res, 
				   'create' + resourceKey,
				   'Create some ' + pluralName,
				   'Create one or more ' + pluralName + '.');
      }    
      else if ('delete' === verb) {
		return buildOperationInfo(res, 
				   'delete' + resourceKey + 'ByQuery',
				   'Delete some ' + pluralName + ' by query',
				   'Delete all ' + pluralName + ' matching the specified query.');
      }      
    }
    return res;
  }

  function buildOperation(containerPath, mode, verb) {    
    var resourceName = controller.model().singular();
    var pluralName = controller.model().plural();

    var operation = buildBaseOperation(mode, verb, resourceName, pluralName);
    operation.tags = buildTags(resourceName);
    containerPath[verb] = operation;
    return operation;
  }

  // Convert a Mongoose type into a Swagger type
   function swagger20TypeFor(type) {
    if (!type) { return null; }
    if (type === String) { return 'string'; }
    if (type === Number) { return 'number'; }
    if (type === Date) { return 'string'; }
    if (type === Boolean) { return 'boolean'; }
    if (type === mongoose.Schema.Types.ObjectId) { return 'string'; }
    if (type === mongoose.Schema.Types.Oid) { return 'string'; }
    if (type === mongoose.Schema.Types.Array) { return 'array'; }
    if (Array.isArray(type) || type.name === "Array") { return 'array'; }
    if (type === Object) { return null;}
    if (type instanceof Object) { return null; }
    if (type === mongoose.Schema.Types.Mixed) { return null; }
    if (type === mongoose.Schema.Types.Buffer) { return null; }
    throw new Error('Unrecognized type: ' + type);
  }
  function swagger20TypeFormatFor(type) {
    if (!type) { return null; }
    if (type === String) { return null; }
    if (type === Number) { return 'double'; }
    if (type === Date) { return 'date-time'; }
    if (type === Boolean) { return null; }
    if (type === mongoose.Schema.Types.ObjectId) { return null; }
    if (type === mongoose.Schema.Types.Oid) { return null; }
    if (type === mongoose.Schema.Types.Array) { return null; }
    if (Array.isArray(type) || type.name === "Array") { return null; }
    if (type === Object) { return null; }
    if (type instanceof Object) { return null; }
    if (type === mongoose.Schema.Types.Mixed) { return null; }
    if (type === mongoose.Schema.Types.Buffer) { return null; }
    return null;
  }
  function skipProperty(name, path, controller) {
    var select = controller.select();
    var mode = (select && select.match(/(?:^|\s)[-]/g)) ? 'exclusive' : 'inclusive';
    var exclusiveNamePattern = new RegExp('\\B-' + name + '\\b', 'gi');
    var inclusiveNamePattern = new RegExp('(?:\\B[+]|\\b)' + name + '\\b', 'gi');
    // Keep deselected paths private
    if (path.selected === false) { 
      return true; 
    }
    // TODO is _id always included unless explicitly excluded?

    // If it's excluded, skip this one.
    if (select && mode === 'exclusive' && select.match(exclusiveNamePattern)) { 
      return true;
    }
    // If the mode is inclusive but the name is not present, skip this one.
    if (select && mode === 'inclusive' && name !== '_id' && !select.match(inclusiveNamePattern)) {
      return true;
    }
    return false;
  }
  // A method used to generated a Swagger property for a model
  function generatePropertyDefinition(name, path, definitionName) {
    var property = {};
    var type = path.options.type ? swagger20TypeFor(path.options.type) : 'string'; // virtuals don't have type

    if (skipProperty(name, path, controller)) {
      return;
    }
    // Configure the property
    if (path.options.type === mongoose.Schema.Types.ObjectId) {
      if ("_id" === name) {
        property.type = 'string';
      }
      else if (path.options.ref) {
        property.$ref = '#/definitions/' + utils.capitalize(path.options.ref);  
      }
    }
    else if (path.schema) {
      //Choice (1. embed schema here or 2. reference and publish as a root definition)
      property.type = 'array';        
      property.items = {
        //2. reference 
        $ref: '#/definitions/'+ definitionName + utils.capitalize(name)
      };       
    }
    else {
      property.type = type;
      var format = swagger20TypeFormatFor(path.options.type);
      if (format) {
        property.format = format;
      }
      if ("__v" === name) {
        property.format = 'int32';
      }           
    }

	/*
    // Set enum values if applicable
    if (path.enumValues && path.enumValues.length > 0) {
      // TODO:  property.allowableValues = { valueType: 'LIST', values: path.enumValues };
    }
    // Set allowable values range if min or max is present
    if (!isNaN(path.options.min) || !isNaN(path.options.max)) {
      // TODO: property.allowableValues = { valueType: 'RANGE' };
    }
    if (!isNaN(path.options.min)) {
      // TODO: property.allowableValues.min = path.options.min;
    }
    if (!isNaN(path.options.max)) {
      // TODO: property.allowableValues.max = path.options.max;
    }
	*/
    if (!property.type && !property.$ref) {
      warnInvalidType(name, path);
      property.type = 'string';
    }
    return property;
  }
  function warnInvalidType(name, path) {
    console.log('Warning: That field type is not yet supported in baucis Swagger definitions, using "string."');
    console.log('Path name: %s.%s', utils.capitalize(controller.model().singular()), name);
    console.log('Mongoose type: %s', path.options.type);
  }

  function mergePaths(definition, pathsCollection, definitionName) {
    Object.keys(pathsCollection).forEach(function (name) {
      var path = pathsCollection[name];
      var property = generatePropertyDefinition(name, path, definitionName);
      definition.properties[name] = property;
      if (path.options.required) {
        definition.required.push(name);
      }
    });
  } 

  // A method used to generate a Swagger model definition for a controller
  function generateModelDefinition (schema, definitionName) {
    var definition = {
      required: [],
      properties: {}
    };
    mergePaths(definition, schema.paths, definitionName);
    mergePaths(definition, schema.virtuals, definitionName);
    return definition;
  }

  function mergePathsForInnerDef(defs, collectionPaths, definitionName) {
    Object.keys(collectionPaths).forEach(function (name) {
      var path = collectionPaths[name];
      if (path.schema) {
        var newdefinitionName = definitionName + utils.capitalize(name); //<-- synthetic name (no info for this in input model)
        var def = generateModelDefinition(path.schema, newdefinitionName);
        defs[newdefinitionName] = def;
      }
    });
  }

  function addInnerModelDefinitions(defs, definitionName) {
    var schema = controller.model().schema;
    mergePathsForInnerDef(defs, schema.paths, definitionName);
    mergePathsForInnerDef(defs, schema.virtuals, definitionName);
  }

  // __Build the Definition__
  controller.generateSwagger2 = function () {	
    if (controller.swagger2) {
	  return controller;
	}
	
    var modelName = utils.capitalize(controller.model().singular());

    controller.swagger2 = { 
		paths: {}, 
		definitions: {}
	};

    // Add Resource Model
    controller.swagger2.definitions[modelName] = generateModelDefinition(controller.model().schema, modelName);
    addInnerModelDefinitions(controller.swagger2.definitions, modelName);

    // Paths
    var pluralName = controller.model().plural();

    var collectionPath = '/' + pluralName; 
    var instancePath =  '/' + pluralName + '/{id}'; 

    var paths = {};
    paths[instancePath] = {};
    paths[collectionPath] = {};
    buildOperation(paths[instancePath], 'instance', 'get');
    buildOperation(paths[instancePath], 'instance', 'put');
    buildOperation(paths[instancePath], 'instance', 'delete');
    buildOperation(paths[collectionPath], 'collection', 'get');
    buildOperation(paths[collectionPath], 'collection', 'post');
    buildOperation(paths[collectionPath], 'collection', 'delete');
    controller.swagger2.paths = paths;

    return controller;
  };

  return controller;
};
