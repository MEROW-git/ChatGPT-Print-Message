(function () {
  'use strict';

  const printButton = document.getElementById('printButton');
  if (!printButton) return;

  printButton.addEventListener('click', () => {
    window.print();
  });

  window.addEventListener('load', () => {
    printButton.focus();
  });
})();
