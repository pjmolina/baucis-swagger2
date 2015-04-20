// __Dependencies__
var url = require('url');
var deco = require('deco');

// __Private Module Members__

//Follows Swagger 2.0: as described in https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md

// A method for capitalizing the first letter of a string
function capitalize (s) {
  if (!s) { 
    return s; 
  }
  if (s.length === 1) {
    return s.toUpperCase();
  }
  return s[0].toUpperCase() + s.substring(1);
}

// Figure out the basePath for Swagger API definition
function getBase (request, extra) {
  var parts = request.originalUrl.split('/');
  // Remove extra path parts.
  parts.splice(-extra, extra);
  var base = parts.join('/'); 
  return base;
}

function generateErrorModelDefinition() {
  var error = {
    required: ['code', 'message'],
    properties: {
      code: {
        type: 'integer',
        format: 'int32'
      },
      message: {
        type: 'string'
      }
    }
  };
  return error;
}

function buildTags(options) {
  var tags = []; 
  options.controllers.forEach(function (controller) {
    tags.push({
      name: controller.model().singular(),
      description: capitalize(controller.model().singular()) + ' resource.',
	  'x-resource': true //custom extension to state this tag represent a resource
    });
  });
  return tags;
}
function getReusableParameters() {
  return [];  
}
function getReusableResponses() {
  return [];  
}

function buildPaths(controllers) {
  var paths = {};
  controllers.forEach(function (controller) {
    var resourcePath = '/' + controller.model().plural();
    controller.generateSwagger2();

    for(var path in controller.swagger2.paths) {
      paths[path] = controller.swagger2.paths[path];
    }
  });
  return paths;
}
function buildDefinitions(controllers) {
  var definitions = {};
  controllers.forEach(function (controller) {
    var resourcePath = '/' + controller.model().plural();
    controller.generateSwagger2();
    
    for(var def in controller.swagger2.definitions) {
      definitions[def] = controller.swagger2.definitions[def];
    }
    definitions.ErrorModel = generateErrorModelDefinition();
  });
  return definitions;
}

// A method for generating a Swagger resource listing
function generateResourceListing (options) {
  var paths = buildPaths(options.controllers);
  var definitions = buildDefinitions(options.controllers);

  var listing = {
    swagger: '2.0',
    info: {
      description: 'Baucis generated API',
      version: options.version,
      title: 'api',
      //termsOfService: 'TOS: to be defined.',
      //contact: { 
      //  email: 'me@address.com' 
      //},
      //license: {
      //  name: 'TBD',
      //  url: 'http://license.com'
      //}
    },
    //host: null, 
    basePath: options.basePath,
    tags: buildTags(options),
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
    paths: paths,
    definitions: definitions,
    //parameters: getReusableParameters(),
    //responses: getReusableResponses(),
    securityDefinitions: {},
    security: []    
    //externalDocs: null
  };

  return listing;
}

//build an specific spec based on options and filtered controllers
function generateResourceListingForVersion(options) {
  var clone = JSON.parse(JSON.stringify(options.rootDocument));

  clone.info.version =  options.version;
  clone.basePath = options.basePath;

  clone.paths = buildPaths(options.controllers);
  clone.definitions = buildDefinitions(options.controllers);

  return clone;
}


// __Module Definition__
var decorator = module.exports = function (options, protect) {
  var api = this;

  api.generateSwagger2 = function() {
    //user can extend this swagger2Document
    api.swagger2Document = generateResourceListing({
      version: null,
      controllers: protect.controllers('0.0.1'),
      basePath: null
    });
    return api;
  };

  // Middleware for the documentation index.
  api.get('/swagger.json', function (request, response) {
    if (!api.swagger2Document) {
      api.generateSwagger2();
    }
    //Customize a swagger2Document copy by requested version
    var versionedApi = generateResourceListingForVersion({
      rootDocument: api.swagger2Document,
      version: request.baucis.release,
      controllers: protect.controllers(request.baucis.release),
      basePath: getBase(request, 1)
    });

    response.json(versionedApi);
  });

  return api;
};
