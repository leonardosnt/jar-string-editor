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

const compile = text => {
  const parts = [];
  const vars = [];
  let pos = -1;
  let lastSubstring = 0;

  while (pos++ < text.length) {
    // Check start var
    if (isOpenVarAt(text, pos)) {
      let varNameStart = pos + 2; // Skip {{
      let varNameEnd = varNameStart;

      for (let auxPos = pos + 2; auxPos < text.length; auxPos++) {
        if (isOpenVarAt(text, auxPos)) {
          console.warn(
            `possible unterminated varname at '${text.substring(
              0,
              varNameStart
            )}'`
          );
          break;
        }

        // Check var end
        if (isCloseVarAt(text, auxPos)) {
          varNameEnd = auxPos;
          break;
        }
      }

      if (varNameEnd - varNameStart > 0) {
        const varName = text.substring(varNameStart, varNameEnd);

        // include the text before the variable
        parts.push(text.substring(lastSubstring, varNameStart - 2));
        // include the variable
        parts.push({ varName });

        lastSubstring = varNameEnd + 2;

        vars.push(varName);
      }
    }
  }
  // cut the rest
  parts.push(text.substring(lastSubstring, text.length));

  // If there's no vars, we don't need to create a function
  if (vars.length === 0) {
    return text;
  }

  /**
   * Convert parts to array values (valid js objects)
   * E.g
   *  ['Hello, ', {varName: 'name'}] ==> ['Hello, ', vars['name']]
   */
  const arrayValues = parts
    .map(part => {
      if (part.varName) {
        return `vars['${part.varName}']`;
      }
      return `'${part}'`;
    })
    .join(', ');

  // Generate if(vars[varName] == undefined) vars[varName] = '{{varName}}';
  const genSanitize = () =>
    vars
      .map(
        varName =>
          `if (vars['${varName}'] == undefined) vars['${varName}'] = '{{${varName}}}';`
      )
      .join('\n  ');

  /* eslint-disable no-new-func */
  return new Function(
    'vars',
    `
    vars = vars || {};

    ${genSanitize()}

    return [${arrayValues}];
  `
  );
};

const isOpenVarAt = (text, pos) =>
  text.charAt(pos) === '{' && text.charAt(pos + 1) === '{';

const isCloseVarAt = (text, pos) =>
  text.charAt(pos) === '}' && text.charAt(pos + 1) === '}';

export { compile };
