const t = require('tap');
const {CronJob} = require('cron');
const sinon = require('sinon');
const CronGroup = require('.');

function noop() {}

t.test('CronGroup', async (t) => {
	await t.test('constructor', (t) => {
		const group = new CronGroup();

		t.ok(group, 'success');
		t.strictSame(group.jobs, {}, 'check jobs');
		t.is(group.runningCount, 0, 'check runningCount');
		t.end();
	});

	await t.test('add', async (t) => {
		await t.test('success', (t) => {
			const group = new CronGroup();

			group.add({
				name: 'foo',
				schedule: '* * * * * *',
				worker: noop
			});

			t.ok(group.jobs.foo, 'check added job');
			const foo = group.jobs.foo;
			t.type(foo.cron, CronJob, 'check CronJob instance');
			t.is(foo.schedule, '* * * * * *', 'check schedule');
			t.is(foo.worker, noop, 'check worker');
			t.is(foo.isRunning, false, 'check isRunning');
			t.end();
		});

		await t.test('already added', (t) => {
			const group = new CronGroup();

			group.add({
				name: 'foo',
				schedule: '* * * * * *',
				worker: noop
			});

			t.throws(
				() => group.add({
					name: 'foo',
					schedule: '* * * * * *',
					worker: noop
				}),
				{message: 'CronGroup: cron with name "foo" already exist'},
				'throw'
			);
			t.end();
		});
	});

	await t.test('run', async (t) => {
		await t.test('success', async (t) => {
			const group = new CronGroup();

			group.add({
				name: 'foo',
				schedule: '* * * * * *',
				worker: () => Promise.resolve('ok!')
			});

			const runSpy = sinon.spy();
			const completeSpy = sinon.spy();

			group.on('run', ({name, runnedAt, runnedBy}) => {
				t.is(name, 'foo', 'check name');
				t.ok(runnedAt, 'check runnedAt');
				t.is(runnedBy, 'manual', 'check runnedBy');
				t.is(group.jobs.foo.isRunning, true, 'check isRunning');
				t.is(group.runningCount, 1, 'check runningCount');
				runSpy();
			});

			group.on('complete', ({name, result, runnedAt, completedAt}) => {
				t.is(name, 'foo', 'check name');
				t.ok(runnedAt, 'check runnedAt');
				t.ok(completedAt, 'check completedAt');
				t.is(result, 'ok!', 'check result');
				t.is(group.jobs.foo.isRunning, false, 'check isRunning');
				t.is(group.runningCount, 0, 'check runningCount');
				completeSpy();
			});

			await group.run('foo');

			t.ok(runSpy.calledOnce, 'run event emitted once');
			t.ok(completeSpy.calledOnce, 'complete event emitted once');
		});

		await t.test('already running', async (t) => {
			const group = new CronGroup();

			group.add({
				name: 'foo',
				schedule: '* * * * * *',
				worker: () => new Promise((resolve) => setTimeout(resolve, 100))
			});

			const runSpy = sinon.spy();
			const completeSpy = sinon.spy();

			group.on('run', runSpy);
			group.on('complete', completeSpy);

			await Promise.all([
				group.run('foo'),
				group.run('foo')
			]);

			t.ok(runSpy.calledOnce, 'run event emitted once');
			t.ok(completeSpy.calledOnce, 'complete event emitted once');
		});

		await t.test('with error', async (t) => {
			const group = new CronGroup();

			group.add({
				name: 'foo',
				schedule: '* * * * * *',
				worker: () => Promise.reject('error!')
			});

			const runSpy = sinon.spy();
			const completeSpy = sinon.spy();
			const errorSpy = sinon.spy();

			group.on('run', runSpy);
			group.on('complete', completeSpy);
			group.on('error', ({name, err}) => {
				t.is(name, 'foo', 'check name');
				t.is(err, 'error!', 'check error');
				errorSpy();
			});

			await group.run('foo');

			t.ok(runSpy.calledOnce, 'run event emitted once');
			t.ok(completeSpy.notCalled, 'complete event never emitted');
			t.ok(errorSpy.calledOnce, 'error event emitted once');
		});
	});

	await t.test('start', (t) => {
		const group = new CronGroup();

		group.add({
			name: 'foo',
			schedule: '* * * * * *',
			worker: () => new Promise((resolve) => setTimeout(resolve, 100))
		});

		group.on('complete', ({name}) => {
			group.stop();

			t.is(name, 'foo', 'cron is runned');
			t.end();
		});

		group.start();
	});

	await t.test('stop', async (t) => {
		await t.test('without running jobs', async (t) => {
			const group = new CronGroup();

			group.add({
				name: 'foo',
				schedule: '* * * * * *',
				worker: noop
			});

			t.notOk(await group.stop(), 'stopped');
		});

		await t.test('wait untill all completed', async (t) => {
			const group = new CronGroup();

			group.add({
				name: 'foo',
				schedule: '* * * * * *',
				worker: () => new Promise((resolve) => setTimeout(resolve, 100))
			});

			group.add({
				name: 'bar',
				schedule: '* * * * * *',
				worker: () => new Promise((resolve) => setTimeout(resolve, 200))
			});

			const completeSpy = sinon.spy();

			group.on('complete', completeSpy);

			group.run('foo');
			group.run('bar');

			await group.stop();

			t.ok(completeSpy.calledTwice, 'complete emitted twice');
		});
	});
});
