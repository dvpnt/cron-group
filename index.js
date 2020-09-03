const EventEmitter = require('events');
const {CronJob} = require('cron');

class CronGroup extends EventEmitter {
	constructor({timezone} = {}) {
		super();

		this.timezone = timezone;
		this.jobs = {};
		this.runningCount = 0;
	}

	add({name, schedule, worker}) {
		if (this.jobs[name]) {
			throw new Error(`CronGroup: cron with name "${name}" already exist`);
		}

		const cron = new CronJob({
			cronTime: schedule,
			onTick: () => {
				this.run(name, 'schedule');
			},
			timezone: this.timezone,
			start: false
		});

		this.jobs[name] = {
			cron,
			schedule,
			worker,
			isRunning: false
		};
	}

	async run(name, runnedBy = 'manual') {
		if (!this.jobs[name]) {
			throw new Error(`CronGroup: unknown job "${name}"`);
		}

		if (this.jobs[name].isRunning) {
			return;
		}

		const {worker} = this.jobs[name];
		const runnedAt = Date.now();

		this.jobs[name].isRunning = true;
		this.runningCount++;
		this.emit('run', {name, runnedAt, runnedBy});

		try {
			const result = await worker();

			this.jobs[name].isRunning = false;
			this.runningCount--;
			this.emit('complete', {
				name,
				result,
				runnedAt,
				completedAt: Date.now()
			});
		} catch (err) {
			this.jobs[name].isRunning = false;
			this.runningCount--;
			this.emit('error', {name, err});
		}
	}

	start() {
		Object.values(this.jobs).forEach(({cron}) => {
			cron.start();
		});
	}

	async stop() {
		Object.values(this.jobs).forEach(({cron}) => {
			cron.stop();
		});

		if (this.runningCount === 0) return;

		return new Promise((resolve) => {
			const handler = () => {
				if (this.runningCount === 0) {
					this.off('complete', handler);
					this.off('error', handler);
					resolve();
				}
			};

			this.on('complete', handler);
			this.on('error', handler);
		});
	}
}

module.exports = CronGroup;
