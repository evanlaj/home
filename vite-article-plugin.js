import fs from 'fs-extra';
import path from 'path';
import { marked } from 'marked';
import matter from 'gray-matter';
import Prism from 'prismjs';

// Import additional languages for Prism
import 'prismjs/components/prism-javascript.js';
import 'prismjs/components/prism-css.js';
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-jsx.js';
import 'prismjs/components/prism-tsx.js';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-markdown.js';
import 'prismjs/components/prism-scss.js'

marked.setOptions({
  gfm: true,
  breaks: false
});

function calculateReadTime(text) {
  const plainText = text.replace(/<[^>]*>/g, '');
  
  const wordsPerMinute = 220;
  
  const words = plainText.trim().split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  
  const readingTimeMinutes = Math.ceil(wordCount / wordsPerMinute);
  
  return `${readingTimeMinutes} min de lecture`;
}

// Function to post-process HTML and add syntax highlighting
function addSyntaxHighlighting(html) {
  return html.replace(/<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g, (match, lang, code) => {
    if (Prism.languages[lang]) {
      try {
        // Decode HTML entities first
        const decodedCode = code
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        
        const highlighted = Prism.highlight(decodedCode, Prism.languages[lang], lang);
        return `<pre class="language-${lang}"><code class="language-${lang}">${highlighted}</code></pre>`;
      } catch (error) {
        console.warn(`Warning: Could not highlight ${lang} code block:`, error.message);
      }
    }
    return match;
  });
}

export function viteArticlePlugin(options = {}) {
  const {
    articlesDir = './articles',
    templatePath = './template.html'
  } = options;

  let articles = [];
  
  return {
    name: 'vite-article-plugin',
    
    async buildStart() {
      console.log('🚀 Processing articles...');
      
      try {
        // Check if articles directory exists
        if (!await fs.pathExists(articlesDir)) {
          console.log('⚠️  Articles directory not found, skipping article processing');
          return;
        }
        
        // Read template
        const template = await fs.readFile(templatePath, 'utf-8');
        
        // Get all markdown files from articles directory
        const files = await fs.readdir(articlesDir);
        const markdownFiles = files.filter(file => file.endsWith('.md'));
        
        if (markdownFiles.length === 0) {
          console.log('⚠️  No markdown files found in articles directory');
          return;
        }
        
        console.log(`📝 Found ${markdownFiles.length} article(s) to process`);
        
        // Reset articles array
        articles = [];
        
        // Process each markdown file
        for (const file of markdownFiles) {
          const filePath = path.join(articlesDir, file);
          const articleName = path.basename(file, '.md');
          
          console.log(`   Processing: ${file}`);
          
          // Read and parse markdown file
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const { data: frontmatter, content: markdownContent } = matter(fileContent);
          
          // Convert markdown to HTML
          const htmlContent = marked(markdownContent);
          
          // Add syntax highlighting
          const highlightedHtml = addSyntaxHighlighting(htmlContent);
          
          // Calculate reading time
          const readTime = calculateReadTime(markdownContent);
          
          // Create article HTML structure
          const articleHtml = `
        <div class="article-header">
          <h1 class="article-title">${frontmatter.title || articleName}</h1>
          <div class="article-meta">${frontmatter.date} · ${readTime}</div>
        </div>
        <article class="article-content">
          ${highlightedHtml}
        </article>
      `;
          
          // Replace content in template
          let finalHtml = template.replace('<!-- ARTICLE_CONTENT -->', articleHtml);
          
          // Update title to include article title
          const pageTitle = frontmatter.title ? `${frontmatter.title} - Evan Lajusticia` : 'Evan Lajusticia';
          finalHtml = finalHtml.replace('<title>Evan Lajusticia</title>', `<title>${pageTitle}</title>`);
          
          // Update meta description if available
          if (frontmatter.description) {
            finalHtml = finalHtml.replace(
              '<meta name="description" content="Evan Lajusticia - Portfolio - Développeur web créatif">',
              `<meta name="description" content="${frontmatter.description}">`
            );
            finalHtml = finalHtml.replace(
              '<meta property="og:description" content="Evan Lajusticia - Portfolio - Développeur web créatif">',
              `<meta property="og:description" content="${frontmatter.description}">`
            );
          }
          
          // Store article data for later use
          articles.push({
            name: articleName,
            content: finalHtml,
            frontmatter: frontmatter,
            readTime: readTime
          });
          
          console.log(`   ✅ Processed: ${articleName}.html`);
        }
        
        console.log(`🎉 Successfully processed ${markdownFiles.length} article(s)!`);
        
      } catch (error) {
        console.error('❌ Error processing articles:', error);
        throw error;
      }
    },
    
    async generateBundle(options, bundle) {
      // Find the CSS and JS assets in the bundle
      let cssAssetFileName = '';
      let articlesAssetFileName = '';
      let jsAssetFileName = '';
      
      for (const [fileName, asset] of Object.entries(bundle)) {
        if (fileName.includes('main') && fileName.endsWith('.css'))
          cssAssetFileName = fileName;
        if (fileName.includes('articles') && fileName.endsWith('.css'))
          articlesAssetFileName = fileName;
        if (fileName.includes('main') && fileName.endsWith('.js'))  // Changed from 'app' to 'main'
          jsAssetFileName = fileName;
      }
      
      // Add articles as assets to the bundle
      try {
        for (const article of articles) {
          let content = article.content;
          
          if (cssAssetFileName)
            content = content.replace(/href="\/main\.css"/g, `href="../${cssAssetFileName}"`);
          
          if (articlesAssetFileName)
            content = content.replace(/href="\/articles\.css"/g, `href="../${articlesAssetFileName}"`);
          
          if (jsAssetFileName)
            content = content.replace(/src="\/app\.js"/g, `src="../${jsAssetFileName}"`);  // This will replace the app.js reference with main.js
          
          // Emit each article as an asset
          this.emitFile({
            type: 'asset',
            fileName: `articles/${article.name}.html`,
            source: content
          });
        }
        
        // Generate and emit article index
        const articlesIndex = articles.map(article => ({
          slug: article.name,
          title: article.frontmatter.title || article.name,
          description: article.frontmatter.description || '',
          date: article.frontmatter.date || '',
          readTime: article.readTime,
          url: `/articles/${article.name}`,
          tags: article.frontmatter.tags || []
        })).sort((a, b) => new Date(b.date) - new Date(a.date));
        
        this.emitFile({
          type: 'asset',
          fileName: 'articles/index.json',
          source: JSON.stringify(articlesIndex, null, 2)
        });
        
        console.log('📄 Article index generated');
        
      } catch (error) {
        console.warn('Warning: Could not add articles to bundle:', error.message);
      }
    }
  };
}