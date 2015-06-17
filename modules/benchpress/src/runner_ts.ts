/// <reference path="../../angular2/typings/node/node.d.ts" />

import * as language_agnostic from './runner';
import {Binding, bind} from 'angular2/di';
import {Options} from './common_options';

// Note: Can't do the `require` call in a facade as it can't be loaded into the browser
// for our unit tests via karma. That's why file access is not abstracted in a facade.
var fs = require('fs');

/**
 * Language-specific runner that adds language-specific bindings.
 */
export class Runner extends language_agnostic.Runner {
  constructor(defaultBindings: List<Binding> = null) {
    if (defaultBindings == null) {
      defaultBindings = [];
    }
    defaultBindings.push(bind(Options.WRITE_FILE)
                             .toValue(function writeFile(filename, content): Promise<any> {
                               return new Promise(function(resolve, reject) {
                                 fs.writeFile(filename, content, (error) => {
                                   if (error) {
                                     reject(error);
                                   } else {
                                     resolve();
                                   }
                                 });
                               })
                             }));
    super(defaultBindings);
  }
}
