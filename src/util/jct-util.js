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

import { utf8ByteArrayToString } from 'utf8-string-bytes';
import { parseMethodDescriptor } from './descriptor-parser';

/**
 * Get an attribute by name.
 *
 * @param {ClassFile} classFile - The class file
 * @param {any} source - Object you want get attribute from
 * @param {string} attributeName - Attribute name
 * @returns {any} - The attribute
 */
export function getAttribute(classFile, source, attributeName) {
  const { attributes } = source;

  if (attributes === undefined) {
    throw new Error('target does not have attributes');
  }

  return attributes.filter(attr => {
    const nameBytes = classFile.constant_pool[attr.attribute_name_index].bytes;
    return utf8ByteArrayToString(nameBytes) === attributeName;
  })[0];
}

/**
 * @param {*} classFile
 * @param {*} method
 * @param {*} instruction
 * @return {{ method: { name: String, descriptor: String }, className: String, lineNumber?: String }}
 */
export function getInstructionContext(classFile, method, instruction) {
  const className = extractClassName(
    classFile.this_class,
    classFile.constant_pool
  );
  const methodInfoConsts = extractMethodInfoConstants(
    method,
    classFile.constant_pool
  );
  let lineNumber;

  const codeAttr = getAttribute(classFile, method, 'Code');
  const lineNumberTable = getAttribute(classFile, codeAttr, 'LineNumberTable');
  const { bytecodeOffset } = instruction;

  if (lineNumberTable !== undefined) {
    for (var i = 0; i < lineNumberTable.line_number_table_length - 1; i++) {
      const { start_pc, line_number } = lineNumberTable.line_number_table[i];
      const end_pc = lineNumberTable.line_number_table[i + 1].start_pc;

      if (bytecodeOffset >= start_pc && bytecodeOffset <= end_pc) {
        lineNumber = line_number;
        break;
      }
    }
  }

  return {
    className,
    lineNumber,
    method: methodInfoConsts,
  };
}

/**
 * @param {{ name: String, descriptor: String}} method
 * @return {String}
 */
export function prettyMethodInfo({ name, descriptor }) {
  const parsedDescriptor = parseMethodDescriptor(descriptor);
  const params = parsedDescriptor.parameters
    .map(
      p =>
        p.value.replace(
          'java.lang.',
          ''
        ) /* remove java.lang package if present */
    )
    .join(', ');

  return `${parsedDescriptor.returnType.value} ${name}(${params})`;
}

export function extractClassName(index, constant_pool) {
  return getUtf8String(constant_pool, constant_pool[index].name_index);
}

export function extractMethodInfoConstants(methodInfo, constant_pool) {
  return {
    name: getUtf8String(constant_pool, methodInfo.name_index),
    descriptor: getUtf8String(constant_pool, methodInfo.descriptor_index),
  };
}

export function getUtf8String(constant_pool, index) {
  let poolEntry = constant_pool[index];

  if (poolEntry.tag === 8) {
    // CONSTANT_String_info
    poolEntry = constant_pool[poolEntry.string_index];
  } else if (poolEntry.tag !== 1) {
    // CONSTANT_Utf8_info
    throw new Error('constant_pool[index] does not represent a string.');
  }

  return utf8ByteArrayToString(poolEntry.bytes);
}
