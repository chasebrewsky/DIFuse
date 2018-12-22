# DIFuse

[![Build Status](https://travis-ci.org/chasebrewsky/DIFuse.svg?branch=master)](https://travis-ci.org/chasebrewsky/DIFuse)
[![Coverage Status](https://coveralls.io/repos/github/chasebrewsky/DIFuse/badge.svg?branch=master)](https://coveralls.io/github/chasebrewsky/DIFuse?branch=master)

IOC framework for JS/TS projects.

## Introduction

IOC libraries are becoming more popular in the JS ecosystem ever since the introduction of AngularJS and Typescript. These libraries helped to bring structure and maintainability to projects by promoting code reuse through loose coupling.

The architecture behind some of these libraries is quite brilliant, but many of them rely on decorators to achieve this brilliance. There are a few problems with this:

* Decorators are currently only a stage 2 proposal at the time of writing this and haven't been implemented in the main language. This means that current implementations may be subject to change if they decide to rewrite the current draft.
* Since decorators aren't part of the main language yet, a compilation step is required to get decorators working. This adds more complexity to the project build, which may be overkill for smaller projects.
* Current IOC frameworks written in Typescript tend to make use of the [Reflect API](https://github.com/rbuckton/reflect-metadata) to autoinject values based on their type definitions. This can fragment the codebase between the Typescript and Javascript implementations if not carefully architected. It also creates the potential for the library to break when sweeping changes are made in an ECMA major version upgrade since the [metadata proposal](https://rbuckton.github.io/reflect-metadata/) hasn't even been considered for ECMA adoption yet. Typescript even warns developers that reflect metadata is still an experimental feature and subject to change in the future.

This uncertainty in the future of decorators and metadata can sometimes make using them a hard sell to developer teams attempting to make a long term application.

The goal of this library was to implement a modern IOC solution that had the same API in both JS/TS without having to rely or build around the functionality of decorators.

## Solution

In order to work around decorators, this library drew inspiration of one of the most popular IOC libraries before Angular: AngularJS. The IOC component of this framework worked quite well for building medium sized projects with swappable services. There were a few downsides to it's implementation though:

* Once a project got to a certain size, maintaining and refactoring the string identifiers for services became a nightmare. When there was a naming conflict and names had to be changed around, it wasn't simply a matter of allowing an IDE to find and refactor the name of a function or method; it was a trial and error effort to make sure that all tests passed and no bugs were introducted after the change.
* There were several provider functions which all registered a service with very small differences between them. This led to one of the most asked questions about AngularJS: what's the difference between a service and a factory? Services and Factories differed in whether the developer instantiated them or the IOC system did. Values and Constants differed in whether the value is present during the configuration phase. These small differences add up to create a cluttered API that was too tied to the internal lifecycle of the framework.

DIFuse aims to use the same general framework of AngularJS while improving upon it's shortcomings. Service identifiers are part of the actual code that can be imported and refactored around the codebase. Every part of the API attempts to solve a distinct problem.

## Overview

```javascript
import { Container, Token } from 'difuse';

// Container that holds all services until they're lazily loaded.
const container = new Container();

// Define a constant in the container with no dependencies using a
// globally unique identifier.
const BASE_URL = new Token('BASE_URL');
container.constant(BASE_URL, '/app/')

// Retrive the previous constant using it's token identifier.
const baseURL = container.get(BASE_URL);

// Define a service and it's dependencies using the function declaration
// as the identifier.
class HTTP {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }
}
container.service(HTTP, [BASE_URL])

// Retrive the previous service using the function as the identifier.
const http = container.get(HTTP);

// Define a service with dependencies that adhere to a particular interface.
const LOGGER = new Token('Logger');
class Logger {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }
  info(message) {
    console.log(`INFO ${baseURL} ${message}`)
  }
}
container.interface(LOGGER, Logger, [BASE_URL]);
```

## Interface

Using the service function as the service identifier prevents us from having to maintain a separate token identifier while defining the function to use as the service. This works when the service is expected to always use that function as it's implementation.

Interfaces solve the situations where the implementation is expected to vary but the general methods and values stay the same, just like interfaces in staticly typed languages.
