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

/**
 * Parse a field descriptor
 *
 * @see https://docs.oracle.com/javase/specs/jvms/se9/html/jvms-4.html#jvms-4.3.2
 * @param {String} descriptor - The descriptor
 * @return {{ type: String, value: String }} - The parsed descriptor
 */
export function parseFieldType(descriptor) {
  let [char] = descriptor;
  let charIndex = 1;

  if (char === "L") {
    const classNameEnd = descriptor.indexOf(";", charIndex);
    return {
      type: "class",
      value: descriptor.substring(charIndex, classNameEnd),
    };
  }

  // ArrayType
  if (char === "[") {
    let dimensions = 1;

    while (descriptor[charIndex++] === "[") {
      dimensions++;
    }

    const arrayType = parseFieldType(descriptor.substring(charIndex - 1));

    return {
      type: "array",
      dimensions,
      arrayType,
      value: arrayType.value + "[]".repeat(dimensions),
    };
  }

  // BaseType
  let value;

  switch (char) {
    case "B":
      value = "byte";
      break;
    case "C":
      value = "char";
      break;
    case "D":
      value = "double";
      break;
    case "F":
      value = "float";
      break;
    case "I":
      value = "int";
      break;
    case "J":
      value = "long";
      break;
    case "S":
      value = "short";
      break;
    case "Z":
      value = "boolean";
      break;

    default:
      throw new Error(
        `Invalid descriptor. ch=${char}, descriptor=${descriptor}`
      );
  }

  return { type: "primitive", value };
}

/**
 * Return the size of a fieldType
 * @param {*} fieldType
 * @see parseFieldType(descriptor)
 * @return {Number}
 */
function sizeOfType(fieldType) {
  switch (fieldType.type) {
    case "primitive":
      return 1;
    case "class":
      return 2 + fieldType.value.length;
    case "array":
      return 1 * fieldType.dimensions + sizeOfType(fieldType.arrayType);
    default:
      throw new Error(`Unexpected type: ${fieldType}`);
  }
}

/**
 * Parse a method descriptor
 *
 * @see https://docs.oracle.com/javase/specs/jvms/se9/html/jvms-4.html#jvms-4.3.3
 * @param {String} descriptor
 * @returns {{ parameters: { type: String, value: String }[], returnType: { type: String, value: String } }}
 */
export function parseMethodDescriptor(descriptor) {
  const parameters = [];
  let charIndex = 1; // Ignore (
  let char = descriptor[charIndex];

  while (char !== undefined && char !== ")") {
    const fieldType = parseFieldType(descriptor.substring(charIndex));
    charIndex += sizeOfType(fieldType);
    char = descriptor[charIndex];
    parameters.push(fieldType);
  }

  const returnType = descriptor.substring(++charIndex);
  return {
    parameters,
    returnType:
      returnType === "V"
        ? { type: "void", value: "void" }
        : parseFieldType(returnType),
  };
}
