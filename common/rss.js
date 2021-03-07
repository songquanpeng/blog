const Feed = require('feed').Feed;
const { getPagesByRange } = require('../cache/page');
const fs = require('fs');
const { md2html } = require('./util');

let Config;

function enableRSS(config) {
  Config = config;
  setTimeout(async () => {
    await generateRSS();
    setInterval(generateRSS, 24 * 60 * 60);
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

  let pages = await getPagesByRange(0, 10);
  pages.forEach(page => {
    feed.addItem({
      title: page.title,
      id: page.link,
      link: `https://${Config.domain}/page/${page.link}`,
      description: page.description,
      content: md2html(page.converted_content),
      author: [
        {
          name: page.author
        }
      ],
      date: new Date(page.edit_time)
    });
  });
  fs.writeFile('./public/feed.xml', feed.atom1(), () => {
    console.log('Feed generated.');
  });
}

module.exports = {
  enableRSS
};
