/*
 *  Copyright (C) 2017-2018 leonardosnt (leonrdsnt@gmail.com)
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

/**
 * @param {string} haystack
 * @param {string} needle
 */
export function stringContains(haystack, needle) {
  let hay_pos = 0;
  let need_pos = 0;
  let eq_count = 0;

  while (hay_pos < haystack.length) {
    const hay_cur_char = haystack.charCodeAt(hay_pos++),
      needle_cur_char = needle.charCodeAt(need_pos++);

    // Ignore case
    const case_diff =
      hay_cur_char >= 97 && hay_cur_char <= 122
        ? -32
        : hay_cur_char >= 65 && hay_cur_char <= 90 ? 32 : 0;

    if (
      hay_cur_char === needle_cur_char ||
      hay_cur_char + case_diff === needle_cur_char
    ) {
      eq_count++;
    } else {
      need_pos = 0;
      eq_count = 0;
    }
    if (eq_count === needle.length) {
      return true;
    }
  }

  return false;
}
