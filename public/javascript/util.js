function isDesktop() {
  const screenWidth = document.body.clientWidth;
  return screenWidth >= 1000;
}

function showToast(title, message) {
  let date = new Date();
  $('#toastTitle').text(title);
  $('#toastTime').text(date.toLocaleTimeString());
  $('#toastContent').text(message);
  $('#toast').toast('show');
}
