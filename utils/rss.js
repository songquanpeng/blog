const Feed = require('feed').Feed;
const Page = require('../models/page').Page;
const fs = require('fs');

let Config;

function enableRSS(config) {
  Config = config;
  setTimeout(() => {
    generateRSS();
    setInterval(generateRSS, 24 * 60 * 60);
  }, 5000);
}

function generateRSS() {
  console.log('Start generating Feed.');
  const feed = new Feed({
    title: 'Feed Title',
    description: 'This is my personal feed!',
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

  Page.getByRange(0, 10, pages => {
    pages.forEach(page => {
      feed.addItem({
        title: page.title,
        id: page.link,
        link: `https://${Config.domain}/page/${page.link}`,
        description: page.description,
        content: page.converted_content,
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
  });
}

module.exports = {
  enableRSS
};
