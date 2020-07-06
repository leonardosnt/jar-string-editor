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

import { utf8ByteArrayToString } from "utf8-string-bytes";
import { parseMethodDescriptor } from "./descriptor-parser";
import { Opcode } from "java-class-tools";

/**
 * Get an attribute by its name.
 *
 * @param {ClassFile} classFile - The class file
 * @param {any} source - Object you want get attribute from
 * @param {string} attributeName - Attribute name
 * @returns {any} - The attribute
 */
export function getAttribute(classFile, source, attributeName) {
  const { attributes } = source;

  if (attributes === undefined) {
    throw new Error("target does not have attributes");
  }

  return attributes.find(attr => {
    const nameBytes = classFile.constant_pool[attr.attribute_name_index].bytes;
    return utf8ByteArrayToString(nameBytes) === attributeName;
  });
}

export function getInstructionLineNumber(classFile, method, instruction) {
  let lineNumber = undefined;

  const codeAttr = getAttribute(classFile, method, "Code");
  const lineNumberTable = getAttribute(classFile, codeAttr, "LineNumberTable");
  const { bytecodeOffset } = instruction;

  if (lineNumberTable !== undefined) {
    for (let i = 0; i < lineNumberTable.line_number_table_length - 1; i++) {
      const { start_pc, line_number } = lineNumberTable.line_number_table[i];
      const end_pc = lineNumberTable.line_number_table[i + 1].start_pc;

      if (bytecodeOffset >= start_pc && bytecodeOffset <= end_pc) {
        lineNumber = line_number;
        break;
      }
    }
  }

  return lineNumber;
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
          "java/lang/",
          ''
        ) /* remove java.lang package if present */
    )
    .join(", ");

  return `${parsedDescriptor.returnType.value} ${name}(${params})`;
}

export function extractClassName(index, constant_pool) {
  return getUtf8String(constant_pool, constant_pool[index].name_index);
}

export function extractMethodInfoConstants(methodInfoOrIndex, constant_pool) {
  const methodInfo =
    typeof methodInfoOrIndex === "number"
      ? constant_pool[methodInfoOrIndex]
      : methodInfoOrIndex;
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
    throw new Error("constant_pool[index] does not represent a string.");
  }

  return utf8ByteArrayToString(poolEntry.bytes);
}

/**
 * @param {ConstantPoolInfo[]} constantPool
 * @param {Instruction[]} instructions
 * @param {number} index - Index in instructions
 */
export function getStringContext(constantPool, instructions, index) {
  // TODO: Since we only look at the next instruction,
  // this won't work with string concatenations.

  const nextInstruction = instructions[index + 1];

  if (nextInstruction.opcode === Opcode.INVOKEINTERFACE) {
    const operands = nextInstruction.operands;
    const index = (operands[0] << 8) | operands[1];
    const methodRef = constantPool[index];
    const className = extractClassName(methodRef.class_index, constantPool);
    const { name, descriptor } = extractMethodInfoConstants(
      methodRef.name_and_type_index,
      constantPool
    );

    const fullMethodDesc = `${className}#${name}${descriptor}`;

    switch (fullMethodDesc) {
      case "org/bukkit/command/CommandSender#sendMessage(Ljava/lang/String;)V":
      case "org/bukkit/entity/Player#sendMessage(Ljava/lang/String;)V":
        return "SendMessage";

      case "org/bukkit/inventory/meta/ItemMeta#setDisplayName(Ljava/lang/String;)V":
        return "ItemDisplayName";

      default:
        return undefined;
    }
  }
};