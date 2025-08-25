import { getLocalizedPath } from './lang.js';

class PageTransitions {
  constructor() {
    this.currentView = 'home';
    this.isTransitioning = false;
    
    this.init();
  }

  init() {
    // Intercept article link clicks
    this.setupLinkInterception();
    
    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      this.handlePopState(e);
    });

    // Set initial state
    if (window.location.pathname !== getLocalizedPath('/')) {
      this.currentView = 'article';
    }
  }

  setupLinkInterception() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="/articles/"]');
      if (link && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        this.navigateToPage(link.getAttribute('href'), 'article');
      }

      // Handle home link clicks in articles (more specific selector)
      const homeLink = e.target.closest('a.home-link[href="/"], a.home-link[href=""]');
      if (homeLink && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        this.navigateToPage(getLocalizedPath('/'), 'home');
      }
    });
  }

  async navigateToPage(path, view, pushState = true) {
    if (pushState) {
      if (this.isTransitioning) return;
      if (this.currentView === 'home' && view === 'home') return;
    }

    this.isTransitioning = true;

    try {
      if (pushState) history.pushState({ view, path }, '', path);

      await this.fadeOut();
      const pageData = await this.fetchPageContent(path);
      this.switchToView(pageData);
      await this.fadeIn();
      this.currentView = view;
    } catch (error) {
      console.error('Failed to navigate:', error);
      window.location.href = path;
    } finally {
      this.isTransitioning = false;
    }
  }

  async handlePopState(e) {
    if (this.isTransitioning) return;
    
    const path = window.location.pathname;
    
    if (path === '/') {
      if (this.currentView !== 'home') {
        await this.navigateToPage(getLocalizedPath('/'), 'home', false);
      }
    } else if (path.startsWith('/articles/')) {
      if (this.currentView !== 'article') {
        await this.navigateToPage(path, 'article', false);
      }
    }
  }

  async fetchPageContent(path) {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }
    
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const main = doc.querySelector('main');
    const title = doc.querySelector('title')?.textContent;
    const description = doc.querySelector('meta[name="description"]')?.content;
    
    if (!main) {
      throw new Error('No main content found in page');
    }
    
    return {
      mainContent: main.outerHTML,
      title,
      description
    };
  }

  switchToView(pageData) {
    // Update page metadata
    if (pageData.title) {
      document.title = pageData.title;
    }
    if (pageData.description) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.content = pageData.description;
    }
    
    // Replace main content
    const currentMain = document.querySelector('main');
    if (currentMain) {
      currentMain.outerHTML = pageData.mainContent;
    }
  }

  async fadeOut() {
    const elements = document.querySelectorAll('.page-fade');
    
    elements.forEach(element => {
      element.style.opacity = '0';
    });
    
    return new Promise(resolve => setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      resolve();
    }, 300));
  }

  async fadeIn() {
    const elements = document.querySelectorAll('.page-fade');
    
    elements.forEach(element => {
      element.style.opacity = '0';
    });
    
    // Animate in
    requestAnimationFrame(() => {
      elements.forEach(element => {
        element.style.opacity = '1';
      });
    });
    
    return new Promise(resolve => setTimeout(resolve, 300));
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PageTransitions();
});