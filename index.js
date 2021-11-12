import * as ytdl from 'youtube-dl-exec';
import fs from 'fs';
import readline from 'readline';
import PQueue from 'p-queue';
import crypto from 'crypto';

const queue = new PQueue({ concurrency: 2 });

const ytDownloader = ytdl.default.create('yt-dlp');

const workDir = './output';
const defaultLinksFile = `./links.txt`;
const youtubeLinkRegexp =
  /http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/gi;
const youtoubeDlOptions = {
  userAgent:
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:68.0) Gecko/20100101 Firefox/68.0',
  extractAudio: true,
  noCallHome: true,
  noCheckCertificate: true,
  addMetadata: true,
  embedThumbnail: true,
  audioFormat: 'mp3',
  // audioQuality: '0',
  metadataFromTitle: '%(artist)s - %(title)s',
  matchTitle: '(official|video|music|-)',
  preferFfmpeg: true,
};

const download = async (link, output) => {
  console.log(`Downloading ${link}...`);
  return ytDownloader(link, {
    ...youtoubeDlOptions,
    output,
  });
};

const getHash = (sting) => {
  const shasum = crypto.createHash('sha1');
  shasum.update(sting);
  return shasum.digest('hex').slice(0, 10);
};

const makeOutputDirectoryAndReturnFiles = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  return fs.readdirSync(dir);
};

const main = async () => {
  const files = makeOutputDirectoryAndReturnFiles(workDir);
  const inputLinksFile = process.argv.slice(2)[0] || './links.txt';
  console.log(`Input: ${inputLinksFile} Output: ${workDir}`);
  const processed = {};
  const lineReader = readline.createInterface({
    input: fs.createReadStream(inputLinksFile),
  });

  lineReader.on('line', async (line) => {
    const links = [...line.matchAll(youtubeLinkRegexp)];
    for (const [link] of links) {
      const hash = getHash(link);
      const isDownloaded = !!files.find((name) => name.includes(hash));
      const isProcessed = !!processed[hash];
      if (isDownloaded || isProcessed) {
        console.error(
          `Skipping ${hash} D:${isDownloaded} P:${isProcessed} ${link}...`
        );
        continue;
      }
      processed[hash] = true;

      const count = Object.keys(processed).length;
      console.log(`${count}`);
      {
        await queue.add(async () => {
          try {
            await download(link, `${workDir}/%(artist)s - %(title)s[${hash}].%(ext)s`);
          } catch (error) {
            console.error(`>>> ${link} ${error.stderr} `);
            fs.writeFileSync(
              `${workDir}/error_[${hash}].txt`,
              `${link} = ${error.stderr} ] \n ${JSON.stringify(error,null,1)}`
            );
          }
        });
      }
    }
  });
};

main();
