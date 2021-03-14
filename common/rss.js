const Feed = require('feed').Feed;
const { getPagesByRange } = require('./cache');
const fs = require('fs');
const { convertContent } = require('./cache');
const { md2html } = require('./util');

let Config;

function enableRSS(config) {
  Config = config;
  setTimeout(async () => {
    await generateRSS();
    setInterval(generateRSS, 24 * 60 * 60 * 1000);
  }, 5000);
}

async function generateRSS() {
  console.log('Start generating Feed.');
  const feed = new Feed({
    title: `${Config.site_name}`,
    description: `${Config.description}`,
    id: Config.domain,
    link: `https://${Config.domain}/`,
    language: `${Config.language}`,
    favicon: `${Config.favicon}`,
    copyright: `${Config.copyright}`,
    feedLinks: {
      atom: 'https://example.com/atom.xml'
    },
    author: {
      name: `${Config.author}`,
      link: `https://${Config.domain}/`
    }
  });

  try {
    let pages = await getPagesByRange(0, 10);
    pages.forEach(page => {
      feed.addItem({
        title: page.title,
        id: page.link,
        link: `https://${Config.domain}/page/${page.link}`,
        description: page.description,
        converted_content: convertContent(page, false),
        author: [
          {
            name: page.author
          }
        ],
        date: new Date(page.updatedAt)
      });
    });
    fs.writeFile('./public/feed.xml', feed.atom1(), () => {
      console.log('Feed generated.');
    });
  } catch (e) {
    console.error(e);
  }
}

module.exports = {
  enableRSS
};
