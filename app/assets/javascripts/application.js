//
// For guidance on how to add JavaScript see:
// https://prototype-kit.service.gov.uk/docs/adding-css-javascript-and-images
//
const protectedRoutes = [
  '/register',
  '/login',
  '/logout',
];

window.GOVUKPrototypeKit.documentReady(() => {
  const menuItems = document.querySelectorAll('.ds_site-navigation__link');
  const currentPath = window.location.pathname;

  const protectedContainer = document.createElement('div');
  protectedContainer.classList.add('protected-links-container');
  const publicContainer = document.createElement('div');
  publicContainer.classList.add('public-links-container');

  menuItems.forEach(item => {
    const itemPath = item.getAttribute('href');
    const parentLi = item.closest('li');
    if (!parentLi) return;

    const isCurrent = itemPath === currentPath;
    item.classList.toggle('ds_current', isCurrent);

    if (isCurrent) {
      item.setAttribute('aria-current', 'page');
    } else {
      item.removeAttribute('aria-current');
    }

    const isProtected = protectedRoutes.includes(itemPath);
    const container = isProtected ? protectedContainer : publicContainer;

    item.classList.toggle('protected', isProtected);
    const exists = container.querySelector(`a[href="${itemPath}"]`);

    if (!exists) {
      container.appendChild(parentLi);
    }
  });

  const navLists = document.querySelectorAll('.ds_site-navigation__list');
  navLists.forEach(nav => {
    if (!nav.querySelector('.public-links-container') && publicContainer.children.length > 0) {
      nav.appendChild(publicContainer);
    }
    if (!nav.querySelector('.protected-links-container') && protectedContainer.children.length > 0) {
      nav.appendChild(protectedContainer);
    }
  });

  const clearFiltersButton = document.getElementById('clear-filters');
  const filtersForm = document.getElementById('filters');

    if (clearFiltersButton && filtersForm) {
      clearFiltersButton.addEventListener('click', () => {
        let existingInput = filtersForm.querySelector('input[name="clearFilters"]');

        if (!existingInput) {
          const clearFilterInput = document.createElement('input');
          clearFilterInput.type = 'hidden';
          clearFilterInput.name = 'clearFilters';
          clearFilterInput.value = true;
          filtersForm.appendChild(clearFilterInput);
        }
      filtersForm.submit();
    });
  }
});
