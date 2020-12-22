function generateTOC() {
  const titles = getTitles();
  insertTOC(titles);
}

function getTitles() {
  const article = document.getElementById('article');
  const nodes = ['H1', 'H2', 'H3'];
  let titles = [];
  article.childNodes.forEach(function(e, i) {
    if (nodes.includes(e.nodeName)) {
      const id = 'header-' + i;
      e.setAttribute('id', id);
      titles.push({
        id: id,
        text: e.innerHTML,
        level: Number(e.nodeName.substring(1, 2)),
        nodeName: e.nodeName
      });
    }
  });
  return titles;
}

function insertTOC(titles) {
  const toc = document.getElementById('toc');
  for (let i = 1; i < titles.length; i++) {
    let title = titles[i];
    let template = `<li><a href="#${title.id}">${title.text}</a></li>`;
    toc.insertAdjacentHTML('beforeend', template);
  }
}
