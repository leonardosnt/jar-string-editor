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

/**
 * @param {String} descriptor - The descriptor
 * @return {{ type: String, value: String }} - The parsed descriptor
 */
export function parseFieldType(descriptor) {
  let ch = descriptor[0];
  let value;
  let idx = 1;

  switch (ch) {
    case 'B':
      value = 'byte';
      break;
    case 'C':
      value = 'char';
      break;
    case 'D':
      value = 'double';
      break;
    case 'F':
      value = 'float';
      break;
    case 'I':
      value = 'int';
      break;
    case 'J':
      value = 'long';
      break;
    case 'S':
      value = 'short';
      break;
    case 'Z':
      value = 'boolean';
      break;

    case 'L': {
      value = '';
      // eslint-disable-next-line
      while ((ch = descriptor[idx++]) !== ';') value += ch === '/' ? '.' : ch;
      return { type: 'class', value: value };
    }

    case '[': {
      let dimensions = 1;

      while (descriptor[idx++] === '[') dimensions++;

      let arrayType = parseFieldType(descriptor.substring(idx - 1));

      return {
        type: 'array',
        dimensions,
        arrayType,
        value: arrayType.value + '[]'.repeat(dimensions),
      };
    }

    default:
      throw new Error(`Invalid descriptor. ch=${ch}, descriptor=${descriptor}`);
  }

  return { type: 'primitive', value };
}

function sizeOfType(fieldType) {
  switch (fieldType.type) {
    case 'primitive':
      return 1;
    case 'class':
      return 2 + fieldType.value.length;
    case 'array':
      return 1 * fieldType.dimensions + sizeOfType(fieldType.arrayType);
    default:
      throw new Error(`Unexpected type: ${fieldType}`);
  }
}

/**
 * @param {String} descriptor
 * @returns {{ parameters: { type: String, value: String }[], returnType: { type: String, value: String } }}
 */
export function parseMethodDescriptor(descriptor) {
  const parameters = [];
  let idx = 1;
  let ch = descriptor[idx];

  while (ch !== undefined && ch !== ')') {
    let fieldType = parseFieldType(descriptor.substring(idx));
    idx += sizeOfType(fieldType);
    ch = descriptor[idx];
    parameters.push(fieldType);
  }

  const returnType = descriptor.substring(++idx);
  return {
    parameters,
    returnType:
      returnType === 'V'
        ? { type: 'void', value: 'void' }
        : parseFieldType(returnType),
  };
}
