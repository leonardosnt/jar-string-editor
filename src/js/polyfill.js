if (NodeList.prototype.forEach === undefined) {
  NodeList.prototype.forEach = Array.prototype.forEach;
}

// localStorage isn't working on Microsoft Edge
try {
  localStorage;
} catch(ex) {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: function () {}, // noop
      setItem: function () {}, // noop
      clear: function () {}, // noop
      removeItem: function () {}, // noop
    }
  });
}