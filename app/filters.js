//
// For guidance on how to create filters see:
// https://prototype-kit.service.gov.uk/docs/filters
//

const govukPrototypeKit = require('govuk-prototype-kit')
const addFilter = govukPrototypeKit.views.addFilter

// Add your filters here
addFilter('customSelectAttr', function (array, key, value) {
  if (!Array.isArray(array)) return [];
  if (Array.isArray(value)) {
    return array.filter(item => value.includes(item[key]))
  }
  return array.filter(item => item[key] === value);
})
addFilter('merge', function (a, b) {
  if (!Array.isArray(a)) a = [];
  if (!Array.isArray(b)) b = [];
  return a.concat(b);
});