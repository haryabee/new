import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { benchmarks } from './benchmarks.js';

if (execSync('git status --porcelain').toString().trim()) {
	console.error('Working directory is not clean');
	process.exit(1);
}

const filename = fileURLToPath(import.meta.url);
const results = path.resolve(filename, '../.results');

if (fs.existsSync(results)) fs.rmSync(results, { recursive: true });
fs.mkdirSync(results);

const branches = [];

for (const arg of process.argv.slice(2)) {
	if (arg.startsWith('--')) continue;
	if (arg === filename) continue;

	branches.push(arg);
}

if (branches.length === 0) {
	branches.push(
		execSync('git symbolic-ref --short -q HEAD || git rev-parse --short HEAD').toString().trim()
	);
}

if (branches.length === 1) {
	branches.push('main');
}

for (const branch of branches) {
	const results = [];
	for (const benchmark of benchmarks) {
		const result = await benchmark();
		console.log(result.benchmark);
		results.push(result);
	}

	fs.writeFileSync(`${results}/${branch}.json`, JSON.stringify(a_results, null, '  '));
}

// TODO compare the results
