function titleToLink(title) {
  return title.trim().replace(/\s/g, '-');
}

function getFormattedDate() {
  const date = new Date();
  return (
    date.getFullYear() +
    '-' +
    (date.getMonth() + 1) +
    '-' +
    date.getDate() +
    ' ' +
    date.getHours() +
    ':' +
    date.getMinutes() +
    ':' +
    date.getSeconds()
  );
}

module.exports = {
  titleToLink: titleToLink,
  getFormattedDate: getFormattedDate
};
