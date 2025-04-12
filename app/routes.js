//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit');
const router = govukPrototypeKit.requests.setupRouter();
const path = require('path');
const fs = require('fs');

function loadProjectsData() {
  const dataPath = path.join(__dirname, '/assets/data/projects.json');
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

router.get('/registry', (_, res) => {
  const projects = loadProjectsData();
  res.render('registry', { projects });
});

router.get('/projects/:name', (req, res) => {
  const projects = loadProjectsData();
  const projectName = req.params.name;

  const project = projects.find(
    p => p.name.toLowerCase().replace(/\s+/g, '-') === projectName.toLowerCase()
  );

  if (project) {
    res.render('projects/project-details', { project });
  } else {
    res.status(404).redirect('/error-page-not-found');
  }
});

router.get('/', (_, res) => {
  res.redirect('/registry');
});

module.exports = router;
// Add your routes here
