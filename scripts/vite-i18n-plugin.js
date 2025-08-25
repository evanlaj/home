import fs from 'fs'
import path from 'path'

function replaceTranslations(html, translations, lang) {
  let result = html

  result = result.replace(/lang="fr"/, `lang="${lang}"`)

  // Helper function to get nested value from object
  function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj)
  }

  // Replace data-i18n attributes (text content)
  const dataI18nRegex = /(<(\w+)[^>]*data-i18n="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g
  
  result = result.replace(dataI18nRegex, (match, openTag, tagName, key, content, closeTag) => {
    const translation = getNestedValue(translations, key)
    if (translation) {
      return `${openTag}${translation}${closeTag}`
    }
    return match
  })

  // Replace data-i18n-content attributes (for meta tags)
  result = result.replace(/(<[^>]*)(content=")([^"]*)("[^>]*data-i18n-content="([^"]+)"[^>]*>)/g, (match, beforeContent, contentStart, originalContent, afterContent, key) => {
    const translation = getNestedValue(translations, key)
    if (translation) {
      return `${beforeContent}${contentStart}${translation}${afterContent}`
    }
    return match
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
    }
  }
}