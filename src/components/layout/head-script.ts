export const THEME_KEY = "nordair-theme";
export const INTRO_KEY = "nordair-intro-seen";

/**
 * Runs synchronously in <head> before first paint:
 *  - applies the saved (or system) theme so there is no flash,
 *  - decides whether the page-load intro should play (once per session, never for reduced motion).
 */
export const headScript = `(function(){var d=document.documentElement;try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}d.setAttribute("data-theme",t)}catch(e){}try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches&&!sessionStorage.getItem("${INTRO_KEY}")){d.setAttribute("data-intro","play");sessionStorage.setItem("${INTRO_KEY}","1")}}catch(e){}})();`;
