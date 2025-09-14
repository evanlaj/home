import fs from 'fs'
import path from 'path'

function replaceTranslations(html, translations, lang, baseUrl = 'https://evanlajusticia.com') {
  let result = html

  result = result.replace(/lang="fr"/, `lang="${lang}"`)

  function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj)
  }

  // Add canonical URL and hreflang links before </head>
  const headEndRegex = /<\/head>/
  if (headEndRegex.test(result)) {
    const currentUrl = lang === 'fr' ? baseUrl : `${baseUrl}/${lang}`
    const frenchUrl = baseUrl
    const englishUrl = `${baseUrl}/en`
    
    const seoLinks = `
  <!-- Canonical URL -->
  <link rel="canonical" href="${currentUrl}/" />
  
  <!-- Hreflang links for multilingual SEO -->
  <link rel="alternate" hreflang="fr" href="${frenchUrl}/" />
  <link rel="alternate" hreflang="en" href="${englishUrl}/" />
  <link rel="alternate" hreflang="x-default" href="${englishUrl}/" />
</head>`

    result = result.replace(headEndRegex, seoLinks)
  }

  // Replace data-i18n attributes (text content)
  const dataI18nRegex = /(<(\w+)[^>]*data-i18n="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g
  
  result = result.replace(dataI18nRegex, (match, openTag, tagName, key, content, closeTag) => {
    const translation = getNestedValue(translations, key)
    if (!translation) return match

    return `${openTag}${translation}${closeTag}`
  })

  // Replace data-i18n-content attributes (for meta tags)
  result = result.replace(/(<[^>]*)(content=")([^"]*)("[^>]*data-i18n-content="([^"]+)"[^>]*>)/g, (match, beforeContent, contentStart, originalContent, afterContent, key) => {    
    const translation = getNestedValue(translations, key)
    if (!translation) return match

    return `${beforeContent}${contentStart}${translation}${afterContent}`
  })

  // Replace data-i18n-aria attributes (for aria-labels & titles)
  result = result.replace(/<(?:[^>]*)(?:data-i18n-aria=\"([^\"]*)\")(?:[^>]*)>/gm, (match, key) => {    
    const translation = getNestedValue(translations, key)

    if (!translation) return match

    let updatedTag = match
      .replace(/aria-label="[^"]*"/, '')
      .replace(/title="[^"]*"/, '')
      .replace(/data-i18n-aria="[^"]*"/, '')
      .replace(/<(\w+)/, `<$1 aria-label="${translation}" title="${translation}"`)

    return updatedTag
  })

  return result
}

export function viteI18nPlugin() {
  return {
    name: 'vite-i18n-plugin',
    enforce: 'post', // Run after other plugins
    generateBundle(options, bundle) {
      // Get the main HTML file from the bundle (should be index.html)
      const htmlFile = Object.keys(bundle).find(key => 
        key === 'index.html' || key.endsWith('/index.html')
      )
      
      if (!htmlFile) {
        console.warn('No index.html found in bundle for i18n processing')
        return
      }

      const htmlContent = bundle[htmlFile].source
      
      // Read all localization files
      const localizationDir = path.resolve(process.cwd(), 'localization')
      
      if (!fs.existsSync(localizationDir)) {
        console.warn('Localization directory not found:', localizationDir)
        return
      }
      
      const localizationFiles = fs.readdirSync(localizationDir)
        .filter(file => file.endsWith('.json'))

      // Generate HTML for each language
      localizationFiles.forEach(file => {
        const lang = path.basename(file, '.json')
        
        const translationsPath = path.join(localizationDir, file)
        const translations = JSON.parse(fs.readFileSync(translationsPath, 'utf-8'))

        // Replace translations in HTML
        const localizedHtml = replaceTranslations(htmlContent, translations, lang)

        // Create the localized HTML file
        const fileName = `${lang}/index.html`
        
        this.emitFile({
          type: 'asset',
          fileName: fileName,
          source: localizedHtml
        })
      })

      // Add SEO links to the original index.html (fr)
      const frenchWithSeo = replaceTranslations(htmlContent, {}, 'fr')
      bundle[htmlFile].source = frenchWithSeo
    }
  }
}