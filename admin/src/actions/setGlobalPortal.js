export const setGlobalPortal = (open, color, header, body) => {
  let pl = { open };
  if (color) {
    pl = { ...pl, color };
  }
  if (header) {
    pl = { ...pl, header };
  }
  if (body) {
    pl = { ...pl, body };
  }
  return {
    type: 'SET_PORTAL',
    payload: pl
  };
};
