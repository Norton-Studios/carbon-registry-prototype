//
// For guidance on how to add JavaScript see:
// https://prototype-kit.service.gov.uk/docs/adding-css-javascript-and-images
//

window.GOVUKPrototypeKit.documentReady(() => {
  const menuItems = document.querySelectorAll('.ds_site-navigation__link');
  const currentPath = window.location.pathname;

  menuItems.forEach(item => {
    const itemPath = item.getAttribute('href');

    if (itemPath === currentPath) {
      item.classList.add('ds_current');
      item.setAttribute('aria-current', 'page');
    } else {
      item.classList.remove('ds_current');
      item.removeAttribute('aria-current');
    }
  });
});