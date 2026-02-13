'use strict';

import server from '..';
import { strict as assert } from 'assert';

assert.strictEqual(server(), 'Hello from server');
console.info('server tests passed');
