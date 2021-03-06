# cron-group
[![Build Status](https://travis-ci.org/dvpnt/cron-group.svg?branch=master)](https://travis-ci.org/dvpnt/cron-group)
[![Coverage Status](https://coveralls.io/repos/github/dvpnt/cron-group/badge.svg?branch=master)](https://coveralls.io/github/dvpnt/cron-group?branch=master)
[![NPM Version](https://img.shields.io/npm/v/cron-group.svg)](https://www.npmjs.com/package/cron-group)

Manage a group of cron workers. Based on [node-cron](https://github.com/kelektiv/node-cron).

## Install
    $ npm i cron-group

## API

### `constructor([options])`
* `options` - optional
	* `timezone` - pass it to [CronJob](https://github.com/kelektiv/node-cron#api) constructor

### `add({name, schedule, worker})`
* `name` - name of job
* `schedule` - schedule in cron format
* `worker` - worker function

Add cron job to group without starting.

### `run(name)`
* `name` - name of job to run

Run specified by name job.

###  `start()`
Enable cron for all added jobs.

### `stop()`
Disable cron for all added jobs, and wait until all jobs is complete.

## Events
CronGroup is subclass of [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter), so it fires some events.

### `on('complete', {name, result, runAt, completedAt})`
* `name` - name of job
* `result` - result returned from worker function
* `runAt` - when job is run
* `completedAt` - whe job is complete

### `on('error', {name, err})`
* `name` - name of job
* `err` - error object caught in worker function


## Usage example

```js
const CronGroup = require('cron-group');

const group = new CronGroup({
	timezone: 'Europe/Moscow'
});

group.add({
	name: 'foo',
	schedule: '* * * * * *',
	worker: new Promise((resolve) => setTimeout(resolve, 3000))
});

group.add({
	name: 'bar',
	schedule: '30 * * * * *',
	worker: new Promise((resolve) => setTimeout(resolve, 1000))
});

group.on('run', ({name, cause}) => {
	console.log(`${name} is run by ${cause}`);
});

group.on('complete', ({name, runAt, completedAt}) => {
	const prettyTime = Math.floor((completedAt - runAt) / 1000);
	console.log(`${name} successfully completed in ${prettyTime}s`);
});

group.on('error', ({name, err}) => {
	console.error(`${name} is completed with error\n${err.stack || err}`);
});

group.start();
```

## License

[The MIT License](https://raw.githubusercontent.com/dvpnt/cron-group/master/LICENSE)