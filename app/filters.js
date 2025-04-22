//
// For guidance on how to create filters see:
// https://prototype-kit.service.gov.uk/docs/filters
//

const govukPrototypeKit = require('govuk-prototype-kit');

const addFilter = govukPrototypeKit.views.addFilter;

// Add your filters here
addFilter('customSelectAttr', function (array, key, value) {
  if (!Array.isArray(array)) return [];
  if (Array.isArray(value)) {
    return array.filter(item => value.includes(item[key]))
  }
  if (typeof value === "string") {
    return array.filter(item =>
      typeof item[key] === "string" && item[key].toLowerCase() === value.toLowerCase()
    );
  }
  return array.filter(item => item[key] === value);
})
addFilter('merge', function (a, b) {
  if (!Array.isArray(a)) a = [];
  if (!Array.isArray(b)) b = [];
  return a.concat(b);
});

addFilter('sortByDateDesc', function(arr) {
  return arr.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
});

addFilter('sortByDateAsc', function(arr) {
  return arr.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
});

addFilter('searchString', function (string, search) {
  const normalize = (str) => str.toLowerCase().replace(/\s+/g, '');
  return normalize(string).includes(normalize(search));
});

addFilter('mapToOptions', function (arr, key) {
  return arr.map(i => ({ label: i[key], value: i[key]}));
});

addFilter('reverseDate', function (dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';

  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const [year, month, day] = parts;
  return `${day}-${month}-${year}`;
});

addFilter('slugify', function (string) {
  return string
    .toString()
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1-$2')        // camelCase to kebab-case
    .replace(/[\s_]+/g, '-')                     // spaces and underscores to dash
    .replace(/[^a-zA-Z0-9\-]/g, '')              // remove all non-alphanumeric except dashes
    .replace(/\-{2,}/g, '-')                     // collapse multiple dashes
    .replace(/^-+|-+$/g, '')                     // trim starting/ending dashes
    .toLowerCase();
});

addFilter('urldecode', function(str) {
  return str
  .replace(/%20/g, ' ')
  .replace(/%3A/g, ':')
  .replace(/%2F/g, '/')
  .replace(/%3F/g, '?')
  .replace(/%3D/g, '=')
  .replace(/%26/g, '&')
  .replace(/%3C/g, '<')
  .replace(/%3E/g, '>')
  .replace(/%22/g, '"')
  .replace(/%23/g, '#')
  .replace(/%25/g, '%')
  .replace(/%28/g, '(')
  .replace(/%29/g, ')');
})