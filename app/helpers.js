function generateFilters(projects) {
  return {
    Country: [...new Set(projects.map(project => project.country).sort((a, b) => a.localeCompare(b)))],
    Status: [...new Set(projects.map(project => String(project.status)).sort((a, b) => a - b))],
    Type: [...new Set(projects.map(project => project.type).sort((a, b) => a.localeCompare(b)))],
    Category: [...new Set(projects.map(project => project.category).sort((a, b) => a.localeCompare(b)))],
    "Account Name": [...new Set(projects.map(project => project.account_name).sort((a, b) => a.localeCompare(b)))],
    Credits: projects.some(project => project.credits) ? ["Available"] : []
  };
}

function getProject(projects, projectName) {
  return projects.find(project => project.name.toLowerCase().replace(/\s+/g, '-') === projectName.toLowerCase());
}

function filterProjects(projects, sessionData) {
  const data = sessionData.filterKeys.reduce((acc, key) => ({
    ...acc,
    [key]: key === 'searchString' ? (sessionData[key] || '') : (sessionData[key] || [])
  }), {});

  return projects.filter(project => {
    let matchesSearch = true;
    let matchesFilters = true;
    const normalize = (str) => str.toLowerCase().replace(/\s+/g, '');

    Object.entries(data).forEach(([key, val]) => {
      if (key === 'searchString' && sessionData.searchBy) {
        matchesSearch = normalize(String(project[sessionData.searchBy])).includes(normalize(val));
      } else if (key === 'credits' && Array.isArray(val) && val.length > 0) {
        matchesFilters = Boolean(project.credits);
      } else if (Array.isArray(val) && val.length > 0) {
        matchesFilters = val.includes(String(project[key] ?? ''))
      }
    });

    return matchesSearch && matchesFilters;
  });
}

module.exports = {
  generateFilters,
  filterProjects,
  getProject
};
