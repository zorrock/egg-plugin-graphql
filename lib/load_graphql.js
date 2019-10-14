'use strict';

const util = require('util');
const path = require('path');
const fs = require('fs');
const debug = require('debug')('egg-plugin-graphql');
const glob = require('glob');
const { merge } = require('lodash');

const g = util.promisify(glob);


const SYMBOL_GRAPHQL_CONFIG = Symbol('Application#graphqlConfig');

module.exports = async app => {

  const { graphql: { defaultEmptySchema = false } } = app.config;
  const basePath = path.join(app.baseDir, 'app/graphql');

  const typeDefsFiles = await g(`${basePath}/**/*.@(gql|graphql|graphqls)`);
  const resolverFiles = await g(`${basePath}/**/?(*.)resolver.@(js|ts)`);
  debug('find %d schema files', typeDefsFiles.length);
  debug('find %d resolver files', resolverFiles.length);

  const typeDefs = [];
  if (defaultEmptySchema) {
    debug('use default empty GraphQL schema');
    typeDefs.push('type Query { _empty: String }');
    typeDefs.push('type Mutation { _empty: String }');
  }

  typeDefsFiles.forEach(file => {
    const schema = fs.readFileSync(file, { encoding: 'utf8' });
    typeDefs.push(schema);
  });

  const resolvers = {};
  resolverFiles.forEach(file => {
    const resolver = require(file);
    merge(resolvers, resolver);
  });


  Object.defineProperty(app, 'graphqlConfig', {
    get() {
      if (!this[SYMBOL_GRAPHQL_CONFIG]) {
        this[SYMBOL_GRAPHQL_CONFIG] = {
          typeDefs,
          resolvers,
        };
      }
      return this[SYMBOL_GRAPHQL_CONFIG];
    },
  });

};