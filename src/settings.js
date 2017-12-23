/*
 *  Copyright (C) 2017 leonardosnt (leonrdsnt@gmail)
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
};

/** Load from localStorage */
function load() {
  // Safe load from localStorage.
  let settings;
  try {
    settings = JSON.parse(localStorage.getItem('jse-settings'));
  } catch (e) {
    console.error(e);
  }
  return settings || DEFAULT_SETTINGS;
}

/** Save to localStorage */
function save() {
  localStorage.setItem('jse-settings', JSON.stringify(this));

  observers.forEach(callback => callback());
}

/** Simple way to observe when settings is saved */
function observe(listener) {
  observers.push(listener);
}

const observers = [];
const settings = load();

settings.save = save.bind(settings);
settings.observe = observe.bind(settings);

export default settings;
