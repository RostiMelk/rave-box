const fs = require('fs');
const path = require('path');
const player = require('play-sound')((opts = {}));
const HuddlyDeviceAPIUSB = require('@huddly/device-api-usb').default;
const HuddlySdk = require('@huddly/sdk').default;

const usbApi = new HuddlyDeviceAPIUSB();
const sdk = new HuddlySdk(usbApi, [usbApi]);

let audio = null;
let audioTimeout = null;

(async () => {
	console.log('Starting Rave Box...');
	await sdk.init();

	sdk.on('ATTACH', async (cameraManager) => {
		const info = await cameraManager.getInfo();

		console.log(`${info.name} attached!`);
		console.log(`Running version ${info.version}`);

		const detector = await cameraManager.getDetector({ shouldAutoFrame: false });
		await detector.init();

		detector.on('DETECTIONS', (detections) => {
			const foundHead = detections.some((d) => d.label === 'head');

			if (foundHead) {
				playAudio();
			} else {
				stopAudio();
			}
		});

		process.on('SIGINT', async () => {
			await detector.destroy();
			await cameraManager.closeConnection();
			console.log('Stopping Rave Box...');
			process.exit();
		});
	});
})();

/**
 * Play audio
 *
 * @returns {Promise<void>}
 */
async function playAudio() {
	if (audioTimeout) {
		audioTimeout = clearTimeout(audioTimeout);
	}
	if (audio) return;

	const file = getRandomAudio();
	console.log(`Playing ${file}`);
	audio = player.play(file);
}

/**
 * Stop audio
 *
 * @returns {void}
 */
function stopAudio() {
	if (!audio || audioTimeout) return;

	audioTimeout = setTimeout(() => {
		console.log('Stopping audio');
		audio.kill();
		audio = null;
	}, 1000);
}

/**
 * Get a random audio file from the audio folder
 *
 * @returns {string}
 */
function getRandomAudio() {
	const audioDir = path.join(__dirname, 'audio');
	const audioFiles = fs.readdirSync(audioDir).filter((file) => {
		return file.endsWith('.mp3');
	});
	if (audioFiles.length === 0) {
		throw new Error('No audio files found in ' + audioDir);
	}
	const audioFile = audioFiles[Math.floor(Math.random() * audioFiles.length)];
	return path.join(audioDir, audioFile);
}
