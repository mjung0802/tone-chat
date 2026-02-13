'use strict';

import client from '..';
import { strict as assert } from 'assert';

assert.strictEqual(client(), 'Hello from client');
console.info('client tests passed');
