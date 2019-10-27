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

function showWelcome() {
  if (isDesktop()) {
    let loadTime = (Math.round(performance.now() * 100) / 100000).toFixed(2);
    showToast('System', `Welcome, my friend! Page loaded in ${loadTime} s.`);
  }
}
