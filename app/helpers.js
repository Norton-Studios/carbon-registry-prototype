function generateFilters(projects) {
  return {
    Status: [...new Set(projects.map(project => project.status))],
    Type: [...new Set(projects.map(project => project.projectType))],
    Category: [...new Set(projects.map(project => project.category))]
  };
}

function filterProjects(projects, sessionData) {
  const data = {
    'search-string': sessionData['search-string'] || '',
    status: sessionData.status || [],
    projectType: sessionData.projectType || [],
    category: sessionData.category || []
  }

  return projects.filter(project => {
    let matchesSearch = true;
    let matchesFilters = true;
    const normalize = (str) => str.toLowerCase().replace(/\s+/g, '');

    Object.entries(data).forEach(([key, val]) => {

      const projectName = normalize(project.name)

      if (key === 'search-string') {
        matchesSearch = projectName.includes(normalize(val));
      } else if (Array.isArray(val) && val.length > 0) {
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
