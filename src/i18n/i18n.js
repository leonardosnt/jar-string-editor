/*
 *  Copyright (C) 2017-2020 leonardosnt (leonrdsnt@gmail.com)
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

import { flatten } from "flat";
import { compile } from "./string-template";
import settings from "../settings";

// Get default language based on navigator.language
const getDefaultLanguage = () => {
  if (navigator.language.startsWith("pt-")) {
    return "pt-BR";
  }
  return "en-US";
};

export const getCurrentLanguage = () =>
  settings.language || getDefaultLanguage();

export const languages = {
  "en-US": require("./langs/en.json"),
  "pt-BR": require("./langs/pt-BR.json"),
};

/**
 * @param {String} key
 * @param {*} props
 * @returns {String | Any[]}
 */
export const translate = (key, props) => {
  const lang =
    languages[getCurrentLanguage()] || languages[getDefaultLanguage()];
  const value = lang[key];

  if (value === undefined) {
    console.error(
      `i18n: missing key "${key}" in language "${getCurrentLanguage()}"`
    );
    return `i18n: missing key ${key}`;
  }

  // It is a compiled string template
  if (typeof value === "function") {
    return value(props);
  }

  return value;
};

// Flatten lang objects
for (const key in languages) {
  languages[key] = flatten(languages[key]);
}

// Compile string templates
for (const lang in languages) {
  for (const key in languages[lang]) {
    languages[lang][key] = compile(languages[lang][key]);
  }
}

// Warns if a key exists in a language but not in another
if (process.env.NODE_ENV === "development") {
  const visitedKeys = {};
  const allLangs = [];

  for (const lang in languages) {
    for (const key in languages[lang]) {
      if (!visitedKeys[key]) {
        visitedKeys[key] = new Set();
      }

      visitedKeys[key].add(lang);
    }
    allLangs.push(lang);
  }

  for (const key in visitedKeys) {
    const langsVisited = visitedKeys[key];
    const notVisited = allLangs.filter(lang => !langsVisited.has(lang));

    if (langsVisited.size !== allLangs.length) {
      console.warn(
        `I18n: the key "${key}" exists in: [${Array.from(langsVisited).join(
          ", "
        )}], but not in: [${notVisited}]`
      );
    }
  }
}
