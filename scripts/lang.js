function getUserLanguage() {
  const savedLang = localStorage.getItem('lang');
  if (savedLang) return savedLang;

  const userLanguages = navigator.languages || [navigator.language || navigator.userLanguage];

  const isFrenchUser = userLanguages.some(lang => {
    const langCode = lang.split('-')[0].toLowerCase();
    return langCode === 'fr';
  });

  return isFrenchUser ? 'fr' : 'en';
}

function getLocalizedPath(path) {
  const userLang = getUserLanguage();
  return userLang === 'fr' ? path : `/${userLang}${path}`;
}

function goToLocalizedPage(page) {
  const localizedPath = getLocalizedPath(page);
  if (window.location.pathname !== localizedPath)
    window.location.replace(localizedPath);
}

export { getUserLanguage, getLocalizedPath, goToLocalizedPage };