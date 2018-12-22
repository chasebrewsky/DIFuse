# DIFuse

[![Build Status](https://travis-ci.org/chasebrewsky/DIFuse.svg?branch=master)](https://travis-ci.org/chasebrewsky/DIFuse)
[![Coverage Status](https://coveralls.io/repos/github/chasebrewsky/DIFuse/badge.svg?branch=master)](https://coveralls.io/github/chasebrewsky/DIFuse?branch=master)

IOC framework for node projects.

## Introduction

IOC libraries are becoming more popular in the JS ecosystem ever since the introduction of AngularJS. These libraries help to bring structure and maintainability to projects by promoting code reuse through loose coupling.

The architecture behind some of these libraries is quite brilliant, but many of them rely on decorators to achieve this brilliance. There are a few problems with this:

* Decorators are currently only a stage 2 proposal at the time of writing this and haven't been implemented in the main language. This means that current implementations may be subject to change if they decide to rewrite the current draft.
* Most current IOC frameworks written in Typescript tend to make use of the [Reflect API](https://github.com/rbuckton/reflect-metadata) to autoinject values based on their type definitions. This can fragment the codebase between the Typescript and Javascript implementations if not carefully architected. It also creates the potential for the library to break when sweeping changes are made in an ECMA major version upgrade since the [metadata proposal](https://rbuckton.github.io/reflect-metadata/) hasn't even been considered for ECMA adoption yet. Typescript documentation even warns developers that reflect metadata is still an experimental feature and subject to change in the future.

This uncertainty in the future of decorators and metadata can sometimes make using them a hard sell to developer teams attempting to make a long term application. They typically don't have the luxury of waiting until they become stable to begin making application.

The goal of this library was to implement a modern IOC solution for node without having to rely or build around the functionality of decorators.

## Solution

In order to work around decorators, this library drew inspiration the IOC system present in the original AngularJS framework. The IOC component of this framework worked quite well for building medium sized projects with swappable services. There were a few downsides to it's implementation though:

* Once a project got to a certain size, maintaining and refactoring the string identifiers for services became a nightmare. When there was a naming conflict and names had to be changed around, it wasn't simply a matter of allowing an IDE to find and refactor the name of a function or method; it was a trial and error effort to make sure that all tests passed and no bugs were introduced after the change.
* There wasn't much granular control over injecting one off depdendencies for a particular service in a module. Either you replaced that service for every service in the module or you were out of luck.

DIFuse aims to use the same general idea of the AngularJS IOC implementation while improving upon it's shortcomings.

## IOC Pattern

If you're already familiar with the IOC pattern, skip ahead to [getting started](#getting-started).

If you're not familiar with the pattern, then the [wikipedia article](https://en.wikipedia.org/wiki/Inversion_of_control) on the topic is a good primer, but I'll quickly go over how it's relevant in a javascript project.

Lets say that you have a node server that uses a global logging mechanism. Anytime that you need to use it you require it in your code like this:

```javascript
const logger = require('logger');

exports.add = (first, second) => {
  logger.log(`adding together ${first} and ${second}`);

  return first + second;
};
```

Lets say that you now have a particular business requirement that requires your project to completely overhaul the underlying logging module to a new one. Now you'll have to traverse the entire project to pull out that dependency and replace it. This can become quite time consuming depending on the size of the project.

This problem can be solved with a more functional approach by passing the variable to it when calling the function:

```javascript
exports.add = (first, second, logger) => {
  logger.log(`adding together ${first} and ${second}`);

  return first + second;
};
```

This works, but this also means that any other modules that use this function must also have a logger instantiated on them, and if that module is required by another module then that module has to pass the logger down the dependency chain. This can become hard to manage as a project grows.

IOC helps to manage this complexity by setting the logger service into a collection of other services, then injects the logger dependency into a Math service that has the `add()` method. In order to do that, the module must first be restructured:

```javascript
module.exports = class Math {
  constructor(logger) {
    this.logger = logger;
  }

  add(first, second) {
    this.logger.log(`adding together ${first} and ${second}`);

    return first + second;
  }
}
```

Here we're taking advantage of the new ES6 `Class` to define a function and it's prototype using some nice syntax sugar. This can also be implemented in ES5 but this syntax provides a clear view of how the IOC components work.

This new service would then be placed into a parent container with the logger service:

```javascript
const { Container } = require('difuse');
const Math = require('./math');

class Logger {
  log(message) {
    console.log(message)
  }
}

const container = new Container();

container.service(Logger);
container.service(Math, [Logger]);
```

Here we define a logger class with the `log()` method. Then we take our originally defined `Math` class, define it on the container, and set the previous `Logger` function as the logger for the Math class.

In order to use our `Math` service, we first have to retrieve it using it's function variable:

```javascript
const math = container.get(Math);

math.add(2, 3);
// Outputs: adding together 2 and 3
```

Under the hood, when the `Math` service is retrieved it looks for any `Logger` services defined on the container to use as the logger dependency. Since we already defined one before we registered the service, it instantiates that service and injects it into the `Math` service. The process of delaying instantiation until service retrieval is called **lazy loading** and it's used to prevent unnecessary processing cycles on module instantiations that won't be used. Once a service is initiated in a container, it gets cached for later retrievals.

## Getting Started

Containers are the central mechanism responsible for registering, instantiating, and storing services. Services are values or pieces of reusable functionality that optionally have dependencies provided to them by the parent container. Containers are easy to instantiate:

```javascript
const { Container } = require('difuse');

const container = new Container();
```

Once a container is instantiated, different kinds of services can be registered to it.

### Constants

The simplest thing to define on a container is a constant value that is reused across the container. In order to identify this constant, it must be registered with a `Token`. Tokens are unique identifiers in your codebase used to represent a particular service. They're created like so:

```javascript
const { Token } = require('difuse');

const URL = new Token('URL');
```

Token's accept an optional string value when they're instantiated to provide a human readable description of that token in things like error messages. It's good practice to give the token a name.

Once the token is created for the constant, it's used to define the constant value on a container:

```javascript
const { Token, Container } = require('difuse');

const container = new Container();
const URL = new Token('URL');

container.constant(URL, 'http://www.company.com/');
```

In order to retrieve the constant from the container, ask for the token associated with the value from the container:

```javascript
const url = container.get(URL); // Value: 'http://www.company.com/'
```

### Services

Services in DIFuse are singletons that are instantiated using other services located in the container. Simple services without dependencies are easy to define:

```javascript
const { Container } = require('difuse');

class Service {
  hello(name) {
    return `Hello, ${name}`
  }
}

const container = new Container();

container.service(Service);
```

Then to retrieve the defined service:

```javascript
const service = container.get(Service);

service.hello('there') // Outputs: Hello, there
```

Services differ from constants in that they use the service definition function as their unique identifier instead of a `Token`. This is for a few reasons:

* Function definitions are by nature unique tokens in a codebase, so using a `Token` would just be redundant.
* Using a function definition as a token creates an explicit expectation of the methods and properties of the passed in service. Developers simply have to jump to the function definition to get an idea of what is being passed in instead of having to track which service was defined with the `Token`.
* It allows the identifier and function definition to be declared in one variable instead of two.

Defining dependencies on a service is also simple:

```javascript
const { Container, Token } = require('difuse');

const URL = new Token('URL');
const container = new Container();

class Logger {}

class Service {
  constructor(logger, url) {
    this.logger = logger;
    this.url = url;
  }
}

const container = new Container();

container.constant(URL, 'http://www.company.com/');
container.service(Logger)
container.service(Service, [Logger, URL]);
```

Now when we `get()` the service from the container, the `Logger` class gets instantiated and placed into `Service` as the logger dependency and `'http://www.company.com/'` gets set as the URL for the service.

### Interfaces

Using the service function as the service identifier prevents us from having to maintain a separate token identifier while defining the function to use as the service at the same time. This works when the service is expected to always use that function as it's implementation.

Interfaces solve the situations where the implementation is expected to vary but the general methods and values stay the same, just like interfaces in statically typed languages.

Lets say for example that our application accepts a logging interface instead of a logging service. We have two logging implementations that have the same `log()` method :

```javascript
// Logger implementation that outputs to console.
class ConsoleLogger {
  log(message) {
    console.log(message);
  }
}

// Logger implementation that outputs to a write stream.
class OutputLogger {
  constructor(output) {
    this.output = output;
  }
  log(message) {
    this.output.write(message);
  }
}
```

We can choose between these two implementations by setting either one or the other as the dedicated logging interface. Lets say we went to set the console logger as the matching interface:

```javascript
const { Container, Token } = require('difuse');
const { ConsoleLogger } = require('./loggers');

const LOGGER = new Token('Logger');
const container = new Container();

container.interface(LOGGER, ConsoleLogger);
```

We utilize a token as the identifer for the service since the function definition can change based on the matching interface. The `ConsoleLogger` is simple because it doesn't contain any dependencies. If we define `OutputLogger` as the matching service interface though then we have to define it like this:

```javascript
const { Container, Token } = require('difuse');
const { OutputLogger } = require('./loggers');

const LOGGER = new Token('Logger');
const container = new Container();

container.interface(LOGGER, OutputLogger, [process.stdout]);
```

It's almost exactly the same as the service definition, except with a `Token` used as the identifier.

### Providers

The previous examples are all considered helper functions to create a `Provider` for a service. `Providers` are reponsible for creating the finished service to be cached by the parent container. Constant providers simply return the given value for a constant. Service providers make sure that the number of dependencies match the function argument length and handle resolving those dependencies from the parent container.

You as the developer have complete control of creating your own provider:

```javascript
const { Container, Token } = require('difuse');

const SERVICE = new Token('SERVICE');

class Service {}

// Provider attached to the Service function.
container.provider(Service, (container) => {
  // Create and return any value.
});

// Provider attached to the SERVICE token.
container.provider(SERVICE, (container) => {
  // Create and return any value.
});
```

### Hierarchy

Containers are able to work in a hierarchical structure, meaning that they can look through parent containers to resolve service dependencies:

```javascript
const { Container, Token } = require('difuse');

const URL = new Token('URL');
const parent = new Container();

parent.constant(URL, 'http://www.company.com/');

const child = Container();

child.inherits(parent);

const url = child.get(URL);
```

In this case, `url` ends up being equal to `'http://www.company.com/'` even though the `URL` token isn't present on the child container. This is because the token is present on the parent container.

This also works in reverse, meaning that if the value is located in both containers, then it uses the one in the child container instead of the parent container:

```javascript
const { Container, Token } = require('difuse');

const URL = new Token('URL');
const parent = new Container();

parent.constant(URL, 'http://www.company.com/');

const child = Container();

child.inherits(parent);
child.constant(URL, 'http://www.another.com/');

const url = child.get(URL);
```

In this case, `url` ends up being equal to `'http://www.another.com/'` because it's the first definition it comes across in the container hierarchy.

This functionality is very helpful at the service definition level for quick replacements of particular services. There may be times that a business requirement changes and only a particular service needs to be changed to accept a different URL instead of all services in a container.

Both the service and interface definition functions allow a local container to be passed in for this exact purpose:

```javascript
const { Container, Token } = require('difuse');

const URL = new Token('URL');
const LOGGER = new Token('Logger');
const container = new Container();

// Service that will receive the container level url.
class Service {
  constructor(url) {
    this.url = url;
  }
}

// Service that will receive the definition level url.
class Replacement {
  constructor(url) {
    this.url = url;
  }
}

// Interface that will receive a definition level url.
class Logger {
  constructor(url) {
    this.url = url;
  }
}

container.constant(URL, 'http://www.company.com');
container.service(Service, [URL]);

// Define a service level container that sets the URL.
container.service(Replacement, [URL], (container) => {
  container.constant(URL, 'http://www.replacement.com');
});

// Define an interface level container that sets the URL.
container.interface(LOGGER, Logger, [URL], (container) => {
  container.constant(URL, 'http://www.interface.com');
});
```

`Replacement` is instantiated with the value `'http://www.replacement.com'` and `LOGGER` is instantiated with the value `'http://www.interface.com'`.

## Roadmap

There are several features already planned on the road to V1 to help differentiate this library from others:

* **Token Validators**: Since constants and interfaces are defined using a token and that token implicitly communicates a certain data type, then tokens should optionally include type validations to ensure that passed in data types match the data type the token represents.
* **Testing Utilities**: IOC designs promote loose coupling, which leads to highly testable applications without having to constantly mock and reset dependencies in the target environments module system. During testing, it would be good to have a test container or test services to help prevent constantly repeating the same code to test services in the IOC system.
* **Service Interface Reuse**: Currently in order to match a service to an interface, the system instantiates a new service that matches to the interface token. If there is already an instantiated service that matches the expected interface, it would be useful to mark that service as the matched interface within that container so that the service doesn't have to be instantiated twice.
* **Container Configuration**: Right now containers come with a default configuration for how they behave, like throwing an error when a registered service is attempted to be overwritten. These should be optionally set instead of unchangable.

Other feature requests and pull requests are welcome.
