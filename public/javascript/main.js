const UNCHECKED = 0;
const ACTIVATE = 1;
const DEACTIVATE = 2;

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

function postComment() {
  // TODO
  $.ajax({
    url: '/api/comment/',
    type: 'POST',
    data: {
      author: undefined,
      content: undefined
    },
    success: function(result) {
      // TODO
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
    success: function(result) {
      if (state === DEACTIVATE) {
        $('#comment_' + id).remove();
      }
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

function main() {
  $('[data-toggle="tooltip"]').tooltip();
}

$(document).ready(main);
