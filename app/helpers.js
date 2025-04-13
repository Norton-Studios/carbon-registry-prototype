function generateFilters(projects) {
  return {
    Status: [...new Set(projects.map(project => project.status))],
    Type: [...new Set(projects.map(project => project.projectType))],
    Category: [...new Set(projects.map(project => project.category))]
  };
}

function filterProjects(projects, sessionData) {
  return projects.filter(project => {
    let matchesSearch = true;
    let matchesFilters = true;
    const normalize = (str) => str.toLowerCase().replace(/\s+/g, '');

    Object.entries(sessionData).forEach(([key, val]) => {

      const projectName = normalize(project.name)

      if (key === 'search-string') {
        matchesSearch = projectName.includes(normalize(val));
      } else {
        matchesFilters = val.includes(project[key])
      }
    });

    return matchesSearch && matchesFilters;
  });
}

module.exports = {
  generateFilters,
  filterProjects
};