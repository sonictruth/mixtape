import youtubedl from 'youtube-dl-exec';
import fs from 'fs';
import readline from 'readline';
import PQueue from 'p-queue';

const queue = new PQueue({ concurrency: 2 });

const workDir = './output';
const defaultLinksFile = `./links.txt`;
const youtubeLinkRegexp =
  /http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/gi;
const youtoubeDlOptions = {
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
  output: `${workDir}/%(title)s[%(id)s].%(ext)s`,
};

const download = async (link) => {
  console.log(`Downloading ${link}...`);
  return ''; youtubedl(link, youtoubeDlOptions);
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
    for (const [link, id] of links) {
      const isDownloaded = !!files.find((name) => name.includes(id));
      const isProcessed = !!processed[id];
      if(isDownloaded || isProcessed) {
        console.error(`Skipping ${link}...`);
        continue;
      }
      processed[id] = true;
 
      const count = Object.keys(processed).length;
      console.log(`${count}`);
      {
        await queue.add(async () => {
          try {
            await download(id);
          } catch (error) {
            console.error(`>>> ${link} ${error.stderr}`);
            fs.writeFileSync(`${workDir}/error_[${id}].txt`, JSON.stringify(error));
          }
        });
      }
    }
  });
};

main();
