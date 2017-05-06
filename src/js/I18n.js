/*
 *  Copyright (C) 2017 leonardosnt
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License along
 *  with this program; if not, write to the Free Software Foundation, Inc.,
 *  51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
*/

export default class I18n {
  constructor(translations, language) {
    this.translations = translations;
    this.language = language;
  }

  /**
   * Set the current language.
   * 
   * @param {string} newLanguage
   * @throws {Error} If given language isn't present in translations.
   */
  setLanguage(newLanguage) {
    if (this.translations[newLanguage] == undefined) {
      throw Error(`language ${newLanguage} not found in the available translations.`);
    }
    this.language = newLanguage;
  }

  /**
   * Update DOM elements that is using data-i18n-* attributes.
   * 
   * @param {Document?} parentElement = Element that this will start from.
   */
  updateDOM(parentElement = document) {
    parentElement.querySelectorAll('[data-i18n-text').forEach(element => {
      const translationKey = element.getAttribute('data-i18n-text');
      const translation = this.translate(translationKey);

      if (translation != undefined) {
        element.innerText = translation;
      }
    });
  }

  /**
   * Get translated text corresponding to the given key.
   * 
   * @param {string} key 
   * @returns {string} Translated text corresponding to the given key.
   */
  translate(key) {
    const numArgs = arguments.length;
    const text = this.translations[this.language][key];

    if (text == undefined) {
      return `I18n: No translation present for key: ${key}`;
    }
    
    // Format
    if (numArgs > 1) {
      // Copy arguments
      // https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#3-managing-arguments
      const args = new Array(numArgs - 1);

      for(let i = 1; i < numArgs; ++i) {
          args[i - 1] = arguments[i];
      }

      return text.replace(/\{(\d+)\}/g, (match, arg1) => args[arg1] || match);
    }

    return text;
  }
}