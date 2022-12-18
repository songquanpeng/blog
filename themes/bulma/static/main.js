function generateTOC() {
  const titles = getTitles();
  insertTOC(titles);
}

function getTitles() {
  const article = document.getElementById('article');
  const nodes = ['H2'];
  let titles = [];
  let count = 0;
  article.childNodes.forEach(function(e, i) {
    if (nodes.includes(e.nodeName)) {
      const id = 'h' + count++;
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
  for (let i = 0; i < titles.length; i++) {
    let title = titles[i];
    let template = `<li><a href='#${title.id}'>${title.text}</a></li>`;
    toc.insertAdjacentHTML('beforeend', template);
  }
  if (titles.length === 0) {
    let tocContainer = document.getElementById('toc-container');
    if (tocContainer) {
      tocContainer.style.display = 'none';
    }
  }
}

async function submitArticlePassword(postId, passwordInputId, labelId, anchorId) {
  let password = document.getElementById(passwordInputId).value;
  if (!password) return;
  let res = await fetch(`/api/page/render/${postId}?password=${password}`);
  let data = await res.json();
  if (data.status) {
    document.getElementById(anchorId).style.display = 'none';
    document.getElementById(anchorId).insertAdjacentHTML('beforebegin', data.content);
    generateTOC();
  } else {
    document.getElementById(labelId).innerText = "密码错误，请重试！";
    document.getElementById(passwordInputId).value = '';
  }
}
