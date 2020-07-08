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

const DEFAULT_SETTINGS = {
  hideEmptyStrings: true,
  sortByContext: true,
  debounceRate: 30,
};

// Load from localStorage
function load() {
  // Safe load from localStorage.
  let settings;
  try {
    settings = JSON.parse(localStorage.getItem("jse-settings"));
  } catch (e) {
    console.error(e);
  }

  // We only copy defaults if settings was sucessfully loaded, otherwise
  // it will already return the DEFAULT_SETTINGS
  if (settings) {
    copyDefaults(DEFAULT_SETTINGS, settings);
  }

  return settings || DEFAULT_SETTINGS;
}

function copyDefaults(from, to) {
  for (const key in from) {
    if (from[key] !== null && typeof from[key] === "object") {
      copyDefaults(from[key], to[key] || (to[key] = {}));
      continue;
    }
    if (!to.hasOwnProperty(key) || to[key] === null) {
      to[key] = from[key];
    }
  }
}

// Save to localStorage
function save() {
  observers.forEach(callback => callback(oldSettings));
  oldSettings = { ...settings };
  localStorage.setItem("jse-settings", JSON.stringify(this));
}

// Simple way to observe when settings are saved
function observe(listener) {
  observers.push(listener);
}

const observers = [];
const settings = load();

settings.save = save.bind(settings);
settings.observe = observe.bind(settings);

// Used in observers
let oldSettings = { ...settings };

export default settings;
