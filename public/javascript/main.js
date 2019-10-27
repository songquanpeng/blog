const UNCHECKED = 0;
const ACTIVATE = 1;
const DEACTIVATE = 2;
let articleListLoading = false;

function deleteArticle(id) {
  if (confirm('This article will be deleted soon')) {
    $.ajax({
      url: '/api/article/' + id,
      type: 'DELETE',
      success: function(result) {
        document.getElementById('article_' + id).style.display = 'none';
        //alert(result);
      }
    });
  }
}

function deleteUser(name) {
  if (confirm('This user will be deleted soon')) {
    $.ajax({
      url: '/api/user/' + name,
      type: 'DELETE',
      success: function(result) {
        document.getElementById('user_' + name).style.display = 'none';
        alert(result);
      },
      statusCode: {
        403: function() {
          document.location.reload();
        }
      }
    });
  }
}

function loadMessages() {
  $.get('/api/message', function(data) {
    const tableBody = $('#messageTable tbody');
    tableBody.empty();
    let result = '';
    data.forEach(function(item) {
      result += `<tr id='message_${item.id}'><td>${item.title}</td><td>${item.time}</td><td>${item.content}</td><td><button class='btn btn-sm btn-outline-warning' onclick="deactivateMessage(${item.id})">Make as read</button></td></tr>`;
    });
    tableBody.append(result);
  });
}

function deactivateMessage(id) {
  $.ajax({
    url: '/api/deactivateMessage/' + id,
    type: 'DELETE',
    success: function(result) {
      $('#message_' + id).remove();
    }
  });
}

function loadComments(articleId) {
  $.get('/api/comment/' + articleId, function(data) {
    const commentArea = $('#comment');
    let result = '';
    const isAdmin = data.isAdmin;
    data.comments.forEach(function(comment) {
      if (comment.state === DEACTIVATE) return;
      if (!isAdmin && comment.state !== ACTIVATE) return;
      let partA = `
          <div class="card shadow-box bg-transparent" style="margin-bottom: 16px">
            <div class="card-body">
                <p class="card-text">${comment.content}</p>
                <span class="badge badge-success badge-hover">${comment.author}</span> <span class="badge badge-secondary badge-hover">${comment.time}</span> `;
      let partB = '</div></div>';
      if (isAdmin) {
        if (comment.state === ACTIVATE) {
          partB =
            `<span class="badge badge-danger badge-hover" onclick="setCommentState(${comment.id}, DEACTIVATE)">Deactivate</span>` +
            partB;
        } else {
          partB =
            `<span class="badge badge-primary badge-hover" onclick="setCommentState(${comment.id}, ACTIVATE)">Active</span>` +
            partB;
        }
      }
      result += partA + partB;
    });
    commentArea.append(result);
  });
}

function postComment(articleId) {
  let author = $('#commentAuthor')
    .val()
    .trim();
  let content = $('#commentContent')
    .val()
    .trim();
  if (!author || !content) return;
  $.ajax({
    url: '/api/comment/',
    type: 'POST',
    data: {
      author: author,
      content: content,
      articleId: articleId
    },
    success: function() {
      location.reload();
    }
  });
}

function setCommentState(id, state) {
  $.ajax({
    url: '/api/setCommentState/',
    type: 'POST',
    data: {
      id: id,
      state: state
    },
    success: function() {
      location.reload();
    }
  });
}

function onTimeTagClicked(time) {
  const date = time.split(',')[0];
  window.location.href =
    '/date/' + date.split('/')[2] + '-' + date.split('/')[0];
}

function gotToTop() {
  $('body,html').animate(
    {
      scrollTop: 0
    },
    800
  );
  return false;
}

function loadMoreArticles() {
  articleListLoading = true;
  console.log('Loading...');
  setTimeout(() => {
    console.log('Load done.');
    articleListLoading = false;
  }, 1000);
}

function main() {
  $('[data-toggle="tooltip"]').tooltip();
  if ($('#articleList').length === 1) {
    $(window).scroll(function() {
      if (articleListLoading) return;
      let windowHeight = $(window).height();
      let documentHeight = $(document).height();
      let scrollDistance = $(window).scrollTop();
      if (scrollDistance >= documentHeight - windowHeight) {
        loadMoreArticles();
      }
    });
  }
}

$(document).ready(main);
