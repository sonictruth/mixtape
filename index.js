const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const readline = require('readline');

const workDir = './output';
const defaultLinksFile = `${__dirname}/links.txt`;
const youtubeLinkRegexp =
  /http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/gi;
const youtoubeDlOptions = {
  extractAudio: true,
  noCallHome: true,
  noCheckCertificate: true,
  addMetadata: true,
  embedThumbnail: true,
  audioFormat: 'mp3',
  audioQuality: '0',
  metadataFromTitle: '%(artist)s - %(title)s',
  matchTitle: '(official|video|music|-)',
  preferFfmpeg: true,
  output: `${workDir}/%(title)s[%(id)s].%(ext)s`,
};

const download = async (link) => {
  console.log(`Downloading ${link}...`);
  return await youtubedl(link, youtoubeDlOptions);
};

const makeOutputDirectoryAndReturnFiles = () => {
  if (!fs.existsSync(workDir)) {
    fs.mkdirSync(workDir);
  }
  return fs.readdirSync(workDir);
};

const main = async () => {
  const files = makeOutputDirectoryAndReturnFiles();
  const inputLinksFile = process.argv.slice(2)[0] || './links.txt';
  console.log(`Input: ${inputLinksFile} Output: ${workDir}`);

  const lineReader = readline.createInterface({
    input: fs.createReadStream(inputLinksFile),
  });

  lineReader.on('line', async (line) => {
    const links = [...line.matchAll(youtubeLinkRegexp)];
    for (const [link, id] of links) {
      const isDownloaded = !!files.find((name) => name.includes(id));
      if (isDownloaded) {
        console.log(`Skipping ${link}.`);
        continue;
      }
      {
        try {
          out = await download(id);
          console.log(out);
        } catch (error) {
          console.error(`>>> ${link} ${error.stderr}`);
        }
      }
    }
  });
};

main();
